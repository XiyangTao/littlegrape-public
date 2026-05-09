"""
Learn Assistant - 并行调用翻译和学习笔记 Agent
"""

import asyncio
from typing import Dict, Any

from services.translation_agent import translation_agent
from services.notes_agent import notes_agent
from utils.logger import log_info, log_error


class LearnAssistant:
    """Learn Assistant - 并行调用 TranslationAgent 和 NotesAgent"""

    def __init__(self):
        log_info("Learn Assistant 初始化完成")

    async def process(self, text: str) -> Dict[str, Any]:
        """
        并行处理翻译和学习笔记

        Args:
            text: 要处理的英文文本

        Returns:
            {
                "translation": str,  # 中文翻译
                "notes": str,        # 学习笔记
                "token_usage": {...} # token 使用情况（合计）
            }
        """
        try:
            log_info(f"Learn Assistant 开始处理: text_length={len(text)}")

            # 并行调用两个 Agent
            translation_task = translation_agent.translate(text)
            notes_task = notes_agent.analyze(text)

            translation_result, notes_result = await asyncio.gather(
                translation_task,
                notes_task,
                return_exceptions=True
            )

            # 处理翻译结果
            if isinstance(translation_result, Exception):
                log_error(f"翻译失败: {translation_result}", translation_result)
                translation = ""
                translation_tokens = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
            else:
                translation = translation_result.get("translation", "")
                translation_tokens = translation_result.get("token_usage", {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0})

            # 处理学习笔记结果
            if isinstance(notes_result, Exception):
                log_error(f"学习笔记生成失败: {notes_result}", notes_result)
                notes = ""
                notes_tokens = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
            else:
                notes = notes_result.get("notes", "")
                notes_tokens = notes_result.get("token_usage", {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0})

            # 合并 token 使用情况
            total_token_usage = {
                "input_tokens": translation_tokens["input_tokens"] + notes_tokens["input_tokens"],
                "output_tokens": translation_tokens["output_tokens"] + notes_tokens["output_tokens"],
                "total_tokens": translation_tokens["total_tokens"] + notes_tokens["total_tokens"]
            }

            log_info(f"Learn Assistant 处理完成: translation_length={len(translation)}, notes_length={len(notes)}, tokens={total_token_usage['total_tokens']}")

            return {
                "translation": translation,
                "notes": notes,
                "token_usage": total_token_usage
            }

        except Exception as e:
            log_error(f"Learn Assistant 处理失败: {e}", e)
            return {
                "translation": "",
                "notes": "",
                "token_usage": {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
            }


# 全局实例
learn_assistant = LearnAssistant()
