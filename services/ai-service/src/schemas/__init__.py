"""
Pydantic 模型定义
"""

from .chat import (
    # 请求模型
    PrepareSessionRequest,
    CreateSessionRequest,
    ChatRequest,
    BatchDeleteRequest,
    # 响应模型
    PrepareSessionResponse,
    SessionResponse,
    ChatResponse,
    ChatHistoryResponse,
    UserSessionsResponse,
    DeleteSessionResponse,
    BatchDeleteResponse,
    # 数据模型
    ChatMessage,
    SessionSummary,
)

__all__ = [
    # 请求
    "PrepareSessionRequest",
    "CreateSessionRequest",
    "ChatRequest",
    "BatchDeleteRequest",
    # 响应
    "PrepareSessionResponse",
    "SessionResponse",
    "ChatResponse",
    "ChatHistoryResponse",
    "UserSessionsResponse",
    "DeleteSessionResponse",
    "BatchDeleteResponse",
    # 数据
    "ChatMessage",
    "SessionSummary",
]
