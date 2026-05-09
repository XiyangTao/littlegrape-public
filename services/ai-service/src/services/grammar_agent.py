"""AI 语法讲解与练习生成 Agent"""
import json
from typing import Dict, Any, List

from agno.agent import Agent

from utils.ai_helpers import get_ai_model, parse_json_response
from utils.logger import log_info, log_error

# ==================== 语法讲解 Prompt ====================

EXPLANATION_PROMPT = """你是一位深受学生喜爱的英语老师，讲课风格像脱口秀——用类比、画面感和生活场景把语法讲活，让学生"秒懂"而不是死记硬背。

请为指定的语法点生成讲解内容，必须严格按照以下 JSON 格式返回（不要返回其他内容）：
{{
  "audioSummary": "一段100-200字的纯文本概述，用于TTS语音播放（15-30秒）。用聊天的语气讲清楚这个语法点的核心，像跟朋友解释一样自然。可以用类比帮助理解。不要任何开场白（如'大家好'、'今天我们来学习'等）。不要包含任何列表、序号、Markdown格式或特殊符号。",
  "sections": {{
    "definition": "用一句生动的类比或生活场景引入，再给出清晰的定义。比如'想象你正在直播你的生活——进行时就是这个感觉，它描述的是此刻正在发生的动作'，而不是枯燥地说'进行时表示正在进行的动作'。",
    "structure": "语法结构公式，如：主语 + be动词 + doing。可用换行分隔多个结构。保持简洁清晰。",
    "usages": [
      {{
        "title": "简短的场景标签，如「描述此刻」「吐槽坏习惯」「计划安排」",
        "description": "用一句话说清什么情境下用这个语法，像在跟朋友解释一样",
        "exampleEn": "English example sentence.",
        "exampleCn": "中文翻译，语气自然，不要翻译腔。"
      }}
    ],
    "examples": [
      {{
        "en": "English sentence.",
        "cn": "中文翻译。",
        "highlight": "sentence中需要高亮的关键语法部分"
      }}
    ],
    "commonErrors": [
      {{
        "wrong": "错误示例英文句子",
        "correct": "正确示例英文句子",
        "explanation": "用大白话说清楚为什么错，比如'中文里可以说「我喜欢游泳」，但英语里 like 后面要加 -ing 或 to do，不能直接跟动词原形'"
      }}
    ],
    "tips": ["好记的口诀、类比或记忆窍门，比如'see/hear/feel 这些感官动词不加 -ing，因为感觉是自动发生的，你没法「正在看见」'"]
  }}
}}

要求：
- 讲解风格：像一个有趣的老师在跟你一对一聊天，不是在读教材。多用类比和生活场景，让抽象的语法变得有画面感
- definition：必须先用一个类比、场景或对比引入（让学生"啊，原来是这个意思"），再给定义。严禁直接写"XXX表示XXX"这种教科书式开头
- usages：提供 2-4 个用法场景，每个场景用一句话说清什么时候用，配一个贴近生活的英文例句+自然的中文翻译
- examples：提供 4-6 个由浅入深的例句，选取贴近日常生活的场景（点外卖、刷手机、考试、约会等），highlight 标注关键语法结构
- commonErrors：提供 2-3 个中国学生最容易犯的错误，explanation 用大白话解释"为什么错"，要点明中文思维和英文思维的差异
- tips：提供 1-2 个记忆窍门，可以是口诀、类比、对比记忆法等，要真正好记
- 根据难度级别调整讲解深度：basic（用最简单的例子，多用类比）、intermediate（适度展开，加入对比）、advanced（深入细节，讲清易混淆点）
- audioSummary 必须是纯文本，100-200字，不含任何格式标记或Markdown，像和学生聊天一样自然
- 严格返回合法 JSON，不要返回其他内容"""


# ==================== 练习题生成 Prompt ====================

PRACTICE_PROMPT = """你是一位专业的英语语法出题专家。请为指定的语法点生成练习题。

要求：
1. 题目总数：{count} 道
2. 题型比例：约 60% 选择题（choice）+ 40% 选词填空题（fill_blank）
3. 难度与语法点级别匹配
4. 选择题有 4 个选项，格式为 "A. xxx", "B. xxx", "C. xxx", "D. xxx"
5. 选词填空题也必须提供 4 个选项，格式为纯词或短语数组，不带 A/B/C/D 前缀
6. 每道题必须有中文解析（explanation）

请严格按照以下 JSON 格式返回（不要返回其他内容）：
{{
  "questions": [
    {{
      "type": "choice",
      "question": "题干文本，空白处用 _____ 表示",
      "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
      "answer": "B. option2",
      "explanation": "中文解析"
    }},
    {{
      "type": "fill_blank",
      "question": "题干文本，空白处用 _____ 表示",
      "options": ["word1", "word2", "word3", "word4"],
      "answer": "word2",
      "explanation": "中文解析"
    }}
  ]
}}

注意：
- 题目要有区分度，不要太简单也不要太难
- 选择题和选词填空题的干扰项都要有一定迷惑性
- 解析要简洁明了，点明考察的语法规则
- 所有题目必须围绕指定的语法点
- 选词填空题规则（重要）：
  - 每道题只能有一个空白处（一个 _____），严禁多空题
  - answer 必须是 options 数组中的一个元素
  - options 是 4 个纯词或短语，不带字母编号前缀
  - 干扰项应是同类词或相近形式，具有语法层面的迷惑性
  - 严禁使用 "(no article)" 或 "不填" 作为答案，如需考察零冠词用法请改用选择题"""


# ==================== 课程式练习题生成 Prompt ====================

LESSON_PRACTICE_PROMPT = """你是一位专业的英语语法出题专家，擅长设计脚手架式渐进练习题。

请为指定的语法点生成一套完整的课程练习题，按认知层级分组：
- 识别层（recognition）：2-3 题 — error_judgment + choice
- 理解层（understanding）：3-4 题 — error_correction + fill_blank + dual_blank + table_fill
- 产出层（production）：2-3 题 — sentence_reorder + word_assembly

总计约 8-10 题。每道题必须包含 smartTip（答错时显示的规则提示）。

请严格按照以下 JSON 格式返回（不要返回其他内容）：
{{
  "questions": [
    {{
      "type": "error_judgment",
      "cognitiveLevel": "recognition",
      "question": "一个完整的英文句子（可能正确也可能有语法错误）",
      "answer": "correct 或 incorrect",
      "errorPart": "如果句子有错，标注错误部分原文；如果句子正确则为空字符串",
      "correctVersion": "如果句子有错，给出完整的正确版本；如果句子正确则为空字符串",
      "explanation": "中文解析",
      "smartTip": {{
        "rule": "语法规则简要说明",
        "wrong": "错误示例",
        "correct": "正确示例",
        "examples": ["相关词汇或补充例子1", "例子2"]
      }}
    }},
    {{
      "type": "choice",
      "cognitiveLevel": "recognition",
      "question": "题干文本，空白处用 _____ 表示",
      "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
      "answer": "B. option2",
      "explanation": "中文解析",
      "smartTip": {{
        "rule": "语法规则简要说明",
        "wrong": "错误示例",
        "correct": "正确示例",
        "examples": []
      }}
    }},
    {{
      "type": "error_correction",
      "cognitiveLevel": "understanding",
      "question": "一个有语法错误的英文句子",
      "errorPart": "句子中的错误部分原文",
      "options": ["replacement1", "replacement2", "replacement3", "replacement4"],
      "answer": "replacement1",
      "correctVersion": "完整的修正后句子",
      "explanation": "中文解析",
      "smartTip": {{
        "rule": "语法规则简要说明",
        "wrong": "错误示例",
        "correct": "正确示例",
        "examples": []
      }}
    }},
    {{
      "type": "fill_blank",
      "cognitiveLevel": "understanding",
      "question": "题干文本，空白处用 _____ 表示",
      "options": ["word1", "word2", "word3", "word4"],
      "answer": "word2",
      "explanation": "中文解析",
      "smartTip": {{
        "rule": "语法规则简要说明",
        "wrong": "错误示例",
        "correct": "正确示例",
        "examples": []
      }}
    }},
    {{
      "type": "dual_blank",
      "cognitiveLevel": "understanding",
      "sentence1": "第一个句子，空白处用 _____ 表示",
      "sentence2": "第二个句子（与句子1形成对比），空白处用 _____ 表示",
      "question": "对比说明（如：注意主谓一致的变化）",
      "options": ["word1", "word2", "word3", "word4"],
      "answer": "sentence1的正确答案",
      "answer2": "sentence2的正确答案",
      "explanation": "中文解析，说明两个句子的对比要点",
      "smartTip": {{
        "rule": "语法规则简要说明",
        "wrong": "错误示例",
        "correct": "正确示例",
        "examples": []
      }}
    }},
    {{
      "type": "table_fill",
      "cognitiveLevel": "understanding",
      "question": "表格填写说明（如：完成动词 be 的变位表）",
      "tableData": {{
        "headers": ["主语", "现在时", "过去时"],
        "rows": [
          ["I", "am", "___"],
          ["She/He", "___", "was"],
          ["They", "are", "___"]
        ],
        "blanks": [
          {{"row": 0, "col": 2, "answer": "was", "options": ["was", "were", "is", "are"]}},
          {{"row": 1, "col": 1, "answer": "is", "options": ["is", "are", "was", "were"]}},
          {{"row": 2, "col": 2, "answer": "were", "options": ["were", "was", "is", "are"]}}
        ]
      }},
      "answer": "was,is,were",
      "explanation": "中文解析",
      "smartTip": {{
        "rule": "语法规则简要说明",
        "wrong": "错误示例",
        "correct": "正确示例",
        "examples": []
      }}
    }},
    {{
      "type": "sentence_reorder",
      "cognitiveLevel": "production",
      "question": "中文翻译（明确目标句意）",
      "words": ["She", "has", "been", "to", "Paris", "."],
      "answer": "She has been to Paris.",
      "structureHint": "现在完成时：主语 + has/have + been + to + 地点",
      "explanation": "中文解析",
      "smartTip": {{
        "rule": "语法规则简要说明",
        "wrong": "错误示例",
        "correct": "正确示例",
        "examples": []
      }}
    }},
    {{
      "type": "word_assembly",
      "cognitiveLevel": "production",
      "question": "中文原句",
      "words": ["I", "have", "finished", "my", "homework", "."],
      "distractors": ["did", "was", "completing", "the"],
      "answer": "I have finished my homework.",
      "acceptableAnswers": ["I've finished my homework."],
      "structureHint": "现在完成时：主语 + have/has + 过去分词 + 宾语",
      "explanation": "中文解析",
      "smartTip": {{
        "rule": "语法规则简要说明",
        "wrong": "错误示例",
        "correct": "正确示例",
        "examples": []
      }}
    }}
  ]
}}

重要规则：
- error_judgment 题：正确和错误句子的比例约 4:6，错误必须是该语法点的典型错误
- error_correction 题：4 个选项是替换错误部分的选项（不带字母编号），干扰项必须是同类语法的常见混淆项
- dual_blank 题：两个句子只有一个语法差异（主谓一致、时态、介词等），选项中包含两个正确答案 + 两个干扰项
- table_fill 题：表格不超过 4 行 × 3 列，仅适用于有明确变化规律的语法点（动词变位、代词变化等）。如果该语法点不适合填表题，请用 fill_blank 或 dual_blank 替代
- sentence_reorder 题：单词数控制在 5-8 个，标点符号作为独立元素
- word_assembly 题：正确答案的单词 + 3-4 个干扰词，干扰词应是同一语法点的常见错误用词
- 每道题的 smartTip 必须精准对应该题考察的语法规则
- fill_blank 题：只有一个空，answer 必须在 options 中，选项不带字母编号
- 所有题目围绕指定语法点，难度匹配语法点级别"""


async def generate_explanation(name_zh: str, name_en: str, difficulty: str, max_retries: int = 2) -> Dict[str, Any]:
    """生成语法点 AI 讲解（结构化 JSON），解析失败自动重试"""
    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            log_info(f"语法讲解生成开始: {name_zh} ({name_en}), difficulty={difficulty}, 第{attempt}次")

            user_message = f"""请讲解以下英语语法点：

语法点（中文）：{name_zh}
语法点（英文）：{name_en}
难度级别：{difficulty}

请严格按照 JSON 格式返回讲解内容。"""

            agent = Agent(
                model=get_ai_model(temperature=0.4),
                instructions=EXPLANATION_PROMPT,
                markdown=False,
            )

            response = await agent.arun(user_message, stream=False)
            content = response.content if hasattr(response, 'content') else str(response)

            # 解析 JSON 响应
            result = parse_json_response(content)
            if not result:
                result = json.loads(content.strip())

            # 校验必要字段
            sections = result.get("sections", {})
            audio_summary = result.get("audioSummary", "")

            if not sections.get("definition"):
                raise ValueError("缺少 definition 字段")

            log_info(f"语法讲解生成完成: {name_zh}, audioSummary长度={len(audio_summary)}")

            return {
                "explanation": json.dumps(result, ensure_ascii=False),
                "examples": [],
            }

        except Exception as e:
            last_error = e
            if attempt < max_retries:
                log_info(f"语法讲解第{attempt}次失败，重试: {name_zh} - {e}")
            else:
                log_error(f"语法讲解生成失败（已重试{max_retries}次）: {name_zh} - {e}", e)

    raise last_error


async def generate_practice(name_zh: str, name_en: str, difficulty: str, count: int = 10) -> Dict[str, Any]:
    """生成语法练习题（传统模式：choice + fill_blank）"""
    try:
        log_info(f"语法练习题生成开始: {name_zh} ({name_en}), count={count}")

        prompt = PRACTICE_PROMPT.format(count=count)

        user_message = f"""请为以下语法点生成练习题：

语法点（中文）：{name_zh}
语法点（英文）：{name_en}
难度级别：{difficulty}
题目数量：{count} 道"""

        agent = Agent(
            model=get_ai_model(temperature=0.5),
            instructions=prompt,
            markdown=False,
        )

        response = await agent.arun(user_message, stream=False)
        content = response.content if hasattr(response, 'content') else str(response)

        # 解析 JSON 响应
        result = parse_json_response(content)
        if result is None:
            result = json.loads(content.strip())

        questions = result.get("questions", [])

        # 校验题目格式
        validated_questions = []
        for q in questions:
            if q.get("type") not in ("choice", "fill_blank"):
                continue
            if not q.get("question") or not q.get("answer"):
                continue

            options = q.get("options")

            # fill_blank 必须有 options（选词填空）
            if q["type"] == "fill_blank":
                if not options or not isinstance(options, list) or len(options) < 2:
                    continue
                # answer 必须在 options 中，否则跳过
                if q["answer"] not in options:
                    continue

            validated_questions.append({
                "type": q["type"],
                "question": q["question"],
                "options": options,
                "answer": q["answer"],
                "explanation": q.get("explanation", ""),
            })

        log_info(f"语法练习题生成完成: {name_zh}, 有效题目={len(validated_questions)}/{len(questions)}")

        return {
            "questions": validated_questions,
        }

    except Exception as e:
        log_error(f"语法练习题生成失败: {name_zh} - {e}", e)
        raise


# 所有课程式题型
LESSON_QUESTION_TYPES = {
    "error_judgment", "choice", "error_correction", "fill_blank",
    "dual_blank", "table_fill", "sentence_reorder", "word_assembly",
}


def _validate_lesson_question(q: Dict[str, Any]) -> bool:
    """校验课程式练习题的格式"""
    qtype = q.get("type")
    if qtype not in LESSON_QUESTION_TYPES:
        return False
    if not q.get("answer"):
        return False

    if qtype == "error_judgment":
        if not q.get("question"):
            return False
        if q["answer"] not in ("correct", "incorrect"):
            return False

    elif qtype == "choice":
        if not q.get("question") or not q.get("options"):
            return False
        if q["answer"] not in q["options"]:
            return False

    elif qtype == "error_correction":
        if not q.get("question") or not q.get("errorPart") or not q.get("options"):
            return False
        if q["answer"] not in q["options"]:
            return False

    elif qtype == "fill_blank":
        if not q.get("question") or not q.get("options"):
            return False
        if q["answer"] not in q["options"]:
            return False

    elif qtype == "dual_blank":
        if not q.get("sentence1") or not q.get("sentence2") or not q.get("options"):
            return False
        if not q.get("answer2"):
            return False

    elif qtype == "table_fill":
        table = q.get("tableData")
        if not table or not table.get("headers") or not table.get("rows") or not table.get("blanks"):
            return False
        for blank in table["blanks"]:
            if not blank.get("answer") or not blank.get("options"):
                return False

    elif qtype == "sentence_reorder":
        if not q.get("words") or not isinstance(q["words"], list):
            return False

    elif qtype == "word_assembly":
        if not q.get("words") or not isinstance(q["words"], list):
            return False
        if not q.get("distractors") or not isinstance(q["distractors"], list):
            return False

    return True


async def generate_lesson_practice(name_zh: str, name_en: str, difficulty: str, max_retries: int = 2) -> Dict[str, Any]:
    """生成课程式练习题（8 种题型，按认知层级分组），解析失败自动重试"""
    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            log_info(f"课程练习题生成开始: {name_zh} ({name_en}), difficulty={difficulty}, 第{attempt}次")

            user_message = f"""请为以下语法点生成一套课程练习题（按认知层级分组）：

语法点（中文）：{name_zh}
语法点（英文）：{name_en}
难度级别：{difficulty}

请严格按照 JSON 格式返回。"""

            agent = Agent(
                model=get_ai_model(temperature=0.5),
                instructions=LESSON_PRACTICE_PROMPT,
                markdown=False,
            )

            response = await agent.arun(user_message, stream=False)
            content = response.content if hasattr(response, 'content') else str(response)

            result = parse_json_response(content)
            if result is None:
                result = json.loads(content.strip())

            questions = result.get("questions", [])

            # 校验并过滤
            validated = []
            for q in questions:
                if _validate_lesson_question(q):
                    validated.append(q)

            if len(validated) < 5:
                raise ValueError(f"有效题目数不足: {len(validated)}/8+")

            log_info(f"课程练习题生成完成: {name_zh}, 有效题目={len(validated)}/{len(questions)}")

            return {"questions": validated}

        except Exception as e:
            last_error = e
            if attempt < max_retries:
                log_info(f"课程练习题第{attempt}次失败，重试: {name_zh} - {e}")
            else:
                log_error(f"课程练习题生成失败（已重试{max_retries}次）: {name_zh} - {e}", e)

    raise last_error
