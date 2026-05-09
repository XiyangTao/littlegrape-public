"""
Assistant API 的 Pydantic 模型定义
"""

from pydantic import BaseModel, Field
from typing import List, Optional


# ==================== 数据模型 ====================

class TokenUsage(BaseModel):
    """Token 使用量"""
    input_tokens: int = Field(default=0, description="输入 tokens")
    output_tokens: int = Field(default=0, description="输出 tokens")
    total_tokens: int = Field(default=0, description="总 tokens")


class AssistantMessage(BaseModel):
    """对话消息"""
    role: str = Field(..., description="消息角色：user 或 assistant")
    content: str = Field(..., description="消息内容")


class LearningInsights(BaseModel):
    """学习洞察"""
    learning_style: str = Field(default="", description="学习风格")
    strengths: List[str] = Field(default_factory=list, description="优势")
    weaknesses: List[str] = Field(default_factory=list, description="弱项")
    interests: List[str] = Field(default_factory=list, description="兴趣")
    mood_pattern: str = Field(default="", description="情绪模式")


# ==================== 请求模型 ====================

class AssistantChatRequest(BaseModel):
    """助手聊天请求"""
    system_prompt: str = Field(..., description="系统提示词")
    history: List[AssistantMessage] = Field(default_factory=list, description="历史对话")
    message: str = Field(..., description="用户消息")


class ExtractInsightsRequest(BaseModel):
    """提取学习洞察请求"""
    messages: List[AssistantMessage] = Field(..., description="对话消息列表")


# ==================== 响应模型 ====================

class AssistantChatResponse(BaseModel):
    """助手聊天响应"""
    reply: str = Field(..., description="助手回复")
    token_usage: TokenUsage = Field(default_factory=TokenUsage, description="Token 使用量")


class ExtractInsightsResponse(BaseModel):
    """提取学习洞察响应"""
    insights: LearningInsights = Field(default_factory=LearningInsights, description="学习洞察")
