"""
AI Coach Chat Router
Chat API endpoints for mobile client
"""

import uuid
from typing import Optional

from utils.datetime_utils import now_utc

from fastapi import APIRouter, HTTPException, Query

from common.enums import ScenarioCategory
from config.scenarios import get_all_scenarios, get_scenarios_by_category
from schemas.chat import (
    PrepareSessionRequest, PrepareSessionResponse,
    CreateSessionRequest, SessionResponse,
    ChatRequest, ChatResponse,
    ChatHistoryResponse, UserSessionsResponse,
    DeleteSessionResponse, BatchDeleteRequest, BatchDeleteResponse,
    TranslateRequest, TranslateResponse,
    WordExplanationRequest, WordExplanationResponse,
    ChatMessage, SessionSummary, TokenUsage,
)
from services.english_coach import english_coach
from services.learn_assistant import learn_assistant
from services.word_explanation_agent import word_explanation_agent
from utils.logger import logger


router = APIRouter(prefix="/chat", tags=["AI Coach Chat"])


# ==================== API Endpoints ====================

@router.post("/prepare", response_model=PrepareSessionResponse, summary="预生成系统提示词")
async def prepare_session(request: PrepareSessionRequest):
    """
    预生成系统提示词（用于避免创建会话时超时）
    这个接口会生成系统提示词但不创建会话，返回的system_prompt可以在后续调用/sessions时使用
    """
    try:
        logger.info(f"预生成系统提示词请求: role={request.ai_role}, scenario={request.scenario}")

        # 调用EnglishCoachAgent预生成系统提示词
        result = await english_coach.prepare_system_prompt(
            difficulty_level=request.difficulty_level,
            english_variant=request.english_variant,
            conversation_style=request.conversation_style,
            enable_tips=request.enable_tips,
            scenario=request.scenario,
            ai_role=request.ai_role,
            predefined_scenario_id=request.predefined_scenario_id,
            voice_name=request.voice_name,
            voice_gender=request.voice_gender,
            learned_words=request.learned_words
        )

        # 构建 token_usage
        token_usage_data = result.get("token_usage")
        token_usage = TokenUsage(**token_usage_data) if token_usage_data else None

        if result["success"]:
            logger.info(f"系统提示词生成成功, tokens={token_usage_data.get('total_tokens', 0) if token_usage_data else 0}")
            return PrepareSessionResponse(
                success=True,
                system_prompt=result["system_prompt"],
                token_usage=token_usage
            )
        else:
            logger.error(f"系统提示词生成失败: {result.get('error')}")
            return PrepareSessionResponse(
                success=False,
                error=result.get("error"),
                error_type=result.get("error_type"),
                token_usage=token_usage
            )

    except Exception as e:
        logger.error(f"预生成系统提示词失败: {e}", exc_info=True)
        return PrepareSessionResponse(
            success=False,
            error=str(e),
            error_type="system_error"
        )


@router.post("/sessions", response_model=SessionResponse, summary="创建新的对话会话")
async def create_session(request: CreateSessionRequest):
    """
    创建新的AI对话会话
    支持自定义AI角色、场景和难度等级
    """
    try:
        logger.info(f"创建会话请求: user_id={request.user_id}, role={request.ai_role}, scenario={request.scenario}")

        # 生成会话ID
        session_id = str(uuid.uuid4())

        # 生成会话标题
        session_title = request.session_title or f"{request.ai_role} - {request.scenario}"

        # 使用EnglishCoachAgent创建会话并生成欢迎消息
        # 如果提供了预生成的系统提示词，会跳过生成步骤，加快响应速度
        welcome_result = await english_coach.create_session_with_welcome(
            session_id=session_id,
            user_id=request.user_id,
            difficulty_level=request.difficulty_level,
            english_variant=request.english_variant,
            conversation_style=request.conversation_style,
            enable_tips=request.enable_tips,
            scenario=request.scenario,
            ai_role=request.ai_role,
            predefined_scenario_id=request.predefined_scenario_id,
            prepared_system_prompt=request.prepared_system_prompt,
            voice_id=request.voice_id,
            voice_name=request.voice_name
        )

        # 提取 token_usage
        token_usage_data = welcome_result.pop("token_usage", None)
        token_usage = TokenUsage(**token_usage_data) if token_usage_data else None

        # 创建会话响应
        session_info = {
            "session_id": session_id,
            "user_id": request.user_id,
            "title": session_title,
            "ai_role": request.ai_role,
            "scenario": request.scenario,
            "difficulty_level": request.difficulty_level.value,
            "enable_tips": request.enable_tips,
            "created_at": now_utc().isoformat(),
            "welcome_message": welcome_result,
            "token_usage": token_usage
        }

        logger.info(f"会话创建成功: session_id={session_id}, tokens={token_usage_data.get('total_tokens', 0) if token_usage_data else 0}")
        return SessionResponse(**session_info)

    except Exception as e:
        logger.error(f"创建会话失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"创建会话失败: {str(e)}")


@router.get("/sessions", response_model=UserSessionsResponse, summary="获取用户的会话列表")
async def get_user_sessions(
    user_id: str = Query(..., description="用户ID"),
    limit: int = Query(default=20, ge=1, le=100, description="每页会话数量，最多100条"),
    offset: int = Query(default=0, ge=0, description="偏移量，用于分页")
):
    """
    获取指定用户的所有会话列表
    支持分页查询，按最后更新时间倒序排列
    """
    try:
        logger.info(f"获取用户会话列表请求: user_id={user_id}, limit={limit}, offset={offset}")

        # 调用EnglishCoachAgent获取用户会话列表
        sessions_data = await english_coach.get_user_sessions(
            user_id=user_id,
            limit=limit,
            offset=offset
        )

        # 构造响应
        response = UserSessionsResponse(
            sessions=[SessionSummary(**session) for session in sessions_data["sessions"]],
            total=sessions_data["total"],
            has_more=sessions_data["has_more"]
        )

        logger.info(f"用户会话列表获取成功: user_id={user_id}, 会话数={len(response.sessions)}")
        return response

    except Exception as e:
        logger.error(f"获取用户会话列表失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取用户会话列表失败: {str(e)}")


@router.get("/sessions/{session_id}/messages", response_model=ChatHistoryResponse, summary="获取会话历史消息")
async def get_chat_history(
    session_id: str,
    user_id: str = Query(..., description="用户ID"),
    limit: int = Query(default=20, ge=1, le=100, description="每页消息数量，最多100条"),
    offset: int = Query(default=0, ge=0, description="偏移量，用于分页")
):
    """
    获取指定会话的历史消息
    支持分页查询
    """
    try:
        logger.info(f"获取会话历史请求: session_id={session_id}, user_id={user_id}")

        # 调用EnglishCoachAgent获取历史消息
        history_data = await english_coach.get_chat_history(
            session_id=session_id,
            user_id=user_id,
            limit=limit,
            offset=offset
        )

        # 构造响应
        response = ChatHistoryResponse(
            session_id=session_id,
            messages=[ChatMessage(**msg) for msg in history_data["messages"]],
            total=history_data["total"],
            has_more=history_data["has_more"]
        )

        logger.info(f"会话历史获取成功: session_id={session_id}, 消息数={len(response.messages)}")
        logger.info(f"会话历史: {response.messages}")
        return response

    except Exception as e:
        logger.error(f"获取会话历史失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取会话历史失败: {str(e)}")


@router.post("/sessions/{session_id}/messages", response_model=ChatResponse, summary="发送聊天消息")
async def send_chat_message(
    session_id: str,
    request: ChatRequest,
    user_id: str = Query(..., description="用户ID")
):
    """
    在指定会话中发送消息并获得AI回复
    """
    try:
        logger.info(f"聊天消息请求: session_id={session_id}, user_id={user_id}")

        # 调用EnglishCoachAgent处理聊天
        chat_result = await english_coach.chat(
            session_id=session_id,
            user_id=user_id,
            message=request.message
        )

        # 构建 token_usage
        token_usage_data = chat_result.get("token_usage")
        token_usage = TokenUsage(**token_usage_data) if token_usage_data else None

        # 构造响应
        response = ChatResponse(
            session_id=session_id,
            messages=[ChatMessage(**msg) for msg in chat_result["messages"]],
            response_time=chat_result["response_time"],
            token_usage=token_usage
        )

        logger.info(f"聊天消息处理成功: session_id={session_id}, 响应时间={response.response_time:.2f}s, tokens={token_usage_data.get('total_tokens', 0) if token_usage_data else 0}")
        return response

    except Exception as e:
        logger.error(f"聊天消息处理失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"聊天消息处理失败: {str(e)}")


@router.delete("/sessions/batch", response_model=BatchDeleteResponse, summary="批量删除对话会话")
async def batch_delete_sessions(request: BatchDeleteRequest):
    """
    批量删除对话会话
    只能删除属于当前用户的会话
    """

    try:
        logger.info(f"批量删除会话请求: session_ids={request.session_ids}, user_id={request.user_id}")

        # 调用EnglishCoachAgent批量删除会话
        result = await english_coach.batch_delete_sessions(
            session_ids=request.session_ids,
            user_id=request.user_id
        )

        if result["success"]:
            logger.info(f"批量删除会话成功: deleted_count={result['deleted_count']}")
        else:
            logger.warn(f"批量删除会话失败: message={result['message']}")

        return BatchDeleteResponse(**result)

    except Exception as e:
        logger.error(f"批量删除会话失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"批量删除会话失败: {str(e)}")


@router.delete("/sessions/{session_id}", response_model=DeleteSessionResponse, summary="删除对话会话")
async def delete_session(
    session_id: str,
    user_id: str = Query(..., description="用户ID")
):
    """
    删除指定的对话会话
    只能删除属于当前用户的会话
    """
    try:
        logger.info(f"删除会话请求: session_id={session_id}, user_id={user_id}")

        # 调用EnglishCoachAgent删除会话
        result = await english_coach.delete_session(
            session_id=session_id,
            user_id=user_id
        )

        if result["success"]:
            logger.info(f"会话删除成功: session_id={session_id}")
        else:
            logger.warn(f"会话删除失败: session_id={session_id}, message={result['message']}")

        return DeleteSessionResponse(**result)

    except Exception as e:
        logger.error(f"删除会话失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"删除会话失败: {str(e)}")


@router.get("/scenarios", summary="获取预定义场景列表")
async def get_predefined_scenarios(
    category: Optional[ScenarioCategory] = Query(default=None, description="场景分类筛选")
):
    """
    获取预定义场景列表
    支持按分类筛选
    """
    try:
        if category:
            scenarios = get_scenarios_by_category(category)
        else:
            scenarios = get_all_scenarios()

        # 过滤掉自由对话场景，只返回前端需要的字段
        filtered_scenarios = [
            {
                "id": scenario["id"],
                "title": scenario["title"],
                "category": scenario["category"].value if hasattr(scenario["category"], 'value') else scenario["category"],
                "ai_role": scenario["ai_role"],
                "scenario": scenario["scenario"],
                "description": scenario["description"],
                "image_url": scenario.get("image_url")
            }
            for scenario in scenarios
            if not scenario.get("is_free_mode", False)  # 排除自由对话场景
        ]

        return {
            "scenarios": filtered_scenarios,
            "total": len(filtered_scenarios)
        }
    except Exception as e:
        logger.error(f"获取预定义场景失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取预定义场景失败: {str(e)}")


@router.post("/translate", response_model=TranslateResponse, summary="翻译英文文本")
async def translate_text(request: TranslateRequest):
    """
    翻译英文文本并提供学习点
    返回中文翻译和1-3个值得学习的点
    """
    try:
        logger.info(f"翻译请求: text_length={len(request.text)}")

        # 调用 Learn Assistant（并行处理翻译和学习笔记）
        result = await learn_assistant.process(request.text)

        # 构建 token_usage
        token_usage_data = result.get("token_usage")
        token_usage = TokenUsage(**token_usage_data) if token_usage_data else None

        logger.info(f"翻译完成: translation_length={len(result['translation'])}, notes_length={len(result['notes'])}, tokens={token_usage_data.get('total_tokens', 0) if token_usage_data else 0}")

        return TranslateResponse(
            translation=result["translation"],
            notes=result["notes"],
            token_usage=token_usage
        )

    except Exception as e:
        logger.error(f"翻译失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"翻译失败: {str(e)}")


@router.post("/word/explanation", response_model=WordExplanationResponse, summary="生成单词AI解说")
async def generate_word_explanation(request: WordExplanationRequest):
    """
    根据单词信息生成 AI 解说文稿
    返回适合 TTS 播放的中英混合解说文本
    """
    try:
        logger.info(f"单词解说请求: word={request.word}")

        # 调用 Word Explanation Agent
        result = await word_explanation_agent.generate_explanation(
            word=request.word,
            phonetic=request.phonetic,
            meanings=request.meanings,
            examples=request.examples,
            collocations=request.collocations,
            etymology=request.etymology
        )

        # 构建 token_usage
        token_usage_data = result.get("token_usage")
        token_usage = TokenUsage(**token_usage_data) if token_usage_data else None

        explanation = result.get("explanation", "")

        if explanation:
            logger.info(f"单词解说生成成功: word={request.word}, explanation_length={len(explanation)}, tokens={token_usage_data.get('total_tokens', 0) if token_usage_data else 0}")
            return WordExplanationResponse(
                success=True,
                explanation=explanation,
                token_usage=token_usage
            )
        else:
            logger.error(f"单词解说生成失败: word={request.word}, 返回空内容")
            return WordExplanationResponse(
                success=False,
                error="生成解说失败",
                token_usage=token_usage
            )

    except Exception as e:
        logger.error(f"单词解说生成失败: {e}", exc_info=True)
        return WordExplanationResponse(
            success=False,
            error=str(e)
        )

