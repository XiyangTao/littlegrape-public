"""AI 造句评估 Agent"""
import json
from typing import Dict, Any

from agno.agent import Agent

from utils.ai_helpers import get_ai_model, parse_json_response
from utils.logger import log_info, log_error

SYSTEM_PROMPT = """你是一位专业的英语教学助手。用户会使用指定的英语单词造句，你需要评估这个句子的质量。

评估维度（每项 1-10 分）：
1. grammar_score: 语法正确性
2. usage_score: 单词用法准确性（是否正确使用了指定单词）
3. natural_score: 表达自然度（是否地道）

请严格按照以下 JSON 格式返回（不要返回其他内容）：
{
  "grammar_score": 数字,
  "usage_score": 数字,
  "natural_score": 数字,
  "overall_score": 数字,
  "feedback": "简短的中文反馈，指出优点和可改进之处",
  "improved_sentence": "更地道的英文表达"
}

注意：
- overall_score 是三项的加权平均（语法40%，用法35%，自然度25%），四舍五入取整
- 如果句子完全没使用指定单词，usage_score 给 0 分
- feedback 用中文写，简明扼要，不超过 100 字"""


async def evaluate_sentence(word: str, meaning_cn: str, user_sentence: str) -> Dict[str, Any]:
    """评估用户造句"""
    try:
        log_info(f"造句评估开始: word={word}, sentence={user_sentence[:50]}...")

        user_message = f"""目标单词：{word}
中文释义：{meaning_cn}
用户造句：{user_sentence}

请评估这个句子。"""

        agent = Agent(
            model=get_ai_model(temperature=0.3),
            instructions=SYSTEM_PROMPT,
            markdown=False,
        )

        response = await agent.arun(user_message, stream=False)
        content = response.content if hasattr(response, 'content') else str(response)

        # 解析 JSON 响应
        result = parse_json_response(content)
        if result is None:
            # 尝试直接 json.loads
            result = json.loads(content.strip())

        # 校验并限制分数范围
        for key in ["grammar_score", "usage_score", "natural_score", "overall_score"]:
            result[key] = max(1, min(10, int(result.get(key, 5))))

        log_info(f"造句评估完成: overall_score={result['overall_score']}")
        return result

    except Exception as e:
        log_error(f"造句评估失败: {e}", e)
        raise
