"""名著段落讲解 Router — 安妮老师风格中文解析"""
import json
import re
from typing import Optional

from agno.agent import Agent
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from utils.ai_helpers import get_ai_model
from utils.logger import logger


class TokenUsage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0


router = APIRouter(prefix="/classics", tags=["classics"])

# ==================== 提示词 ====================

PARAGRAPH_EXPLAIN_PROMPT = """你是安妮老师，名著精读讲解员，讲解以"拆词释义"为核心，帮学生真正学到英文表达。

听众是各年龄段的英语学习者，不要假设听众的年龄。称呼听众时用"大家""各位""同学们"等中性称呼，禁止使用"小朋友""小同学""宝贝"等低龄化称呼。

你的任务是为用户选中的英文名著段落录制一段讲解音频脚本。

要求：
1. 按顺序带领读者逐句理解段落，尽量覆盖每一句，只跳过信息重复或不重要的句子
2. 讲解模式：直接读出原文英文句子，然后用中文讲解。例如：
   It was the best of times, it was the worst of times. 这里用了对仗，最好的时代和最坏的时代同时存在……
   不要只用中文概述段落内容，一定要带着原文英文句子讲
3. 内容涵盖（根据实际内容取舍）：
   - 关键单词和短语（给出中文含义，可以类比记忆）
   - 地道表达和搭配（解释用法）
   - 精彩句式和修辞手法（解释表达效果，不讲语法术语）
4. 人名、地名等专有名词必须与提供的中文译文保持一致，不要自行翻译（例如译文里 Dorothy 译为"桃乐丝"，就讲成"桃乐丝"，不要讲成"多罗西"）
5. 不要做主观文学解读和感想性总结，不讲作者意图、象征意义、时代背景
6. 不要讲解语法规则（不要出现"定语从句""虚拟语气"等语法术语）
7. 根据段落长短自然决定讲解篇幅，短段落可以简短，长段落可以展开，不要强行凑字数
8. 这段脚本会直接交给 TTS 语音合成朗读，任何符号都会被读出来，因此必须：
   - 禁止使用任何引号：不要用 "" '' "" 「」等包裹英文单词或短语
   - 禁止使用括号：不要用 () （）来添加注释或补充说明
   - 禁止使用 markdown 标记：不要用 * _ # ` 等
   - 禁止使用序号：不要用 1. 2. 3. 或 ① ② ③ 等编号
   - 提到英文时直接写英文，例如"这个词 pioneer 的意思是"，而不是"这个词'pioneer'的意思是"
9. 结构上用自然的口语过渡词连接，如"接下来""然后我们看""再来说说"等
10. 不需要开场打招呼，直接从第一句原文开始讲"""

# 第一步：同时拆英文句子 + 中文讲解句子（与文章精读 SPLIT_SENTENCES_PROMPT 一致）
PARA_SPLIT_PROMPT = """你是英语教学内容分析专家。

给定一个英文段落和对应的中文讲解脚本，完成以下两个任务：
1. 将英文段落拆分为独立句子（句子拼接后必须完整还原原文，不遗漏任何文字）
2. 将中文讲解脚本拆分为独立句子（按句号、问号、感叹号、省略号分隔）

严格按 JSON 返回，无其他内容：
{
  "englishSentences": ["EN sentence 1", "EN sentence 2", ...],
  "chineseSentences": ["中文讲解句1", "中文讲解句2", ...]
}"""

# 第二步：编号映射（与文章精读 MAPPING_PROMPT 一致）
PARA_MAPPING_PROMPT = """你是英语教学内容分析专家。

## 背景
这是一段英文名著段落的讲解脚本。讲解按段落顺序逐句进行：先读出英文原句，然后用中文解释。
下面给你编好号的英文原句列表和中文讲解句列表。

## 任务
为每句中文讲解标注它正在讲解的英文原句编号。

## 规则
- mapping 数组长度 = 中文讲解句数量
- mapping[i] = 对应英文句子编号（S3 → 填 3），不对应任何原句填 0
- 非 0 编号必须递增或保持不变，不能回退

## 判断方法
1. 讲解句中有英文单词/短语 → 确认这些词属于哪个原句编号
2. 讲解句为纯中文 → 结合前后句语境判断当前在讲哪个原句
3. 过渡语、无关内容 → 填 0

## 注意：避免提前跳句
一个长原句经常被分多段讲解，先读前半段再读后半段——这些全部对应同一个原句。判断跳句时务必核实讲解中的英文是否真的来自下一个原句。

## 输出要求（分三步）
1. reasoning：逐句写出判断依据
2. check：检查是否有提前跳句错误，如有修正
3. mapping：最终映射数组

严格按 JSON 返回：
{
  "reasoning": ["C1: ...", "C2: ..."],
  "check": "...",
  "mapping": [1, 1, 2, 0, 3, ...]
}"""

# 独立拆英文句（供 split-sentences 端点使用）
SPLIT_EN_SENTENCES_PROMPT = """你是英文句子拆分专家。

将输入的英文段落拆分为独立句子。

规则：
- 所有句子拼接后必须完整还原原始段落（不遗漏任何文字）
- 按自然句边界拆分：句号、问号、感叹号（结合上下文判断，避免将缩写词误判为句末）
- 引号内对话可作为独立句
- 只输出 JSON，无其他内容

输出格式：
{"sentences": ["sentence1", "sentence2", ...]}"""


# ==================== 辅助函数 ====================

def _parse_json_from_raw(raw: str) -> dict:
    match = re.search(r'\{[\s\S]*\}', raw)
    if not match:
        raise ValueError("未找到 JSON")
    return json.loads(match.group())


def _parse_mapping_array(raw: str) -> list[int]:
    data = _parse_json_from_raw(raw)
    return [int(m) for m in data.get("mapping", []) if isinstance(m, (int, float))]


# ==================== 端点 ====================

class SplitSentencesRequest(BaseModel):
    paragraph: str


class SplitSentencesResponse(BaseModel):
    sentences: list[str]
    token_usage: Optional[TokenUsage] = None


@router.post("/split-sentences", response_model=SplitSentencesResponse)
async def split_sentences(request: SplitSentencesRequest):
    """将英文段落 AI 拆分为句子列表（供 EN TTS bookmark 合成使用）"""
    text = request.paragraph.strip()
    if not text:
        raise HTTPException(status_code=400, detail="段落内容不能为空")

    try:
        agent = Agent(model=get_ai_model(temperature=0.1), instructions=SPLIT_EN_SENTENCES_PROMPT, markdown=False)
        resp = await agent.arun(text)
        raw = (resp.content if hasattr(resp, "content") else str(resp)).strip()
        data = _parse_json_from_raw(raw)
        sentences = [str(s).strip() for s in data.get("sentences", []) if str(s).strip()]
        if not sentences:
            raise ValueError("拆分结果为空")
        metrics = getattr(resp, 'metrics', None)
        total_tokens = getattr(metrics, 'total_tokens', 0) if metrics else 0
        logger.info(f"split_sentences: {len(sentences)} 句, tokens={total_tokens}")
        return SplitSentencesResponse(sentences=sentences, token_usage=TokenUsage(total_tokens=total_tokens))
    except Exception as e:
        logger.error(f"split_sentences failed: {e}")
        raise HTTPException(status_code=500, detail="句子拆分失败")


class ParagraphExplainRequest(BaseModel):
    paragraph: str
    book_title: Optional[str] = None
    chapter_title: Optional[str] = None
    translation_zh: Optional[str] = None
    prev_paragraph: Optional[str] = None
    next_paragraph: Optional[str] = None


class ParagraphExplainResponse(BaseModel):
    explanation: str
    english_sentences: list[str] = []
    chinese_sentences: list[str] = []
    mapping: list[int] = []
    token_usage: Optional[TokenUsage] = None


@router.post("/paragraph-explain", response_model=ParagraphExplainResponse)
async def paragraph_explain(request: ParagraphExplainRequest):
    """安妮老师讲解英文名著段落（两步法映射，与文章精读一致）"""
    text = request.paragraph.strip()
    if not text:
        raise HTTPException(status_code=400, detail="段落内容不能为空")

    try:
        # ── AI 1：生成讲解脚本 ──────────────────────────────────────────
        agent1 = Agent(model=get_ai_model(temperature=0.4), instructions=PARAGRAPH_EXPLAIN_PROMPT, markdown=False)
        meta_parts = []
        if request.book_title:
            meta_parts.append(f"书名：{request.book_title}")
        if request.chapter_title:
            meta_parts.append(f"章节：{request.chapter_title}")
        input_parts = []
        if meta_parts:
            input_parts.append("，".join(meta_parts))
        input_parts.append(f"需要讲解的段落：\n{text}")
        if request.translation_zh:
            input_parts.append(f"本段中文译文（讲解时专有名词须与此一致）：\n{request.translation_zh}")

        resp1 = await agent1.arun("\n\n".join(input_parts))
        explanation = (resp1.content if hasattr(resp1, "content") else str(resp1)).strip()
        if not explanation:
            raise ValueError("AI 1 返回空内容")

        metrics1 = getattr(resp1, 'metrics', None)
        total_tokens = getattr(metrics1, 'total_tokens', 0) if metrics1 else 0
        logger.info(f"paragraph_explain AI1: chars={len(explanation)}, tokens={total_tokens}")

        # ── AI 2：同时拆英文句子 + 中文讲解句子 ────────────────────────
        english_sentences: list[str] = []
        chinese_sentences: list[str] = []
        mapping: list[int] = []

        try:
            agent2 = Agent(model=get_ai_model(temperature=0.1), instructions=PARA_SPLIT_PROMPT, markdown=False)
            split_input = f"英文段落：\n{text}\n\n中文讲解：\n{explanation}"
            resp2 = await agent2.arun(split_input)
            raw2 = (resp2.content if hasattr(resp2, "content") else str(resp2)).strip()
            data2 = _parse_json_from_raw(raw2)
            english_sentences = [str(s).strip() for s in data2.get("englishSentences", []) if str(s).strip()]
            chinese_sentences = [str(s).strip() for s in data2.get("chineseSentences", []) if str(s).strip()]

            metrics2 = getattr(resp2, 'metrics', None)
            total_tokens += getattr(metrics2, 'total_tokens', 0) if metrics2 else 0
            logger.info(f"paragraph_explain AI2: en={len(english_sentences)} 句, cn={len(chinese_sentences)} 句")
        except Exception as e2:
            logger.warning(f"paragraph_explain AI2 (split) failed: {e2}")

        # ── AI 3：编号映射（与文章精读 MAPPING_PROMPT 一致）────────────
        if english_sentences and chinese_sentences:
            try:
                agent3 = Agent(model=get_ai_model(temperature=0.1), instructions=PARA_MAPPING_PROMPT, markdown=False)
                numbered_en = "\n".join([f"S{i+1}: {s}" for i, s in enumerate(english_sentences)])
                numbered_cn = "\n".join([f"C{i+1}: {s}" for i, s in enumerate(chinese_sentences)])
                mapping_input = f"英文原句：\n{numbered_en}\n\n中文讲解句：\n{numbered_cn}"
                resp3 = await agent3.arun(mapping_input)
                raw3 = (resp3.content if hasattr(resp3, "content") else str(resp3)).strip()
                mapping = _parse_mapping_array(raw3)

                metrics3 = getattr(resp3, 'metrics', None)
                total_tokens += getattr(metrics3, 'total_tokens', 0) if metrics3 else 0
                logger.info(f"paragraph_explain AI3: mapping={mapping}, total_tokens={total_tokens}")
            except Exception as e3:
                logger.warning(f"paragraph_explain AI3 (mapping) failed: {e3}")

        token_usage = TokenUsage(total_tokens=total_tokens)
        return ParagraphExplainResponse(
            explanation=explanation,
            english_sentences=english_sentences,
            chinese_sentences=chinese_sentences,
            mapping=mapping,
            token_usage=token_usage,
        )
    except Exception as e:
        logger.error(f"paragraph_explain failed: {e}")
        raise HTTPException(status_code=500, detail="段落讲解生成失败")


# ==================== 逐句翻译对齐 ====================

ALIGN_TRANSLATIONS_PROMPT = """你是英中翻译对齐专家。

给定一组已拆分的英文句子和对应段落的中文翻译，将中文翻译拆分为与英文句子一一对应的逐句翻译。

规则：
- 输出数组长度必须与英文句子数量完全相等
- 每条中文翻译对应且仅对应一条英文句子
- 中文翻译应取自给定的段落翻译，保持原有译法和专有名词用法
- 如果段落翻译中某些句子被合并翻译，需拆开分配到对应的英文句子
- 如果段落翻译中缺少某句的翻译，根据英文原句补充翻译
- 只输出 JSON，无其他内容

输出格式：
{"translations": ["中文翻译1", "中文翻译2", ...]}"""


class AlignTranslationsRequest(BaseModel):
    english_sentences: list[str]
    translation_zh: str


class AlignTranslationsResponse(BaseModel):
    sentence_translations: list[str]
    token_usage: Optional[TokenUsage] = None


@router.post("/align-translations", response_model=AlignTranslationsResponse)
async def align_translations(request: AlignTranslationsRequest):
    """将段落级中文翻译按英文句子拆分对齐"""
    if not request.english_sentences or not request.translation_zh.strip():
        raise HTTPException(status_code=400, detail="英文句子和中文翻译不能为空")

    try:
        agent = Agent(model=get_ai_model(temperature=0.1), instructions=ALIGN_TRANSLATIONS_PROMPT, markdown=False)
        numbered_en = "\n".join([f"{i+1}. {s}" for i, s in enumerate(request.english_sentences)])
        input_text = f"英文句子（共{len(request.english_sentences)}句）：\n{numbered_en}\n\n段落中文翻译：\n{request.translation_zh.strip()}"

        resp = await agent.arun(input_text)
        raw = (resp.content if hasattr(resp, "content") else str(resp)).strip()
        data = _parse_json_from_raw(raw)
        translations = [str(s).strip() for s in data.get("translations", [])]

        if len(translations) != len(request.english_sentences):
            logger.warning(f"align_translations 数量不匹配: expected={len(request.english_sentences)}, got={len(translations)}")
            if len(translations) > len(request.english_sentences):
                translations = translations[:len(request.english_sentences)]
            else:
                translations.extend([""] * (len(request.english_sentences) - len(translations)))

        metrics = getattr(resp, 'metrics', None)
        total_tokens = getattr(metrics, 'total_tokens', 0) if metrics else 0
        logger.info(f"align_translations: {len(translations)} 句, tokens={total_tokens}")
        return AlignTranslationsResponse(sentence_translations=translations, token_usage=TokenUsage(total_tokens=total_tokens))
    except Exception as e:
        logger.error(f"align_translations failed: {e}")
        raise HTTPException(status_code=500, detail="翻译对齐失败")
