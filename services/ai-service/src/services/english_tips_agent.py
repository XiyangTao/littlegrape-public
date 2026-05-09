"""
English Tips Agent — 评估用户英语输入，返回简短学习建议
独立于角色 AI，可并行调用

实现要点：
- 用 OpenAI 兼容 API 直调（DeepSeek beta endpoint），不走 Agno 包装
- Function Calling (strict=true) 强制返回 {should_tip, tip} 结构，避免 LLM
  违反 prompt 指令多说几句导致前端把 NO_TIP 等内部标记当成 tip 渲染
"""

import json
from typing import List, Dict, Any

from openai import AsyncOpenAI

from config.settings import settings
from config.prompts.english_tips_prompts import ENGLISH_TIPS_SYSTEM_PROMPT, ENGLISH_TIPS_USER_TEMPLATE
from utils.logger import log_info, log_error


# Function Calling 工具：强制 LLM 返回结构化 {should_tip, tip}
# strict=true 让 DeepSeek/OpenAI 在解码层就保证 schema 合规
TIPS_RESPONSE_TOOL = {
    "type": "function",
    "function": {
        "name": "submit_tip",
        "description": "Submit a structured English learning tip for the user's latest message",
        "strict": True,
        "parameters": {
            "type": "object",
            "properties": {
                "should_tip": {
                    "type": "boolean",
                    "description": (
                        "Whether the user message warrants an English learning tip. "
                        "Set false for greetings (Hi/Hello), very short replies (Ok/Yes/No/Thanks), "
                        "pure emoji, gibberish, or anything not useful to teach."
                    ),
                },
                "tip": {
                    "type": "string",
                    "description": (
                        "The Chinese learning tip with English example, max 180 chars. "
                        "Format: 中文说明 + English example. "
                        "Empty string when should_tip is false."
                    ),
                },
            },
            "required": ["should_tip", "tip"],
            "additionalProperties": False,
        },
    },
}


def _create_llm_client() -> tuple[AsyncOpenAI, str]:
    """优先 DeepSeek（beta 端点支持 strict function calling），否则 OpenAI"""
    if settings.deepseek_api_key:
        return AsyncOpenAI(
            api_key=settings.deepseek_api_key,
            base_url="https://api.deepseek.com/beta",
        ), settings.deepseek_model
    elif settings.openai_api_key:
        return AsyncOpenAI(api_key=settings.openai_api_key), "gpt-4.1-nano"
    else:
        raise ValueError("未配置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY")


class EnglishTipsAgent:
    """轻量级英语 tips 评估，Function Calling 保证输出结构"""

    def __init__(self):
        try:
            self.llm_client, self.llm_model = _create_llm_client()
            log_info(f"EnglishTipsAgent initialized: {self.llm_model}")
        except Exception as e:
            log_error(f"Failed to init EnglishTipsAgent: {e}", e)
            self.llm_client = None
            self.llm_model = ""

    async def evaluate(
        self,
        user_message: str,
        recent_context: List[Dict[str, str]] = None,
    ) -> str:
        """
        分析用户的英语输入，返回一条简短的中文学习建议。

        Returns:
            中文 tip 字符串。当 LLM 判定无需建议（短问候、emoji、gibberish）
            或任何调用失败时统一返回空字符串。
        """
        if not user_message or len(user_message.strip()) < 2:
            return ""
        if not self.llm_client:
            return ""

        try:
            # 构建上下文字符串
            context_str = ""
            if recent_context:
                context_str = "Recent conversation:\n"
                for msg in recent_context[-6:]:
                    role_label = "AI" if msg["role"] == "assistant" else "User"
                    context_str += f"{role_label}: {msg['content']}\n"
                context_str += "\n"

            user_prompt = ENGLISH_TIPS_USER_TEMPLATE.format(
                user_message=user_message,
                recent_context=context_str,
            )

            response = await self.llm_client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": ENGLISH_TIPS_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                tools=[TIPS_RESPONSE_TOOL],
                tool_choice={"type": "function", "function": {"name": "submit_tip"}},
            )

            choice = response.choices[0]
            if not choice.message.tool_calls:
                log_error(f"[EnglishTips] no tool_calls for '{user_message[:30]}...'")
                return ""

            try:
                args: Dict[str, Any] = json.loads(
                    choice.message.tool_calls[0].function.arguments
                )
            except (json.JSONDecodeError, IndexError, AttributeError) as e:
                log_error(f"[EnglishTips] failed to parse tool_calls: {e}")
                return ""

            should_tip = bool(args.get("should_tip", False))
            tip = (args.get("tip") or "").strip()

            if not should_tip or not tip:
                log_info(f"[EnglishTips] no_tip for '{user_message[:30]}...'")
                return ""

            log_info(f"[EnglishTips] '{user_message[:30]}...' → '{tip[:80]}'")
            return tip

        except Exception as e:
            log_error(f"[EnglishTips] evaluation failed: {e}", e)
            return ""


# 单例
english_tips_agent = EnglishTipsAgent()
