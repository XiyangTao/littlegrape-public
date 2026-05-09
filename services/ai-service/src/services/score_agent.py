"""
Score Agent - 专注于评估用户英语输入的分数
"""

from typing import Dict, Any, List

from agno.agent import Agent

from common.enums import DifficultyLevel, EnglishVariant
from config.prompts.score_prompts import build_score_prompt, build_score_request
from utils.ai_helpers import get_ai_model, extract_score_result
from utils.logger import log_info, log_error


class ScoreAgent:
    """评分 Agent - 专注于给用户英语输入打分"""

    def __init__(self):
        log_info("Score Agent 初始化完成")

    async def evaluate(
        self,
        user_message: str,
        recent_context: List[Dict[str, str]],
        difficulty_level: DifficultyLevel,
        english_variant: EnglishVariant,
        scenario: str = None,
        ai_role: str = None
    ) -> Dict[str, Any]:
        """
        评估用户英语输入的分数

        Args:
            user_message: 用户最新的消息
            recent_context: 最近对话上下文
            difficulty_level: 难度等级
            english_variant: 英语变体
            scenario: 对话场景
            ai_role: AI角色

        Returns:
            {"score": int}
        """
        try:
            log_info(f"Score Agent 开始评分: difficulty={difficulty_level.value}")

            # 构建提示词
            system_prompt = build_score_prompt(
                difficulty_level=difficulty_level,
                english_variant=english_variant,
                scenario=scenario,
                ai_role=ai_role
            )

            # 构建评估请求
            score_request = build_score_request(user_message, recent_context)

            # 创建 Agent，temperature=0 确保评分稳定
            agent = Agent(
                model=get_ai_model(temperature=0),
                instructions=system_prompt,
                markdown=False
            )

            # 执行评分
            response = await agent.arun(score_request, stream=False)
            raw_response = response.content if hasattr(response, 'content') else str(response)

            # 解析响应
            result = extract_score_result(raw_response)

            # 提取 token 使用信息
            metrics = getattr(response, 'metrics', None)
            result["token_usage"] = {
                "input_tokens": getattr(metrics, 'input_tokens', 0) if metrics else 0,
                "output_tokens": getattr(metrics, 'output_tokens', 0) if metrics else 0,
                "total_tokens": getattr(metrics, 'total_tokens', 0) if metrics else 0
            }

            log_info(f"Score Agent 评分完成: score={result['score']}, reason={result.get('reason', '')}, tokens={result['token_usage']['total_tokens']}")
            return result

        except Exception as e:
            log_error(f"Score Agent 评分失败: {e}", e)
            return {"score": None, "token_usage": None}


# 全局实例
score_agent = ScoreAgent()
