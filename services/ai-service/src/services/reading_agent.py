"""AI 精读内容处理 Agent — 多步骤管道 + 多教师角色"""
import asyncio
import json
import os
from typing import Dict, Any, List

from agno.agent import Agent

from utils.ai_helpers import get_ai_model, parse_json_response
from utils.logger import log_info, log_error


# ==================== AI 教师角色（从共享配置加载） ====================

def _load_teachers() -> tuple:
    """从 packages/shared/characters.json 加载精读教师配置"""
    json_path = os.path.join(
        os.path.dirname(__file__), '..', '..', '..', '..', 'packages', 'shared', 'characters.json'
    )
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    teachers = {}
    order = []
    for c in data['characters']:
        if 'reading_teacher' in c.get('roles', []):
            teachers[c['id']] = {
                "id": c['id'],
                "nameZh": c['name'],
                "role": c.get('teacherRole', ''),
                "style": c.get('teacherStyle', ''),
                "voiceId": c['id'],  # 角色 ID = 声音 ID
            }
            order.append(c['id'])
    return teachers, order

TEACHERS, TEACHER_ORDER = _load_teachers()


def get_teacher_for_article(article_index: int) -> Dict[str, Any]:
    """根据文章索引分配教师（轮换策略）"""
    teacher_id = TEACHER_ORDER[article_index % len(TEACHER_ORDER)]
    return TEACHERS[teacher_id]


# ==================== 质量筛选标准（两个 Prompt 共用） ====================

_QUALITY_CRITERIA = """判定为【不合格】的情况：
1. 不是完整独立文章：仅含链接和摘要的聚合页面、纯目录索引、广告软文
2. 敏感主题：战争/军事冲突、党派政治攻击、宗教极端/对立、暴力血腥细节、色情内容
3. 消极内容：恐怖/惊悚类（含恐怖片推荐）、自杀/自残、药物滥用/成瘾、抑郁绝望等负面情绪为主的内容
4. 质量问题：内容结构混乱、大量网页残留噪音、可读性差
5. 不适合英语学习：话题过于专业小众（如芯片制程细节、法律条文解读）、内容枯燥乏味缺乏趣味、通篇专有名词堆砌难以用于教学
6. 实操指令类：菜谱步骤、手工教程、软件操作指南等以操作步骤为主的文章（美食文化介绍可以，但纯菜谱不行）

适合英语学习的好文章特征（满足其中几点即为合格）：
- 话题有趣或有知识性：科学发现、文化趣闻、生活方式、自然动物、历史故事、美食文化等
- 词汇和表达有学习价值：包含地道短语、实用搭配、好句子
- 内容有可讨论性：能引发思考或延伸话题

以下情况仍然【合格】：
- 列表形式的知识文章（如"10个有趣的科学发现"），只要每个条目有实质性内容
- 涉及社会议题、科学政策、健康医疗的文章，只要立场客观中立
- 涉及历史事件（包括历史战争）的科普/文化类文章"""


# ==================== Prompt 模板 ====================

# 质量筛选 + 难度评级
QUALITY_CHECK_PROMPT = f"""你是一位英语阅读教学编辑。请判断给定的英文文章是否适合作为英语学习者的精读材料，并评估难度等级。
{_QUALITY_CRITERIA}

如果合格，请评估：

1. 难度等级（level）：
- beginner：词汇简单（高中水平），句式基础，话题日常生活化
- intermediate：四六级核心词汇，有从句和复合句，话题有一定深度
- advanced：考研/GRE/TOEFL 词汇，长难句多，话题专业或抽象

2. 内容分类（category），根据文章实际内容选择最匹配的一个：
- science：科学科技、自然、太空、生物、物理、环境、AI、工程
- culture：文化、艺术、历史、文学、设计
- travel：旅行、地理、异国风情
- food：美食、烹饪、饮食文化
- health：健康、医学、心理、运动
- education：教育、学习方法、语言
- general：时事、社会、生活方式、不属于以上分类的

严格按 JSON 返回（不要返回任何其他内容）：
- 合格：{{"qualified": true, "level": "beginner/intermediate/advanced", "category": "分类"}}
- 不合格：{{"qualified": false, "rejectReason": "简要原因"}}"""


# 改写精炼（长文章 > 350 词，已通过质量筛选）
REWRITE_PROMPT = """你是一位英语阅读教学编辑。请基于原文改写一篇适合英语学习者精读的 250-350 词英文短文。

### 硬性要求
- 总词数必须在 250-350 词之间，这是不可违反的硬限制
- 输出的是英文短文，不是翻译

### 改写原则
- 保留原文的核心故事线和关键信息，确保改写后的短文连贯完整、逻辑通顺
- 尽量保留原文中地道的表达、好词好句、有学习价值的搭配和句型
- 可以调整段落结构、添加过渡句、合并或拆分段落，使短文流畅自然
- 删除冗余论述、重复观点、过长的背景铺垫
- 列表型文章（如"10个XX"）：只保留 2-3 个最精彩的条目
- 语言难度保持与原文一致，不要刻意简化或复杂化

### 自查
返回前请估算总词数，如果明显超过 350 词就继续精简。

严格按 JSON 返回（不要返回任何其他内容）：
{"paragraphs": ["改写后的段落1", "改写后的段落2", ...]}"""


# Step 2a: 段落拆分
SPLIT_PARAGRAPHS_PROMPT = """你是一位英语阅读教学专家。请将给定的英文文章拆分为段落。

规则：
- 按原文的自然段落拆分
- 每个段落保持原文不变，不要修改任何内容
- 段落顺序与原文一致

严格按 JSON 返回（不要返回其他内容）：
{"paragraphs": ["段落1原文", "段落2原文", ...]}"""

# Step 2b: 逐段翻译
TRANSLATE_PROMPT = """你是一位专业英汉翻译专家。请对给定的英文段落进行逐段翻译。

要求：
1. titleZh：文章标题的中文翻译
2. summary：一句话英文摘要（20-30词）
3. summaryZh：一句话中文摘要
4. translations：按段落顺序，每项为对应段落的中文翻译（自然流畅，专有名词保留英文加注中文）

注意：translations 数组的长度必须与输入段落数量完全一致，每段必须有对应翻译，不可合并或遗漏。

严格按 JSON 返回（不要返回其他内容）：
{"titleZh": "...", "summary": "...", "summaryZh": "...", "translations": ["中文翻译1", "中文翻译2", ...]}"""


# Step 3: 生词提取
VOCABULARY_PROMPT = """你是一位英语词汇教学专家。请从给定的英文文章中提取核心生词。

要求：
1. 提取 8-15 个核心生词
2. 根据难度级别筛选：
   - beginner：常用词但对初学者有难度的词
   - intermediate：四六级核心词汇
   - advanced：考研/GRE/TOEFL 词汇
3. 每个词包含：
   - word：单词原形
   - phonetic：音标
   - pos：词性（n./v./adj./adv.等）
   - meaningCn：中文释义
   - contextSentence：文中包含该词的原句
   - paragraphIndex：该词所在段落序号

严格按 JSON 返回（不要返回其他内容）：
{"keyVocabulary": [{"word": "...", "phonetic": "...", "pos": "...", "meaningCn": "...", "contextSentence": "...", "paragraphIndex": 0}]}"""


# Step 4: 整篇讲解
def _build_explanation_prompt(teacher: Dict[str, Any]) -> str:
    return f"""你是{teacher['nameZh']}老师（{teacher['role']}），{teacher['style']}

听众是各年龄段的英语学习者，不要假设听众的年龄。称呼听众时用"大家""各位""同学们"等中性称呼，禁止使用"小朋友""小同学""宝贝"等低龄化称呼。

请为以下英文文章录制一段讲解音频脚本。

## 要求
1. 时长：4-5分钟（约 1200-1500 字）
2. 从文章标题开始，按顺序带领读者理解文章
3. 尽量覆盖原文大部分句子，只跳过信息重复或不重要的句子
4. 讲解模式：直接读出原文英文句子，然后用中文讲解。例如：
   "A small but growing number of companies are pioneering biological computers. 这里 pioneering 是开创的意思，就像探险家开辟新大陆一样……"
   不要只用中文概述文章内容，一定要带着原文英文句子讲
5. 内容涵盖：
   - 关键单词（给出中文含义和记忆方法）
   - 地道表达和搭配（解释用法，举一反三）
   - 精彩句式（解释表达效果，不讲语法术语）
   - 有趣的知识点或文化背景
6. 不要讲解语法规则（不要出现"定语从句""虚拟语气"等语法术语）
7. 用{teacher['nameZh']}老师的风格，生动有趣，有个人特色
8. 这段脚本会直接交给 TTS 语音合成朗读，任何符号都会被读出来，因此必须：
   - 禁止使用任何引号：不要用 "" '' "" 「」等包裹英文单词或短语
   - 禁止使用括号：不要用 () （）来添加注释或补充说明
   - 禁止使用 markdown 标记：不要用 * _ # ` 等
   - 禁止使用序号：不要用 1. 2. 3. 或 ① ② ③ 等编号
   - 提到英文时直接写英文，例如"这个词 amazing 的意思是"，而不是"这个词'amazing'的意思是"
9. 开头自然地打招呼并自称{teacher['nameZh']}老师，每次用不同的方式，不要千篇一律
10. 结构上用自然的口语过渡词连接，如"接下来""然后我们看""再来说说"等

严格按 JSON 返回：
{{"explanationScript": "讲解脚本文本..."}}"""


# Step 5: 练习题
QUIZ_PROMPT = """你是一位英语阅读理解出题专家。请根据给定的英文文章和中文翻译，生成高质量的阅读理解练习题。

要求：
1. 生成 5 道四选一阅读理解题
2. 类型分布：detail(2) + main_idea(1) + inference(1) + vocabulary(1)
3. 每道题包含：
   - id：题目编号（q1-q5）
   - type：题型（detail/main_idea/inference/vocabulary）
   - question：英文题目
   - questionZh：中文题目
   - options：4 个选项（英文），要有干扰性
   - answer：正确选项全文（必须是 options 中的一个）
   - explanation：中文解析，简洁指出答案依据

严格按 JSON 返回（不要返回其他内容）：
{"quiz": [{"id": "q1", "type": "detail", "question": "...", "questionZh": "...", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "..."}]}"""


# ==================== 内部工具 ====================

def _parse_ai_response(raw: str, title: str) -> Dict[str, Any]:
    """解析 AI JSON 响应，失败时提供详细上下文"""
    result = parse_json_response(raw)
    if result:
        return result
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError as e:
        log_error(f"JSON 解析失败 [{title}]: {e}\n原始响应前 500 字符: {raw[:500]}")
        raise ValueError(f"文章 '{title}' 的 AI 响应无法解析为 JSON") from e


async def _call_ai(prompt: str, user_message: str, temperature: float = 0.3) -> str:
    """通用 AI 调用封装"""
    agent = Agent(
        model=get_ai_model(temperature=temperature),
        instructions=prompt,
        markdown=False,
    )
    response = await agent.arun(user_message, stream=False)
    return response.content if hasattr(response, 'content') else str(response)


# ==================== 质量筛选 + 改写精炼 ====================

async def compress_article(title: str, content: str, skip_quality_check: bool = False) -> Dict[str, Any]:
    """质量筛选 + 改写精炼。返回 {qualified, compressed?, rejectReason?, level?, category?}"""
    word_count = len(content.split())

    level = None
    category = None

    if not skip_quality_check:
        log_info(f"开始质量筛选 ({word_count} 词): {title}")
        quality_result = await _quality_check(title, content)
        if not quality_result["qualified"]:
            return quality_result
        level = quality_result.get("level", "intermediate")
        category = quality_result.get("category")
    else:
        log_info(f"跳过质量筛选，直接改写 ({word_count} 词): {title}")

    # 短文章直接用，长文章改写精炼
    if word_count <= 350:
        log_info(f"文章无需改写 ({word_count} 词): {title}")
        result = {"qualified": True, "compressed": content}
        if level:
            result["level"] = level
        if category:
            result["category"] = category
        return result

    result = await _rewrite_article(title, content, word_count)
    if level:
        result["level"] = level
    if category:
        result["category"] = category
    return result


async def _quality_check(title: str, content: str) -> Dict[str, Any]:
    """质量筛选：判断文章是否适合英语学习"""
    raw = await _call_ai(QUALITY_CHECK_PROMPT, f"""请判断以下文章是否适合作为英语学习材料：

文章标题：{title}

文章正文：
{content}""", temperature=0.2)

    result = _parse_ai_response(raw, title)

    if not result.get("qualified", True):
        reason = result.get("rejectReason", "AI 判定不合格")
        log_info(f"文章不合格: {title} - {reason}")
        return {"qualified": False, "rejectReason": reason}

    level = result.get("level", "intermediate")
    category = result.get("category", "general")
    log_info(f"质量筛选通过: {title}, 难度={level}, 分类={category}")
    return {"qualified": True, "level": level, "category": category}


async def _rewrite_article(title: str, content: str, word_count: int) -> Dict[str, Any]:
    """改写精炼：将长文章改写为 250-350 词的连贯短文"""
    log_info(f"开始改写精炼: {title}, {word_count} 词 → 目标 250-350 词")

    raw = await _call_ai(REWRITE_PROMPT, f"""请将以下文章改写精炼为 250-350 词的英文短文。

文章标题：{title}
原文词数：约 {word_count} 词

文章正文：
{content}""", temperature=0.4)

    result = _parse_ai_response(raw, f"{title}/rewrite")

    paragraphs = result.get("paragraphs", [])
    if not paragraphs:
        raise ValueError(f"文章 '{title}' 改写结果缺少 paragraphs")

    compressed = "\n\n".join(paragraphs)
    compressed_wc = len(compressed.split())

    if compressed_wc < 200 or compressed_wc > 350:
        log_info(f"[WARN] 改写词数偏离目标: {title}, {word_count} -> {compressed_wc} 词 (目标 250-350)")
    else:
        log_info(f"改写完成: {title}, {word_count} -> {compressed_wc} 词")

    return {"qualified": True, "compressed": compressed}


# ==================== 文章清洗 ====================

CLEAN_ARTICLE_PROMPT = """你是一位英语阅读教学编辑。请清洗以下英文文章，去除与正文内容无关的信息，只保留纯粹的文章正文。

需要去除的内容类型：
1. 图片来源/版权标注：如 "Photo by...", "Image credit:", "Getty Images", "Shutterstock", "(Photo: ...)" 等
2. 作者信息：如 "By John Smith", "Written by...", "Author:", 文末的作者简介段落
3. 编辑注释：如 "Editor's note:", "This article was originally published...", "Updated on..."
4. 社交媒体/订阅提示：如 "Follow us on Twitter", "Subscribe to our newsletter", "Share this article"
5. 广告/推广内容：如 "Sponsored by...", "Related articles:", 推荐阅读链接
6. 版权声明：如 "© 2024 ...", "All rights reserved", "Reprinted with permission"
7. 网站导航残留：如 breadcrumb、标签列表、分类标记
8. 来源标注：如 "Source: Reuters", "Via: BBC", "(AP)" 等新闻来源标记
9. 数据来源说明：如 "Data from...", "According to a report by..." 这种纯来源说明段落（非正文引用）

保留原则：
- 保持原文段落结构和顺序不变
- 保留正文中自然引用的人名和来源（如 "Dr. Smith said..." 属于正文内容，保留）
- 不要修改、改写或润色任何正文内容
- 如果某段落混合了正文和需删除的内容，只删除无关部分，保留正文部分

严格按 JSON 返回（不要返回任何其他内容）：
{"cleanedContent": "清洗后的文章正文（段落间用两个换行符分隔）"}"""


async def clean_article(title: str, content: str) -> Dict[str, Any]:
    """清洗文章内容，去除图片标注、作者信息等无关内容"""
    log_info(f"开始文章清洗: {title}")

    raw = await _call_ai(CLEAN_ARTICLE_PROMPT, f"""请清洗以下文章，去除与正文无关的信息：

文章标题：{title}

文章正文：
{content}""", temperature=0.1)

    result = _parse_ai_response(raw, f"{title}/clean")
    cleaned = result.get("cleanedContent", "")

    if not cleaned:
        log_info(f"文章清洗返回为空，使用原文: {title}")
        return {"cleanedContent": content, "changed": False}

    original_wc = len(content.split())
    cleaned_wc = len(cleaned.split())
    changed = abs(original_wc - cleaned_wc) > 5

    if changed:
        log_info(f"文章清洗完成: {title}, {original_wc} → {cleaned_wc} 词")
    else:
        log_info(f"文章清洗完成（无明显变化）: {title}")

    return {"cleanedContent": cleaned, "changed": changed}


# ==================== 多步骤精读管道（v2） ====================

async def _step_translate_paragraphs(title: str, content: str, level: str) -> Dict[str, Any]:
    """Step 2: 段落拆分（AI）+ 逐段翻译（AI），两步分离避免幻觉"""

    # ---- Step 2a: AI 拆分段落 ----
    log_info(f"[Step 2a] 段落拆分: {title}")
    split_raw = await _call_ai(
        SPLIT_PARAGRAPHS_PROMPT,
        f"文章正文：\n{content}",
        temperature=0.1,
    )
    split_result = _parse_ai_response(split_raw, f"{title}/split")
    en_paragraphs = split_result.get("paragraphs", [])
    if not en_paragraphs:
        raise ValueError("段落拆分结果为空")
    log_info(f"[Step 2a] 拆分完成: {title}, {len(en_paragraphs)} 段")

    # ---- Step 2b: AI 逐段翻译 ----
    log_info(f"[Step 2b] 逐段翻译: {title}")
    numbered_paragraphs = "\n\n".join(
        f"[P{i}] {p}" for i, p in enumerate(en_paragraphs)
    )
    translate_raw = await _call_ai(
        TRANSLATE_PROMPT,
        f"文章标题：{title}\n\n{numbered_paragraphs}",
        temperature=0.2,
    )
    translate_result = _parse_ai_response(translate_raw, f"{title}/translate")
    translations = translate_result.get("translations", [])

    # 翻译数量不匹配时补齐或截断
    if len(translations) != len(en_paragraphs):
        log_info(f"[Step 2b] 翻译数量不匹配: 段落={len(en_paragraphs)}, 翻译={len(translations)}")
        if len(translations) > len(en_paragraphs):
            translations = translations[:len(en_paragraphs)]
        else:
            translations.extend([""] * (len(en_paragraphs) - len(translations)))

    # ---- 组装 paragraphs ----
    paragraphs = [
        {"index": i, "en": en_paragraphs[i], "zh": translations[i]}
        for i in range(len(en_paragraphs))
    ]

    log_info(f"[Step 2] 翻译完成: {title}, {len(paragraphs)} 段")
    return {
        "titleZh": translate_result.get("titleZh", ""),
        "summary": translate_result.get("summary", ""),
        "summaryZh": translate_result.get("summaryZh", ""),
        "paragraphs": paragraphs,
    }


async def _step_extract_vocabulary(title: str, content: str, level: str) -> Dict[str, Any]:
    """Step 3: 生词提取"""
    log_info(f"[Step 3] 生词提取: {title}")

    user_message = f"""请从以下英文文章中提取核心生词：

文章标题：{title}
难度级别：{level}

文章正文：
{content}"""

    raw = await _call_ai(VOCABULARY_PROMPT, user_message, temperature=0.2)
    result = _parse_ai_response(raw, f"{title}/vocabulary")

    vocab = result.get("keyVocabulary", [])
    if not vocab or len(vocab) == 0:
        raise ValueError("生词提取结果为空")

    log_info(f"[Step 3] 生词提取完成: {title}, {len(vocab)} 个")
    return result


async def _step_generate_explanation(
    title: str, content: str, level: str, teacher: Dict[str, Any]
) -> Dict[str, Any]:
    """Step 4: 生成整篇文章讲解脚本"""
    log_info(f"[Step 4] 整篇讲解: {title}, 教师={teacher['nameZh']}")

    prompt = _build_explanation_prompt(teacher)
    user_message = f"""请为以下文章录制讲解音频脚本：

文章标题：{title}
难度级别：{level}

文章正文：
{content}"""

    raw = await _call_ai(prompt, user_message, temperature=0.5)
    result = _parse_ai_response(raw, f"{title}/explanation")

    if not result.get("explanationScript"):
        raise ValueError("整篇讲解缺少 explanationScript")

    log_info(f"[Step 4] 讲解完成: {title}, {len(result['explanationScript'])}字")
    return result


async def _step_generate_quiz(
    title: str, content: str, paragraphs: List[Dict[str, Any]], level: str
) -> Dict[str, Any]:
    """Step 5: 生成练习题"""
    log_info(f"[Step 5] 生成练习题: {title}")

    # 构建含翻译的上下文
    para_context = "\n\n".join(
        f"[段落 {p['index']+1}]\n英文：{p['en']}\n中文：{p['zh']}"
        for p in paragraphs
    )

    user_message = f"""请根据以下文章生成阅读理解练习题：

文章标题：{title}
难度级别：{level}

文章内容（含翻译）：
{para_context}"""

    raw = await _call_ai(QUIZ_PROMPT, user_message, temperature=0.3)
    result = _parse_ai_response(raw, f"{title}/quiz")

    quiz = result.get("quiz", [])
    if not quiz or len(quiz) < 3:
        raise ValueError(f"练习题数量不足: {len(quiz)}")

    # 校验 answer 必须在 options 中，否则抛错触发重试
    invalid = [q.get("id") for q in quiz if q.get("answer") not in q.get("options", [])]
    if invalid:
        raise ValueError(f"练习题答案不在选项中: {invalid}，需要重新生成")

    log_info(f"[Step 5] 练习题完成: {title}, {len(quiz)} 题")
    return result


async def process_article(
    title: str,
    content: str,
    level: str = "intermediate",
    article_index: int = 0,
    max_retries: int = 2,
) -> Dict[str, Any]:
    """多步骤精读处理一篇文章（v2 管道）"""
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            teacher = get_teacher_for_article(article_index)
            log_info(
                f"精读处理开始 (v2): {title}, level={level}, "
                f"teacher={teacher['nameZh']}, {len(content.split())} 词, "
                f"第{attempt + 1}次尝试"
            )

            # ---- 并行组 A: translate + vocabulary + explanation（全部独立） ----
            translate_result, vocab_result, explanation_result = await asyncio.gather(
                _step_translate_paragraphs(title, content, level),
                _step_extract_vocabulary(title, content, level),
                _step_generate_explanation(title, content, level, teacher),
            )

            paragraphs = translate_result["paragraphs"]

            # ---- 并行组 B: quiz（依赖翻译结果） ----
            quiz_result = await _step_generate_quiz(title, content, paragraphs, level)

            # ---- 组装结果 ----
            result = {
                "titleZh": translate_result.get("titleZh", ""),
                "summary": translate_result.get("summary", ""),
                "summaryZh": translate_result.get("summaryZh", ""),
                "paragraphs": paragraphs,
                "keyVocabulary": vocab_result.get("keyVocabulary", []),
                "quiz": quiz_result.get("quiz", []),
                "explanationScript": explanation_result.get("explanationScript", ""),
                "teacherId": teacher["id"],
                "teacherVoiceId": teacher["voiceId"],
                "pipelineVersion": 2,
            }

            log_info(
                f"精读处理完成 (v2): {title}, "
                f"paragraphs={len(result['paragraphs'])}, "
                f"vocab={len(result['keyVocabulary'])}, "
                f"quiz={len(result['quiz'])}, "
                f"teacher={teacher['nameZh']}"
            )

            return result

        except Exception as e:
            last_error = e
            if attempt < max_retries:
                log_info(f"精读处理第{attempt + 1}次尝试失败，重试: {title} - {e}")
            else:
                log_error(f"精读处理失败（共{max_retries + 1}次尝试）: {title} - {e}", e)

    raise last_error


# ==================== 讲解映射分析（两步法） ====================

# 第一步：拆句（英文 + 中文）
SPLIT_SENTENCES_PROMPT = """你是一位英语教学分析专家。请完成以下两个任务：

1. 将每个英文段落拆分为独立的句子（englishSentences）
2. 将中文讲解脚本拆分为独立的句子（chineseSentences）

规则：
- englishSentences 中每个段落的句子拼接后必须完整还原原文段落（不要遗漏任何文字）
- 中文讲解按自然句拆分（句号、问号、感叹号、省略号为分隔）

严格按 JSON 返回：
{
  "englishSentences": [["P0 first sentence.", "P0 second sentence."], ["P1 first sentence."]],
  "chineseSentences": ["中文讲解句1", "中文讲解句2", ...]
}"""

# 第二步：映射（带编号的英文句子 + 讲解句子 → 序号数组）
MAPPING_PROMPT = """你是一位英语教学分析专家。

## 背景
这是一段英语精读讲解音频脚本。老师按文章顺序逐句讲解：读出英文原句（有时只读一部分），然后用中文解释词汇和意思。下面给你编好号的英文原句列表和讲解句列表。

## 任务
为每句讲解标注它正在讲解的英文原句编号。

## 规则
- mapping 数组长度 = 讲解句数量
- mapping[i] = 对应的英文原句编号（S3 → 填 3），不对应任何原句填 0
- 非 0 编号必须递增或保持不变，不能回退

## 判断方法
按以下优先级判断每句讲解对应哪个原句：
1. 讲解句中有英文单词/短语 → 确认这些词属于哪个原句，即为该句的编号
2. 讲解句为纯中文 → 结合前一句和后一句的上下文语境，判断当前在讲哪个原句
3. 开场白、过渡语、结束语等与原文无关的内容 → 填 0

## 注意：避免提前跳句
一个长原句经常被分成多段讲解。老师可能先读前半段解释几个词，再读后半段解释几个词——这些全部对应同一个原句。判断是否跳到下一句时，务必核实讲解中的英文内容是否真的来自下一个原句，而不是当前原句的后半段。

## 输出要求
分三步输出：
1. reasoning：逐句写出判断依据（讲解句中的关键英文词属于哪个原句，或根据上下文推断）
2. check：回顾 reasoning，检查是否有提前跳句的错误（特别是长原句被分段讲解的情况），如有则修正
3. mapping：最终的映射数组

## 示例
英文原句：
S1: Germont sought advice on a perplexing case: a letter had been stolen from a lady of high station.
S2: The letter's contents could ruin her husband.

讲解句：
C1: 大家好，今天来读一篇侦探故事。
C2: Germont sought advice on a perplexing case.
C3: perplexing 就是令人困惑的。
C4: a letter had been stolen from a lady of high station.
C5: high station 指社会地位高。
C6: 一封信从一位地位很高的女士那里被偷走了。
C7: The letter's contents could ruin her husband.
C8: ruin 是毁灭的意思。

输出：
{
  "reasoning": [
    "C1: 无英文原句内容 → 0",
    "C2: Germont/sought/perplexing 属于S1 → 1",
    "C3: perplexing 属于S1 → 1",
    "C4: a letter/stolen/high station 是S1的后半段 → 1",
    "C5: high station 属于S1 → 1",
    "C6: 纯中文，前句C5讲S1，后句C7讲S2，内容是翻译偷信的事 → 仍是S1 → 1",
    "C7: contents/ruin 属于S2 → 2",
    "C8: ruin 属于S2 → 2"
  ],
  "check": "C4的 a letter had been stolen 是S1的后半段而非S2，确认无提前跳句",
  "mapping": [0, 1, 1, 1, 1, 1, 2, 2]
}"""


async def analyze_explanation_mapping(
    explanation_script: str,
    paragraphs: list[dict],
    title: str = "",
) -> dict:
    """分析讲解脚本与原文句子的对应关系（两步法：拆句 → 映射）"""
    if not explanation_script:
        log_info("讲解映射分析: 无讲解脚本")
        return {"englishSentences": [], "chineseSentences": [], "mapping": []}

    # ---- 第一步：AI 拆句 ----
    paragraph_lines = [f"[P{i}] {p.get('en', '')}" for i, p in enumerate(paragraphs)]

    split_message = f"""讲解脚本：
{explanation_script}

原文段落（共{len(paragraphs)}段）：
{chr(10).join(paragraph_lines)}"""

    raw1 = await _call_ai(SPLIT_SENTENCES_PROMPT, split_message, temperature=0.1)
    split_result = _parse_ai_response(raw1, "explanation_split")

    english_sentences = split_result.get("englishSentences", [])
    chinese_sentences = split_result.get("chineseSentences", [])

    if not english_sentences or not chinese_sentences:
        raise ValueError("拆句结果为空")

    log_info(f"拆句完成: {sum(len(s) for s in english_sentences)} 句英文, {len(chinese_sentences)} 句中文")

    # ---- 构建编号列表：S1, S2, S3...（全局顺序编号） ----
    # sentence_index_map: 全局序号 → (段落索引, 英文原句)
    # paragraphIndex = -2 表示标题
    sentence_index_map: dict[int, tuple[int, str]] = {}
    numbered_lines = []
    global_idx = 1

    # 标题作为 S1（paragraphIndex = -2 表示标题）
    if title:
        sentence_index_map[global_idx] = (-2, title)
        numbered_lines.append(f"S{global_idx}: {title}")
        global_idx += 1

    for pi, para_sents in enumerate(english_sentences):
        for sent in para_sents:
            sentence_index_map[global_idx] = (pi, sent)
            numbered_lines.append(f"S{global_idx}: {sent}")
            global_idx += 1

    # 中文句子也带编号（方便 AI 对齐）
    numbered_chinese = [f"C{i+1}: {ch}" for i, ch in enumerate(chinese_sentences)]

    # ---- 第二步：AI 映射 ----
    mapping_message = f"""英文原句（共{global_idx - 1}句）：
{chr(10).join(numbered_lines)}

讲解句（共{len(chinese_sentences)}句）：
{chr(10).join(numbered_chinese)}"""

    raw2 = await _call_ai(MAPPING_PROMPT, mapping_message, temperature=0.1)
    mapping_result = _parse_ai_response(raw2, "explanation_mapping")

    mapping_indices = mapping_result.get("mapping", [])

    # 校验 mapping 长度
    if len(mapping_indices) != len(chinese_sentences):
        log_info(f"讲解映射长度微调: 中文={len(chinese_sentences)}, 映射={len(mapping_indices)}")
        if len(mapping_indices) > len(chinese_sentences):
            mapping_indices = mapping_indices[:len(chinese_sentences)]
        else:
            mapping_indices.extend([0] * (len(chinese_sentences) - len(mapping_indices)))

    # ---- 通过全局序号还原 englishSentence + paragraphIndex ----
    explanation_mapping = []
    for i, idx in enumerate(mapping_indices):
        ch = chinese_sentences[i] if i < len(chinese_sentences) else ""
        en_text = ""
        para_idx = -1

        # 兼容 AI 返回整数或字符串
        try:
            num = int(idx) if idx else 0
        except (ValueError, TypeError):
            num = 0

        if num > 0 and num in sentence_index_map:
            para_idx, en_text = sentence_index_map[num]

        explanation_mapping.append({
            "chineseSentence": ch,
            "englishSentence": en_text,
            "paragraphIndex": para_idx,
        })

    log_info(f"讲解映射分析完成: {len(explanation_mapping)} 句讲解, {sum(len(s) for s in english_sentences)} 句英文")
    return {
        "englishSentences": english_sentences,
        "chineseSentences": chinese_sentences,
        "explanationMapping": explanation_mapping,
    }
