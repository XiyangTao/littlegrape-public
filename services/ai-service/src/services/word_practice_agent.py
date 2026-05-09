"""单词复习题 AI 生成 Agent — 3 种题型，每词 10 道"""
import json
from typing import Dict, Any, List

from agno.agent import Agent

from utils.ai_helpers import get_ai_model, parse_json_response
from utils.logger import log_info, log_error


# ==================== Prompt 模板 ====================

GENERATE_PROMPT = """你是一个专业的英语教学出题专家，为英语学习者设计单词复习题。

## 目标单词
- 单词：{word}
- 中文释义：{meaning_cn}

## 单词义项
{meanings_text}

## 单词搭配
{collocations_text}

## 任务
请为这个单词生成 10 道复习题，覆盖以下全部 3 种题型，数量分配如下：
- fill_blank（选词填空）: 3-4 道
- complete_translation（补全翻译）: 3-4 道
- scene_choice（场景选词）: 3-4 道

### 1. fill_blank — 选词填空
句子中用 _____ 挖空，正确答案必须是目标单词「{word}」，另外给 3 个同类别的干扰词作为选项。
注意：answer 的值必须是「{word}」。
```json
{{
  "type": "fill_blank",
  "sentence": "I _____ playing basketball after school.",
  "sentenceCn": "我放学后喜欢打篮球。",
  "options": ["hate", "enjoy", "want", "need"],
  "answer": "enjoy",
  "explanation": "enjoy 后接动名词，表示享受做某事"
}}
```

### 2. complete_translation — 补全翻译
给中文翻译 + 英文挖空句，用户需要输入目标单词「{word}」。answer 必须是「{word}」（或其适当变形，如复数、过去式等）。
```json
{{
  "type": "complete_translation",
  "sentenceCn": "我非常感激你的帮助。",
  "sentenceWithBlank": "I really _____ your help.",
  "answer": "appreciate",
  "explanation": "appreciate 表示感激、感谢"
}}
```

### 3. scene_choice — 场景选词
描述一个生活场景，句子中用 _____ 挖空目标单词，四选一。answer 必须是目标单词「{word}」。
```json
{{
  "type": "scene_choice",
  "scene": "放学回家，妈妈做了你最爱吃的菜",
  "sentence": "Mom, this food is _____! I love it!",
  "sentenceCn": "妈妈，这个食物太好吃了！我喜欢！",
  "options": ["delicious", "terrible", "boring", "difficult"],
  "answer": "delicious",
  "explanation": "delicious 意为美味的，用于夸赞食物好吃"
}}
```

## 要求
1. 句子难度应与目标单词本身的难度自然匹配，简单词用简单句，高级词用复杂句
2. 每道题的句子必须自然、地道，场景多样化（日常生活、学习、工作、社交等）
3. **干扰项检查（最重要）**：
   - 干扰项填入空格后句子必须不成立（语法错误或语义明显不通）
   - **答案必须是该语境下最自然、最常用的表达**，不能有干扰项比答案更合适
   - 生成每道题后，将每个干扰项逐一填入空格验证：如果任何干扰项也能说得通，或比答案更自然，则必须重新设计句子或更换干扰项
   - 错误示例：句子 "Five _____ three is eight."，答案 and，干扰项 plus —— plus 比 and 更自然，这种题不合格
4. **句子必须体现目标单词的典型、核心用法**，避免使用罕见或边缘用法（如 "and" 表示加法就是非典型用法）
5. 每道题必须包含 explanation 字段，用中文简短解释
6. 选择题的 options 中 answer 的位置要随机（不要总放第一个）
7. **每道题的句子场景必须各不相同，严禁重复句式或仅替换个别单词**
8. fill_blank、scene_choice、complete_translation 的 answer 必须是目标单词「{word}」或其语法变形

## 返回格式
严格返回以下 JSON，不要包含其他文字：
{{
  "questions": [
    // 20 道题，每道包含 type 字段和对应题型的所有字段（含 explanation）
  ]
}}"""


# ==================== 校验函数 ====================

def _validate_question(q: Dict[str, Any], word: str = "") -> bool:
    """校验单道题的数据完整性和质量"""
    qtype = q.get("type")
    if not qtype:
        return False

    # 通用：必须有 explanation
    if not q.get("explanation"):
        return False

    word_lower = word.lower()

    if qtype == "fill_blank":
        answer = q.get("answer", "")
        return bool(
            q.get("sentence") and q.get("sentenceCn")
            and q.get("options") and len(q["options"]) == 4
            and answer and answer in q["options"]
            and "_____" in q["sentence"]
            and (not word_lower or _is_word_form(answer, word_lower))
        )

    elif qtype == "complete_translation":
        answer = q.get("answer", "")
        return bool(
            q.get("sentenceCn") and q.get("sentenceWithBlank")
            and answer
            and "_____" in q["sentenceWithBlank"]
            and (not word_lower or _is_word_form(answer, word_lower))
        )

    elif qtype == "scene_choice":
        answer = q.get("answer", "")
        return bool(
            q.get("scene") and q.get("sentence") and q.get("sentenceCn")
            and q.get("options") and len(q["options"]) == 4
            and answer and answer in q["options"]
            and "_____" in q["sentence"]
            and (not word_lower or _is_word_form(answer, word_lower))
        )

    return False


def _is_word_form(answer: str, word: str) -> bool:
    """判断 answer 是否是目标单词的原形或常见变形（复数、过去式、进行时等）"""
    answer_lower = answer.lower().strip()
    w = word.lower().strip()
    if answer_lower == w:
        return True
    suffixes = ["s", "es", "ed", "ing", "er", "est", "ly", "ful", "ness", "tion"]
    for s in suffixes:
        if answer_lower == w + s:
            return True
    if w.endswith("e"):
        base = w[:-1]
        for s in ["ing", "ed", "er", "est"]:
            if answer_lower == base + s:
                return True
    if w.endswith("y") and len(w) > 2:
        base = w[:-1] + "i"
        for s in ["es", "ed", "er", "est"]:
            if answer_lower == base + s:
                return True
    if len(w) >= 2 and w[-1] not in "aeiouwy" and w[-2] in "aeiou":
        doubled = w + w[-1]
        for s in ["ing", "ed", "er", "est"]:
            if answer_lower == doubled + s:
                return True
    if answer_lower.startswith(w[:max(2, len(w) - 2)]) and abs(len(answer_lower) - len(w)) <= 3:
        return True
    return False


def _dedupe_questions(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """去除句子重复的题目，同类型内按句子去重"""
    seen = set()
    result = []
    for q in questions:
        qtype = q.get("type", "")
        sentence = q.get("sentence") or q.get("sentenceWithBlank") or ""
        key = f"{qtype}:{sentence.strip()}"
        if key not in seen:
            seen.add(key)
            result.append(q)
    return result


def _format_meanings(meanings: List[Dict]) -> str:
    """格式化义项数据"""
    if not meanings:
        return "无"
    lines = []
    for m in meanings:
        pos = m.get("pos", "")
        mcn = m.get("meaningCn", "")
        ex_en = m.get("exampleEn", "")
        ex_cn = m.get("exampleCn", "")
        line = f"- [{pos}] {mcn}"
        if ex_en:
            line += f"\n  例句: {ex_en}"
            if ex_cn:
                line += f" ({ex_cn})"
        lines.append(line)
    return "\n".join(lines)


def _format_collocations(collocations: List[Dict]) -> str:
    """格式化搭配数据"""
    if not collocations:
        return "无"
    lines = []
    for c in collocations:
        pattern = c.get("pattern", "")
        mcn = c.get("meaningCn", "")
        examples = c.get("examples", [])
        line = f"- {pattern}"
        if mcn:
            line += f" ({mcn})"
        if examples:
            ex_str = ", ".join(examples[:3]) if isinstance(examples, list) else str(examples)
            line += f"\n  例: {ex_str}"
        lines.append(line)
    return "\n".join(lines)


# ==================== 主生成函数 ====================

async def generate_word_practices(
    word: str,
    meaning_cn: str,
    meanings: List[Dict],
    collocations: List[Dict],
    max_retries: int = 2,
) -> Dict[str, Any]:
    """为单个单词生成 10 道复习题（3 种题型各 3-4 道）"""

    meanings_text = _format_meanings(meanings)
    collocations_text = _format_collocations(collocations)

    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            log_info(f"单词练习题生成: word={word}, 第{attempt}次")

            prompt = GENERATE_PROMPT.format(
                word=word,
                meaning_cn=meaning_cn,
                meanings_text=meanings_text,
                collocations_text=collocations_text,
            )

            user_message = f"""请为单词 "{word}"（{meaning_cn}）生成 10 道复习题，覆盖全部 3 种题型，每种 3-4 道。
每道题必须包含 explanation 字段。严格按照 JSON 格式返回。"""

            agent = Agent(
                model=get_ai_model(temperature=0.7),
                instructions=prompt,
                markdown=False,
            )

            response = await agent.arun(user_message, stream=False)
            content = response.content if hasattr(response, "content") else str(response)

            result = parse_json_response(content)
            if not result:
                result = json.loads(content.strip())

            questions = result.get("questions", [])

            validated = [q for q in questions if _validate_question(q, word)]
            validated = _dedupe_questions(validated)

            if not validated:
                raise ValueError(f"无有效题目（共{len(questions)}题全部校验失败）")

            types_covered = set(q["type"] for q in validated)
            all_types = {"fill_blank", "complete_translation", "scene_choice"}
            missing = all_types - types_covered

            log_info(f"单词练习题生成完成: word={word}, "
                     f"有效={len(validated)}/{len(questions)}, "
                     f"覆盖题型={len(types_covered)}/3"
                     + (f", 缺少: {missing}" if missing else ""))

            return {"questions": validated}

        except Exception as e:
            last_error = e
            if attempt < max_retries:
                log_info(f"单词练习题第{attempt}次失败，重试: {word} - {e}")
            else:
                log_error(f"单词练习题生成失败（已重试{max_retries}次）: {word} - {e}", e)

    raise last_error
