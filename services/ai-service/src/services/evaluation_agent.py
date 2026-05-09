"""
Evaluation Agent - 统一调度 Score Agent 和 Tips Agent
"""

import asyncio
from typing import Dict, Any, List

from common.enums import DifficultyLevel, EnglishVariant
from services.score_agent import score_agent
from services.tips_agent import tips_agent
from utils.logger import log_info, log_error


class EvaluationAgent:
    """
    评估 Agent - 统一调度评分和学习建议

    并行执行 Score Agent 和 Tips Agent，提高响应速度
    """

    def __init__(self):
        log_info("Evaluation Agent 初始化完成")

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
        评估用户的英语输入（并行执行评分和生成建议）

        Args:
            user_message: 用户最新的消息
            recent_context: 最近对话上下文
            difficulty_level: 难度等级
            english_variant: 英语变体
            scenario: 对话场景
            ai_role: AI角色

        Returns:
            {"score": int, "tips": str}
        """
        try:
            log_info(f"Evaluation Agent 开始评估: difficulty={difficulty_level.value}")

            # 并行执行 Score Agent 和 Tips Agent
            score_result, tips_result = await asyncio.gather(
                score_agent.evaluate(
                    user_message=user_message,
                    recent_context=recent_context,
                    difficulty_level=difficulty_level,
                    english_variant=english_variant,
                    scenario=scenario,
                    ai_role=ai_role
                ),
                tips_agent.evaluate(
                    user_message=user_message,
                    recent_context=recent_context,
                    difficulty_level=difficulty_level,
                    english_variant=english_variant
                )
            )

            # 汇总 token 使用量
            score_tokens = score_result.get("token_usage") or {}
            tips_tokens = tips_result.get("token_usage") or {}
            total_token_usage = {
                "input_tokens": score_tokens.get("input_tokens", 0) + tips_tokens.get("input_tokens", 0),
                "output_tokens": score_tokens.get("output_tokens", 0) + tips_tokens.get("output_tokens", 0),
                "total_tokens": score_tokens.get("total_tokens", 0) + tips_tokens.get("total_tokens", 0)
            }

            result = {
                "score": score_result.get("score"),
                "tips": tips_result.get("tips"),
                "token_usage": total_token_usage
            }

            log_info(f"Evaluation Agent 评估完成: score={result['score']}, tokens={total_token_usage['total_tokens']}")
            return result

        except Exception as e:
            log_error(f"Evaluation Agent 评估失败: {e}", e)
            return {"score": None, "tips": None, "token_usage": None}


# 全局实例
evaluation_agent = EvaluationAgent()
