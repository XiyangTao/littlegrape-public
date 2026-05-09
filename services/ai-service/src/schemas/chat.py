"""
Chat API 的 Pydantic 模型定义
"""

from pydantic import BaseModel, Field
from typing import List, Optional

from common.enums import DifficultyLevel, EnglishVariant, ConversationStyle


# ==================== 数据模型 ====================

class TokenUsage(BaseModel):
    """Token 使用量"""
    input_tokens: int = Field(default=0, description="输入 tokens")
    output_tokens: int = Field(default=0, description="输出 tokens")
    total_tokens: int = Field(default=0, description="总 tokens")


class ChatMessage(BaseModel):
    """聊天消息"""
    message_id: str = Field(..., description="消息唯一ID")
    role: str = Field(..., description="消息角色：user 或 assistant")
    content: str = Field(..., description="消息内容")
    tips: Optional[str] = Field(default=None, description="学习建议（仅user消息有）")
    score: Optional[int] = Field(default=None, description="用户英语评分1-10（仅user消息有）")
    timestamp: str = Field(..., description="消息时间戳")


class SessionSummary(BaseModel):
    """会话摘要"""
    session_id: str = Field(..., description="会话ID")
    user_id: str = Field(..., description="用户ID")
    scenario: str = Field(..., description="对话场景")
    ai_role: str = Field(..., description="AI角色")
    difficulty_level: str = Field(..., description="难度等级")
    english_variant: str = Field(default="", description="英语变体")
    conversation_style: str = Field(default="", description="对话风格")
    enable_tips: bool = Field(default=True, description="是否启用学习建议")
    predefined_scenario_id: Optional[str] = Field(default=None, description="预定义场景ID")
    voice_id: Optional[str] = Field(default=None, description="语音ID")
    voice_name: Optional[str] = Field(default=None, description="语音名称")
    message_count: int = Field(default=0, description="消息数量")
    created_at: Optional[str] = Field(default=None, description="创建时间")
    updated_at: Optional[str] = Field(default=None, description="最后更新时间")


# ==================== 请求模型 ====================

class PrepareSessionRequest(BaseModel):
    """预生成系统提示词请求"""
    predefined_scenario_id: Optional[str] = Field(
        default=None,
        description="预定义场景ID，如果提供则使用预定义场景"
    )
    ai_role: str = Field(
        default="English Teacher",
        description="AI角色描述",
        max_length=200
    )
    scenario: str = Field(
        default="General English Conversation",
        description="对话场景描述",
        max_length=500
    )
    difficulty_level: DifficultyLevel = Field(
        default=DifficultyLevel.CET4,
        description="难度等级"
    )
    english_variant: EnglishVariant = Field(
        default=EnglishVariant.AMERICAN,
        description="英语变体"
    )
    conversation_style: ConversationStyle = Field(
        default=ConversationStyle.CASUAL,
        description="对话风格"
    )
    enable_tips: bool = Field(default=True, description="是否启用学习建议")
    voice_id: Optional[str] = Field(default=None, description="TTS语音ID")
    voice_name: Optional[str] = Field(default=None, description="TTS语音名称")
    voice_gender: Optional[str] = Field(default=None, description="TTS语音性别")
    learned_words: Optional[list] = Field(default=None, description="用户最近学过的单词列表，最多30个")


class CreateSessionRequest(BaseModel):
    """创建会话请求"""
    user_id: str = Field(..., description="用户ID")
    session_title: Optional[str] = Field(default=None, description="会话标题")
    predefined_scenario_id: Optional[str] = Field(default=None, description="预定义场景ID")
    ai_role: str = Field(default="English Teacher", description="AI角色描述", max_length=200)
    scenario: str = Field(default="General English Conversation", description="对话场景描述", max_length=500)
    difficulty_level: DifficultyLevel = Field(default=DifficultyLevel.CET4, description="难度等级")
    english_variant: EnglishVariant = Field(default=EnglishVariant.AMERICAN, description="英语变体")
    conversation_style: ConversationStyle = Field(default=ConversationStyle.CASUAL, description="对话风格")
    enable_tips: bool = Field(default=True, description="是否启用学习建议")
    voice_id: Optional[str] = Field(default=None, description="TTS语音ID")
    voice_name: Optional[str] = Field(default=None, description="TTS语音名称")
    voice_gender: Optional[str] = Field(default=None, description="TTS语音性别")
    prepared_system_prompt: str = Field(..., description="预生成的系统提示词")


class ChatRequest(BaseModel):
    """聊天请求"""
    message: str = Field(..., description="用户消息内容", min_length=1, max_length=1000)


class BatchDeleteRequest(BaseModel):
    """批量删除会话请求"""
    session_ids: List[str] = Field(..., description="要删除的会话ID列表", min_length=1)
    user_id: str = Field(..., description="用户ID")


class TranslateRequest(BaseModel):
    """翻译请求"""
    text: str = Field(..., description="要翻译的英文文本", min_length=1, max_length=2000)


class WordExplanationRequest(BaseModel):
    """单词解说请求"""
    word: str = Field(..., description="单词", min_length=1, max_length=100)
    phonetic: Optional[str] = Field(default="", description="音标")
    meanings: List[dict] = Field(default=[], description="义项列表")
    examples: Optional[List[dict]] = Field(default=None, description="例句列表")
    collocations: Optional[List[str]] = Field(default=None, description="搭配列表")
    etymology: Optional[dict] = Field(default=None, description="词源信息")


# ==================== 响应模型 ====================

class PrepareSessionResponse(BaseModel):
    """预生成系统提示词响应"""
    success: bool = Field(..., description="是否成功")
    system_prompt: Optional[str] = Field(default=None, description="生成的系统提示词")
    error: Optional[str] = Field(default=None, description="错误信息")
    error_type: Optional[str] = Field(default=None, description="错误类型")
    token_usage: Optional[TokenUsage] = Field(default=None, description="Token 使用量")


class SessionResponse(BaseModel):
    """会话响应"""
    session_id: str = Field(..., description="会话ID")
    user_id: str = Field(..., description="用户ID")
    title: str = Field(..., description="会话标题")
    ai_role: str = Field(..., description="AI角色")
    scenario: str = Field(..., description="对话场景")
    difficulty_level: str = Field(..., description="难度等级")
    enable_tips: bool = Field(..., description="是否启用学习建议")
    created_at: str = Field(..., description="创建时间")
    welcome_message: ChatMessage = Field(..., description="欢迎消息")
    token_usage: Optional[TokenUsage] = Field(default=None, description="Token 使用量")


class ChatResponse(BaseModel):
    """聊天响应"""
    session_id: str = Field(..., description="会话ID")
    messages: List[ChatMessage] = Field(..., description="本轮对话消息")
    response_time: float = Field(..., description="响应时间（秒）")
    token_usage: Optional[TokenUsage] = Field(default=None, description="Token 使用量")


class ChatHistoryResponse(BaseModel):
    """聊天历史响应"""
    session_id: str = Field(..., description="会话ID")
    messages: List[ChatMessage] = Field(..., description="历史消息列表")
    total: int = Field(..., description="总消息数量")
    has_more: bool = Field(..., description="是否还有更多消息")


class UserSessionsResponse(BaseModel):
    """用户会话列表响应"""
    sessions: List[SessionSummary] = Field(..., description="会话列表")
    total: int = Field(..., description="总会话数量")
    has_more: bool = Field(..., description="是否还有更多会话")


class DeleteSessionResponse(BaseModel):
    """删除会话响应"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")


class BatchDeleteResponse(BaseModel):
    """批量删除会话响应"""
    success: bool = Field(..., description="是否成功")
    deleted_count: int = Field(..., description="成功删除的会话数量")
    message: str = Field(..., description="响应消息")


class TranslateResponse(BaseModel):
    """翻译响应"""
    translation: str = Field(..., description="中文翻译")
    notes: str = Field(default="", description="学习点说明")
    token_usage: Optional[TokenUsage] = Field(default=None, description="Token 使用量")


class WordExplanationResponse(BaseModel):
    """单词解说响应"""
    success: bool = Field(..., description="是否成功")
    explanation: str = Field(default="", description="解说文稿")
    error: Optional[str] = Field(default=None, description="错误信息")
    token_usage: Optional[TokenUsage] = Field(default=None, description="Token 使用量")


# ==================== Story Mode 模型 ====================

class StoryReview(BaseModel):
    """剧情回顾数据"""
    grade: str = Field(..., description="评级 S/A/B/C/D")
    average_score: float = Field(..., description="平均评分")
    character_evaluation: str = Field(..., description="角色风格评价")
    total_rounds: int = Field(..., description="对话总轮次")
    tips: List[str] = Field(default=[], description="学习建议汇总")


class StoryDirective(BaseModel):
    """剧情控制指令（返回给客户端的结构化数据）"""
    current_segment: int = Field(..., description="当前段落索引")
    total_segments: int = Field(..., description="总段落数")
    segment_title: str = Field(..., description="当前段落标题（中文）")
    narrator: Optional[str] = Field(default=None, description="旁白文本（有值时客户端显示旁白气泡）")
    episode_complete: bool = Field(default=False, description="本集是否结束")
    review: Optional[StoryReview] = Field(default=None, description="回顾数据（结束时有值）")


class CreateStorySessionRequest(BaseModel):
    """创建剧情会话请求"""
    user_id: str = Field(..., description="用户ID")
    episode_id: str = Field(..., description="剧集ID，如 mia_ep1")
    difficulty_level: DifficultyLevel = Field(default=DifficultyLevel.CET4, description="难度等级")
    voice_id: Optional[str] = Field(default=None, description="TTS 语音ID")
    voice_name: Optional[str] = Field(default=None, description="TTS 语音名称")


class StorySessionResponse(BaseModel):
    """创建剧情会话响应"""
    session_id: str = Field(..., description="会话ID")
    episode_id: str = Field(..., description="剧集ID")
    welcome_message: ChatMessage = Field(..., description="欢迎消息")
    story_directive: StoryDirective = Field(..., description="剧情控制指令")
    token_usage: Optional[TokenUsage] = Field(default=None, description="Token 使用量")


class StoryChatResponse(BaseModel):
    """剧情聊天响应"""
    session_id: str = Field(..., description="会话ID")
    messages: List[ChatMessage] = Field(..., description="本轮对话消息")
    story_directive: StoryDirective = Field(..., description="剧情控制指令")
    response_time: float = Field(..., description="响应时间（秒）")
    token_usage: Optional[TokenUsage] = Field(default=None, description="Token 使用量")
