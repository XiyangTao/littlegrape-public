"""
Assistant Router
学习助手 API 端点
"""

from fastapi import APIRouter

from schemas.assistant import (
    AssistantChatRequest, AssistantChatResponse,
    ExtractInsightsRequest, ExtractInsightsResponse,
    TokenUsage, LearningInsights,
)
from services.assistant_agent import assistant_agent
from utils.logger import logger


router = APIRouter(prefix="/assistant", tags=["Learning Assistant"])


@router.post("/chat", response_model=AssistantChatResponse, summary="助手聊天")
async def assistant_chat(request: AssistantChatRequest):
    """
    与学习助手进行对话
    支持系统提示词、历史对话上下文和用户消息
    """
    try:
        logger.info(f"助手聊天请求: history_count={len(request.history)}, message_length={len(request.message)}")

        # 转换 history 为 dict 列表
        history = [{"role": msg.role, "content": msg.content} for msg in request.history]

        # 调用 Assistant Agent
        result = await assistant_agent.chat(
            system_prompt=request.system_prompt,
            history=history,
            message=request.message
        )

        token_usage_data = result.get("token_usage", {})
        token_usage = TokenUsage(**token_usage_data)

        logger.info(f"助手聊天完成: reply_length={len(result.get('reply', ''))}, tokens={token_usage.total_tokens}")

        return AssistantChatResponse(
            reply=result.get("reply", ""),
            token_usage=token_usage
        )

    except Exception as e:
        logger.error(f"助手聊天失败: {e}", exc_info=True)
        return AssistantChatResponse(
            reply="",
            token_usage=TokenUsage()
        )


@router.post("/extract-insights", response_model=ExtractInsightsResponse, summary="提取学习洞察")
async def extract_insights(request: ExtractInsightsRequest):
    """
    分析对话内容，提取用户的学习特征和洞察
    包括学习风格、优势、弱项、兴趣和情绪模式
    """
    try:
        logger.info(f"提取洞察请求: messages_count={len(request.messages)}")

        # 转换 messages 为 dict 列表
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]

        # 调用 Assistant Agent
        result = await assistant_agent.extract_insights(messages)

        insights_data = result.get("insights", {})
        insights = LearningInsights(**insights_data)

        logger.info(f"洞察提取完成: learning_style={insights.learning_style}")

        return ExtractInsightsResponse(insights=insights)

    except Exception as e:
        logger.error(f"洞察提取失败: {e}", exc_info=True)
        return ExtractInsightsResponse(insights=LearningInsights())
