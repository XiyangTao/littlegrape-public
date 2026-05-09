"""单词练习题质量评分 Agent — 用第二个 AI 对每道题评分 1-10"""
import json
from typing import Dict, Any, List

from agno.agent import Agent

from utils.ai_helpers import get_ai_model, parse_json_response
from utils.logger import log_info, log_error


# ==================== Prompt 模板 ====================

REVIEW_PROMPT = """你是英语教学质量审核专家。请对以下单词练习题逐道严格评分（1-10分）。

目标单词：{word}（{meaning_cn}）

## 评分步骤（每道题必须按顺序逐步检查，任何一步不合格即可终止评分）

**第1步：验证答案正确性**
将答案填入空格，读一遍完整句子，判断：
- 语法是否正确？主谓一致、时态、词性是否匹配？
- 语义是否通顺自然？是否是母语者会说的话？
→ 如果答案填入后句子不正确或不自然，直接 1-4 分

**第2步：检查干扰项（最重要的环节，必须逐个检查）**
将每个干扰项**逐一**填入空格，对每个干扰项分别判断：
- 该干扰项填入后，句子在语法和语义上是否也能成立？
- 该干扰项填入后，是否比答案更自然、更常用、更地道？
必须满足以下全部条件才算合格：
  ① 所有干扰项填入后句子必须不成立（语法错或语义不通）
  ② 答案必须是该语境下最自然、最常用的表达
→ 如果任何一个干扰项填入后句子也能成立，直接 1-4 分
→ 如果干扰项比答案更自然/更常用（即答案不是最佳选项），直接 1-4 分

**第3步：检查中文翻译**
- 中文翻译是否准确对应英文句子的意思？
- 是否存在翻译错误或偏差？
→ 中文翻译有明显错误，扣 2-3 分

**第4步：综合评价**
- 句子场景是否自然、实用？
- 题目是否有教学价值，能帮助学生记住目标单词的用法？
- 该句子是否展示了目标单词的**典型用法**？（非典型/罕见用法扣分）

## 评分标准（请严格执行，不要手软）

- 10分：完美——答案是唯一正确且最自然的选项，句子地道，干扰项有迷惑性但绝不构成正确答案
- 9分：优秀——有极轻微瑕疵（如句子稍不常见但完全正确）
- 8分：良好——有轻微瑕疵但不影响使用（如中文翻译略有偏差）
- 7分：可用——有瑕疵但勉强可接受
- 5-6分：有问题——句子不够自然，或干扰项过于简单无迷惑性
- 1-4分：不合格——答案错误、干扰项也能构成正确答案、答案不是最佳选项、句子严重不自然

## 常见扣分场景（务必注意）

- "What's the _____?" 答案是 make，但 brand 也在选项中且同样正确 → 1-4分
- "take _____" 答案是 effect，但选项中有 place 也说得通 → 1-4分
- 答案填入后语法不通（如 "I essay a career"）→ 1分
- 句子过于简单没有区分度（如 "I _____ it." 四个选项都能填）→ 3-4分
- "Five _____ three is eight." 答案是 and，但选项中 plus 更标准更自然 → 1-4分（干扰项比答案更合适）
- 答案虽然语法正确，但在该语境中不是母语者的首选表达，而干扰项才是 → 1-4分

以下是需要评分的题目：
{questions_text}

对每道题返回 JSON，严格按以下格式，不要包含其他文字：
{{
  "scores": [
    {{ "index": 0, "score": 6, "reason": "干扰项 brand 也能正确填入空格" }},
    ...
  ]
}}"""


# ==================== 主评分函数 ====================

async def review_word_practices(
    word: str,
    meaning_cn: str,
    questions: List[Dict[str, Any]],
    max_retries: int = 2,
) -> List[Dict[str, Any]]:
    """对一组练习题进行质量评分，返回 [{ index, score, reason }]"""

    # 格式化题目文本
    lines = []
    for i, q in enumerate(questions):
        qtype = q.get("type", "unknown")
        if qtype == "fill_blank":
            lines.append(f"题目 {i}: [fill_blank] {q.get('sentence', '')} | 答案: {q.get('answer', '')} | 选项: {q.get('options', [])} | 中文: {q.get('sentenceCn', '')}")
        elif qtype == "complete_translation":
            lines.append(f"题目 {i}: [complete_translation] {q.get('sentenceWithBlank', '')} | 答案: {q.get('answer', '')} | 中文: {q.get('sentenceCn', '')}")
        elif qtype == "scene_choice":
            lines.append(f"题目 {i}: [scene_choice] 场景: {q.get('scene', '')} | {q.get('sentence', '')} | 答案: {q.get('answer', '')} | 选项: {q.get('options', [])} | 中文: {q.get('sentenceCn', '')}")
        else:
            lines.append(f"题目 {i}: [{qtype}] {json.dumps(q, ensure_ascii=False)}")

    questions_text = "\n".join(lines)

    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            log_info(f"练习题评分: word={word}, 共{len(questions)}题, 第{attempt}次")

            prompt = REVIEW_PROMPT.format(
                word=word,
                meaning_cn=meaning_cn,
                questions_text=questions_text,
            )

            agent = Agent(
                model=get_ai_model(temperature=0),
                instructions=prompt,
                markdown=False,
            )

            user_message = f"请对以上 {len(questions)} 道关于单词 \"{word}\"（{meaning_cn}）的练习题逐道评分，严格按 JSON 格式返回。"

            response = await agent.arun(user_message, stream=False)
            content = response.content if hasattr(response, "content") else str(response)

            result = parse_json_response(content)
            if not result:
                result = json.loads(content.strip())

            scores = result.get("scores", [])

            # 校验：确保每个 score 有 index 和 score 字段
            validated = []
            for s in scores:
                idx = s.get("index")
                score_val = s.get("score")
                if idx is not None and score_val is not None:
                    validated.append({
                        "index": int(idx),
                        "score": float(score_val),
                        "reason": s.get("reason", ""),
                    })

            log_info(f"练习题评分完成: word={word}, 有效评分={len(validated)}/{len(questions)}")

            return validated

        except Exception as e:
            last_error = e
            if attempt < max_retries:
                log_info(f"练习题评分第{attempt}次失败，重试: {word} - {e}")
            else:
                log_error(f"练习题评分失败（已重试{max_retries}次）: {word} - {e}", e)

    raise last_error
