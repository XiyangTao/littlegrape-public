"""
Notes Agent - 学习笔记生成
"""

from typing import Dict, Any

from agno.agent import Agent

from config.prompts.notes_prompts import NOTES_SYSTEM_PROMPT, build_notes_request
from utils.ai_helpers import get_ai_model, parse_json_response
from utils.logger import log_info, log_error


class NotesAgent:
    """Notes Agent - 分析英文句子并提供学习笔记"""

    def __init__(self):
        log_info("Notes Agent 初始化完成")

    async def analyze(self, text: str) -> Dict[str, Any]:
        """
        分析英文文本并提供学习笔记

        Args:
            text: 要分析的英文文本

        Returns:
            {
                "notes": str,        # 学习笔记
                "token_usage": {...} # token 使用情况
            }
        """
        try:
            log_info(f"Notes Agent 开始分析: text_length={len(text)}")

            # 构建请求
            notes_request = build_notes_request(text)

            # 创建 Agent
            agent = Agent(
                model=get_ai_model(),
                instructions=NOTES_SYSTEM_PROMPT,
                markdown=False
            )

            # 执行分析
            response = await agent.arun(notes_request, stream=False)
            raw_response = response.content if hasattr(response, 'content') else str(response)

            # 解析响应
            data = parse_json_response(raw_response)
            notes = data.get("notes", "")
            if not isinstance(notes, str):
                notes = str(notes) if notes else ""

            # 提取 token 使用信息
            metrics = getattr(response, 'metrics', None)
            token_usage = {
                "input_tokens": getattr(metrics, 'input_tokens', 0) if metrics else 0,
                "output_tokens": getattr(metrics, 'output_tokens', 0) if metrics else 0,
                "total_tokens": getattr(metrics, 'total_tokens', 0) if metrics else 0
            }

            log_info(f"Notes Agent 分析完成: notes_length={len(notes)}, tokens={token_usage['total_tokens']}")
            return {"notes": notes, "token_usage": token_usage}

        except Exception as e:
            log_error(f"Notes Agent 分析失败: {e}", e)
            return {
                "notes": "",
                "token_usage": {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
            }


# 全局实例
notes_agent = NotesAgent()
