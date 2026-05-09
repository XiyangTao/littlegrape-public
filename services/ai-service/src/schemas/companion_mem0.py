"""
Companion Mem0 API 的 Pydantic 模型定义

与现有 companion schema 独立，去掉 Agno session 依赖，
简化为 user_id + character_id 标识对话。
"""

from pydantic import BaseModel, Field
from typing import Any, List, Optional, Dict


class TokenUsage(BaseModel):
    input_tokens: int = Field(default=0)
    output_tokens: int = Field(default=0)
    total_tokens: int = Field(default=0)


# ==================== Init ====================

class Mem0InitRequest(BaseModel):
    user_id: str = Field(..., description="用户 ID")
    character_id: str = Field(..., description="角色 ID (mia, alex 等)")


class Mem0InitResponse(BaseModel):
    success: bool = True
    message_id: str
    role: str = "assistant"
    content: str
    translation: str = ""
    timestamp: str
    token_usage: TokenUsage


# ==================== Chat ====================

class RecentMessage(BaseModel):
    role: str
    content: str


class Mem0ChatRequest(BaseModel):
    user_id: str = Field(..., description="用户 ID")
    character_id: str = Field(..., description="角色 ID")
    message: str = Field(..., description="用户消息")
    recent_messages: List[RecentMessage] = Field(default_factory=list, description="最近对话历史，由 Gateway 从 DB 加载传入")


class Mem0ChatResponse(BaseModel):
    success: bool = True
    message_id: str
    role: str = "assistant"
    content: str
    translation: str = ""
    tips: str = ""
    timestamp: str
    response_time: float = 0
    token_usage: TokenUsage
    memories_used: int = Field(default=0, description="本次使用的 Mem0 记忆数量")


# ==================== History ====================

class HistoryMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[Any] = None


class Mem0HistoryRequest(BaseModel):
    user_id: str
    character_id: str
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class Mem0HistoryResponse(BaseModel):
    success: bool = True
    messages: List[HistoryMessage]
    total: int
    has_more: bool


# ==================== Memories (调试) ====================

class Mem0MemoriesRequest(BaseModel):
    user_id: str
    character_id: str


class MemoryEntry(BaseModel):
    id: str = ""
    memory: str = ""
    created_at: str = ""
    updated_at: str = ""


class Mem0MemoriesResponse(BaseModel):
    success: bool = True
    memories: List[MemoryEntry] = Field(default_factory=list)
    total: int = 0
