"""
Companion Chat API 的 Pydantic 模型定义
"""

from pydantic import BaseModel, Field
from typing import Any, List, Optional, Dict


class TokenUsage(BaseModel):
    input_tokens: int = Field(default=0)
    output_tokens: int = Field(default=0)
    total_tokens: int = Field(default=0)


# ==================== Init ====================

class InitThreadRequest(BaseModel):
    session_id: str = Field(..., description="Agno session UUID")
    user_id: str = Field(..., description="用户 ID")
    character_id: str = Field(..., description="角色 ID (mia, alex 等)")
    core_memories: List[Dict[str, str]] = Field(default_factory=list, description="长期记忆列表")


class InitThreadResponse(BaseModel):
    success: bool = True
    message_id: str
    role: str = "assistant"
    content: str
    translation: str = ""
    timestamp: str
    token_usage: TokenUsage


# ==================== Chat ====================

class CompanionChatRequest(BaseModel):
    session_id: str = Field(..., description="Agno session UUID")
    user_id: str = Field(..., description="用户 ID")
    character_id: str = Field(..., description="角色 ID")
    message: str = Field(..., description="用户消息")
    core_memories: List[Dict[str, str]] = Field(default_factory=list)
    recent_summaries: List[str] = Field(default_factory=list)


class CompanionChatResponse(BaseModel):
    success: bool = True
    message_id: str
    role: str = "assistant"
    content: str
    translation: str = ""
    tips: str = ""
    timestamp: str
    response_time: float = 0
    token_usage: TokenUsage


# ==================== History ====================

class HistoryMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[Any] = None  # Agno 返回 int（unix），也可能是 str


class CompanionHistoryRequest(BaseModel):
    session_id: str
    user_id: str
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class CompanionHistoryResponse(BaseModel):
    success: bool = True
    messages: List[HistoryMessage]
    total: int
    has_more: bool


# ==================== Memory Extraction ====================

class MemoryExtractionRequest(BaseModel):
    character_name: str
    recent_messages: List[Dict[str, str]]


class MemoryItem(BaseModel):
    key: str
    value: str


class MemoryExtractionResponse(BaseModel):
    success: bool = True
    facts: List[MemoryItem] = Field(default_factory=list)
    relationship_events: List[MemoryItem] = Field(default_factory=list)
    english_notes: List[MemoryItem] = Field(default_factory=list)
