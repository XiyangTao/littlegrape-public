"""
Tips Agent - 专注于生成学习建议
"""

from typing import Dict, Any, List

from agno.agent import Agent

from common.enums import DifficultyLevel, EnglishVariant
from config.prompts.tips_prompts import build_tips_prompt, build_tips_request
from utils.ai_helpers import get_ai_model, extract_tips_result
from utils.logger import log_info, log_error


class TipsAgent:
    """Tips Agent - 专注于生成中文学习建议"""

    def __init__(self):
        log_info("Tips Agent 初始化完成")

    async def evaluate(
        self,
        user_message: str,
        recent_context: List[Dict[str, str]],
        difficulty_level: DifficultyLevel,
        english_variant: EnglishVariant
    ) -> Dict[str, Any]:
        """
        为用户英语输入生成学习建议

        Args:
            user_message: 用户最新的消息
            recent_context: 最近对话上下文
            difficulty_level: 难度等级
            english_variant: 英语变体

        Returns:
            {"tips": str}
        """
        try:
            log_info(f"Tips Agent 开始生成建议: difficulty={difficulty_level.value}")

            # 构建提示词
            system_prompt = build_tips_prompt(
                difficulty_level=difficulty_level,
                english_variant=english_variant
            )

            # 构建请求
            tips_request = build_tips_request(user_message, recent_context)

            # 创建 Agent
            agent = Agent(
                model=get_ai_model(),
                instructions=system_prompt,
                markdown=False
            )

            log_info(f"Tips Agent 开始生成: tips_request={tips_request}")

            # 执行生成
            response = await agent.arun(tips_request, stream=False)
            raw_response = response.content if hasattr(response, 'content') else str(response)

            # 解析响应
            result = extract_tips_result(raw_response)

            # 提取 token 使用信息
            metrics = getattr(response, 'metrics', None)
            result["token_usage"] = {
                "input_tokens": getattr(metrics, 'input_tokens', 0) if metrics else 0,
                "output_tokens": getattr(metrics, 'output_tokens', 0) if metrics else 0,
                "total_tokens": getattr(metrics, 'total_tokens', 0) if metrics else 0
            }

            log_info(f"Tips Agent 生成完成: tips_length={len(result['tips']) if result['tips'] else 0}, tokens={result['token_usage']['total_tokens']}")
            return result

        except Exception as e:
            log_error(f"Tips Agent 生成失败: {e}", e)
            return {"tips": None, "token_usage": None}


# 全局实例
tips_agent = TipsAgent()
