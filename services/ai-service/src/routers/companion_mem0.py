"""
Companion Mem0 Router — 基于 Mem0 记忆层的 AI 对话 API

独立于现有 /companion 路由，用于 A/B 验证。
所有接口与现有 companion 格式兼容，方便前端切换。
"""

import asyncio
from fastapi import APIRouter, HTTPException

from schemas.companion_mem0 import (
    Mem0InitRequest, Mem0InitResponse,
    Mem0ChatRequest, Mem0ChatResponse,
    Mem0MemoriesRequest, Mem0MemoriesResponse,
    MemoryEntry,
)
from services.companion_mem0_agent import companion_mem0_agent
from services.english_tips_agent import english_tips_agent
from utils.logger import logger


router = APIRouter(prefix="/companion-mem0", tags=["Companion Mem0"])


@router.post("/init", response_model=Mem0InitResponse, summary="初始化 Mem0 伙伴线程")
async def init_thread(request: Mem0InitRequest):
    """
    创建对话 + 生成欢迎消息
    使用 Mem0 检索历史记忆生成个性化开场白
    """
    try:
        result = await companion_mem0_agent.init_thread(
            user_id=request.user_id,
            character_id=request.character_id,
        )
        return Mem0InitResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Init mem0 companion thread failed: {e}")
        raise HTTPException(status_code=500, detail="初始化 Mem0 伙伴线程失败")


@router.post("/chat", response_model=Mem0ChatResponse, summary="发送消息 (Mem0)")
async def chat(request: Mem0ChatRequest):
    """
    发送消息并获取 AI 回复
    - Gateway 从 DB 加载 recent_messages 传入
    - Mem0 语义搜索相关记忆
    - 并行调用 Chat + Tips
    - 异步学习新记忆
    """
    try:
        # 从 request 中获取对话历史（Gateway 从 DB 加载传入）
        # 过滤非法 role：OpenAI 兼容 API 只接受 user / assistant / system，
        # 这里历史只该是 user/assistant；system 异常不应出现在历史里
        ALLOWED_HISTORY_ROLES = ("user", "assistant")
        recent_messages = []
        for m in request.recent_messages:
            if m.role not in ALLOWED_HISTORY_ROLES:
                logger.warning(f"[Mem0Chat] skip history with invalid role={m.role!r}")
                continue
            recent_messages.append({"role": m.role, "content": m.content or ""})

        # Tips 上下文：取最近 6 条
        recent_context = recent_messages[-6:]

        # 并行调用：Chat Agent + Tips Agent
        async def safe_tips():
            try:
                return await english_tips_agent.evaluate(
                    user_message=request.message,
                    recent_context=recent_context,
                )
            except Exception as e:
                logger.error(f"Tips evaluation failed: {e}")
                return ""

        chat_result, tips = await asyncio.gather(
            companion_mem0_agent.chat(
                user_id=request.user_id,
                character_id=request.character_id,
                message=request.message,
                recent_messages=recent_messages,
            ),
            safe_tips(),
        )

        chat_result["tips"] = tips or ""
        return Mem0ChatResponse(**chat_result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Mem0 companion chat failed: {e}")
        raise HTTPException(status_code=500, detail="聊天失败")


@router.post("/memories", response_model=Mem0MemoriesResponse, summary="查看 Mem0 记忆")
async def get_memories(request: Mem0MemoriesRequest):
    """
    查看 Mem0 中存储的所有记忆（调试/对比用）
    可以看到 Mem0 自动提取了哪些记忆
    """
    try:
        memories = await companion_mem0_agent.get_memories(
            user_id=request.user_id,
            character_id=request.character_id,
        )
        return Mem0MemoriesResponse(
            memories=[MemoryEntry(**m) for m in memories],
            total=len(memories),
        )
    except Exception as e:
        logger.error(f"Get mem0 memories failed: {e}")
        raise HTTPException(status_code=500, detail="获取记忆失败")
