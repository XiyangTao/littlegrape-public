"""
Translation Agent - 翻译专用
"""

from typing import Dict, Any

from agno.agent import Agent

from config.prompts.translation_prompts import TRANSLATION_SYSTEM_PROMPT, build_translation_request
from utils.ai_helpers import get_ai_model, parse_json_response
from utils.logger import log_info, log_error


class TranslationAgent:
    """Translation Agent - 专注于英文到中文翻译"""

    def __init__(self):
        log_info("Translation Agent 初始化完成")

    async def translate(self, text: str) -> Dict[str, Any]:
        """
        翻译英文文本

        Args:
            text: 要翻译的英文文本

        Returns:
            {
                "translation": str,  # 中文翻译
                "token_usage": {...} # token 使用情况
            }
        """
        try:
            log_info(f"Translation Agent 开始翻译: text_length={len(text)}")

            # 构建请求
            translation_request = build_translation_request(text)

            # 创建 Agent
            agent = Agent(
                model=get_ai_model(),
                instructions=TRANSLATION_SYSTEM_PROMPT,
                markdown=False
            )

            # 执行翻译
            response = await agent.arun(translation_request, stream=False)
            raw_response = response.content if hasattr(response, 'content') else str(response)

            # 解析响应
            data = parse_json_response(raw_response)
            translation = data.get("translation", "")
            if not isinstance(translation, str):
                translation = str(translation) if translation else ""

            # 提取 token 使用信息
            metrics = getattr(response, 'metrics', None)
            token_usage = {
                "input_tokens": getattr(metrics, 'input_tokens', 0) if metrics else 0,
                "output_tokens": getattr(metrics, 'output_tokens', 0) if metrics else 0,
                "total_tokens": getattr(metrics, 'total_tokens', 0) if metrics else 0
            }

            log_info(f"Translation Agent 翻译完成: translation_length={len(translation)}, tokens={token_usage['total_tokens']}")
            return {"translation": translation, "token_usage": token_usage}

        except Exception as e:
            log_error(f"Translation Agent 翻译失败: {e}", e)
            return {
                "translation": "",
                "token_usage": {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
            }


# 全局实例
translation_agent = TranslationAgent()
