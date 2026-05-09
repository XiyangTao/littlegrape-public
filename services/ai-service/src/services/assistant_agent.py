"""
Assistant Agent - 学习助手对话和洞察提取
"""

from typing import Dict, Any, List

from agno.agent import Agent

from utils.ai_helpers import get_ai_model, parse_json_response
from utils.logger import log_info, log_error


EXTRACT_INSIGHTS_PROMPT = """你是一个英语学习分析专家。请分析以下用户与助手之间的对话，提取用户的学习特征。

请以 JSON 格式返回分析结果，包含以下字段：
- learning_style: 用户的学习风格（如"视觉型"、"听觉型"、"实践型"、"社交型"等）
- strengths: 用户的英语优势列表（如["词汇量大", "语法准确"]）
- weaknesses: 用户的英语弱项列表（如["口语表达", "听力理解"]）
- interests: 用户的兴趣话题列表（如["旅行", "科技", "电影"]）
- mood_pattern: 用户的情绪模式（如"积极主动"、"谨慎保守"、"好奇心强"等）

如果对话内容不足以判断某个字段，请返回合理的默认值。

请只返回 JSON，不要包含其他文本。

对话内容：
"""


class AssistantAgent:
    """Assistant Agent - 学习助手"""

    def __init__(self):
        log_info("Assistant Agent 初始化完成")

    async def chat(
        self,
        system_prompt: str,
        history: List[Dict[str, str]],
        message: str
    ) -> Dict[str, Any]:
        """
        助手聊天

        Args:
            system_prompt: 系统提示词
            history: 历史对话 [{"role": "user|assistant", "content": "..."}]
            message: 用户消息

        Returns:
            {
                "reply": str,
                "token_usage": {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
            }
        """
        try:
            log_info(f"Assistant Agent 开始聊天: history_length={len(history)}, message_length={len(message)}")

            # 构建消息列表：history + 当前用户消息
            # Agno Agent 使用 instructions 作为 system prompt，history 通过 session 管理
            # 这里直接把 history 拼成上下文文本传给 agent
            context_parts = []
            for msg in history:
                role_label = "用户" if msg["role"] == "user" else "助手"
                context_parts.append(f"{role_label}: {msg['content']}")

            # 构建最终请求：如果有历史消息，附上上下文
            if context_parts:
                context_text = "\n".join(context_parts)
                full_message = f"以下是之前的对话记录：\n{context_text}\n\n用户的新消息：{message}"
            else:
                full_message = message

            # 创建 Agent
            agent = Agent(
                model=get_ai_model(),
                instructions=system_prompt,
                markdown=False
            )

            # 执行对话
            response = await agent.arun(full_message, stream=False)
            reply = response.content if hasattr(response, 'content') else str(response)

            # 提取 token 使用信息
            metrics = getattr(response, 'metrics', None)
            token_usage = {
                "input_tokens": getattr(metrics, 'input_tokens', 0) if metrics else 0,
                "output_tokens": getattr(metrics, 'output_tokens', 0) if metrics else 0,
                "total_tokens": getattr(metrics, 'total_tokens', 0) if metrics else 0
            }

            log_info(f"Assistant Agent 聊天完成: reply_length={len(reply)}, tokens={token_usage['total_tokens']}")
            return {"reply": reply, "token_usage": token_usage}

        except Exception as e:
            log_error(f"Assistant Agent 聊天失败: {e}", e)
            return {
                "reply": "",
                "token_usage": {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
            }

    async def extract_insights(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        从对话中提取学习洞察

        Args:
            messages: 对话消息列表 [{"role": "user|assistant", "content": "..."}]

        Returns:
            {
                "insights": {
                    "learning_style": str,
                    "strengths": [str],
                    "weaknesses": [str],
                    "interests": [str],
                    "mood_pattern": str
                }
            }
        """
        try:
            log_info(f"Assistant Agent 开始提取洞察: messages_count={len(messages)}")

            # 构建对话文本
            conversation_parts = []
            for msg in messages:
                role_label = "用户" if msg["role"] == "user" else "助手"
                conversation_parts.append(f"{role_label}: {msg['content']}")
            conversation_text = "\n".join(conversation_parts)

            # 构建请求
            request_text = EXTRACT_INSIGHTS_PROMPT + conversation_text

            # 创建 Agent
            agent = Agent(
                model=get_ai_model(temperature=0),
                instructions="你是一个英语学习分析专家，请严格按照JSON格式返回分析结果。",
                markdown=False
            )

            # 执行分析
            response = await agent.arun(request_text, stream=False)
            raw_response = response.content if hasattr(response, 'content') else str(response)

            # 解析 JSON 响应
            data = parse_json_response(raw_response)

            default_insights = {
                "learning_style": "",
                "strengths": [],
                "weaknesses": [],
                "interests": [],
                "mood_pattern": ""
            }

            insights = {
                "learning_style": data.get("learning_style", default_insights["learning_style"]),
                "strengths": data.get("strengths", default_insights["strengths"]),
                "weaknesses": data.get("weaknesses", default_insights["weaknesses"]),
                "interests": data.get("interests", default_insights["interests"]),
                "mood_pattern": data.get("mood_pattern", default_insights["mood_pattern"]),
            }

            # 确保列表字段是列表类型
            for key in ["strengths", "weaknesses", "interests"]:
                if not isinstance(insights[key], list):
                    insights[key] = [str(insights[key])] if insights[key] else []

            # 确保字符串字段是字符串类型
            for key in ["learning_style", "mood_pattern"]:
                if not isinstance(insights[key], str):
                    insights[key] = str(insights[key]) if insights[key] else ""

            log_info(f"Assistant Agent 洞察提取完成: learning_style={insights['learning_style']}")
            return {"insights": insights}

        except Exception as e:
            log_error(f"Assistant Agent 洞察提取失败: {e}", e)
            return {
                "insights": {
                    "learning_style": "",
                    "strengths": [],
                    "weaknesses": [],
                    "interests": [],
                    "mood_pattern": ""
                }
            }


# 全局实例
assistant_agent = AssistantAgent()
