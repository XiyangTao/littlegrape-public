"""Story Practice — API Router

Endpoints:
- GET /story/episodes/{episode_id}  — 返回 episode JSON 配置
- POST /story/evaluate              — 对话题在线评估
"""

import json
import re
from typing import Dict, Any

from fastapi import APIRouter, HTTPException
from agno.agent import Agent

from config.stories import get_episode
from config.prompts.story_prompts import CONVERSATION_EVALUATOR_SYSTEM
from schemas.story import EvaluateRequest, EvaluateResponse, CorrectionItem, TokenUsage
from utils.ai_helpers import get_ai_model
from utils.logger import log_info, log_error


router = APIRouter(prefix="/story", tags=["story"])


@router.get("/episodes/{episode_id}")
async def get_episode_config(episode_id: str):
    """获取 episode 完整配置"""
    episode = get_episode(episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail=f"Episode not found: {episode_id}")
    return episode


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_conversation(request: EvaluateRequest):
    """对话题评估：单次调用，同时判断目标达成 + 表达质量"""
    log_info(f"Story evaluate: goal='{request.goal[:50]}', answer='{request.user_answer[:50]}'")

    eval_request = f"""## Goal
{request.goal}

## Expected Answer (reference)
"{request.expected_answer}"

## User's Answer
"{request.user_answer}"

Evaluate this response."""

    token_usage = None
    try:
        model = get_ai_model(temperature=0)
        agent = Agent(
            model=model,
            instructions=CONVERSATION_EVALUATOR_SYSTEM,
            markdown=False,
        )
        response = await agent.arun(eval_request, stream=False)
        raw = response.content if hasattr(response, "content") else str(response)
        result = _parse_json(raw)

        # 提取 token 使用信息（与其他 agent 统一模式）
        metrics = getattr(response, 'metrics', None)
        token_usage_data = {
            "input_tokens": getattr(metrics, 'input_tokens', 0) if metrics else 0,
            "output_tokens": getattr(metrics, 'output_tokens', 0) if metrics else 0,
            "total_tokens": getattr(metrics, 'total_tokens', 0) if metrics else 0,
        }
        token_usage = TokenUsage(**token_usage_data) if token_usage_data.get('total_tokens') else None
    except Exception as e:
        log_error(f"Evaluation failed: {e}", e)
        result = {
            "achieved": True,
            "score": 5,
            "feedback": "评估暂时不可用，继续加油！",
            "corrections": [],
            "highlights": [],
        }

    return EvaluateResponse(
        achieved=result.get("achieved", False),
        feedback=result.get("feedback", ""),
        score=min(max(result.get("score", 5), 1), 10),
        corrections=[
            CorrectionItem(**c) for c in result.get("corrections", [])
            if isinstance(c, dict) and "original" in c and "corrected" in c
        ],
        highlights=result.get("highlights", []),
        summary=result.get("summary", ""),
        token_usage=token_usage,
    )


def _parse_json(raw: str) -> Dict[str, Any]:
    """解析 AI 响应中的 JSON"""
    raw = raw.strip()
    if "```" in raw:
        match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw, re.DOTALL)
        if match:
            raw = match.group(1)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(raw[start:end + 1])
            except json.JSONDecodeError:
                pass
        log_error(f"JSON parse failed: {raw[:200]}")
        return {}
