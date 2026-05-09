"""练习题生成 Router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from services.exercise_agent import generate_exercise, explain_exercise, adventure_respond
from utils.logger import logger

router = APIRouter(prefix="/exercise", tags=["exercise"])


class ExerciseRequest(BaseModel):
    exercise_type: str
    topic: str = "daily life"
    difficulty: str = "medium"
    count: int = 1


class ExerciseResponse(BaseModel):
    questions: List[Dict[str, Any]]


class ExplainRequest(BaseModel):
    question: Dict[str, Any]
    is_correct: bool = False


class ExplainResponse(BaseModel):
    explanation: str


class AdventureRequest(BaseModel):
    scenario_title: str
    character: str
    objectives: List[str] = []
    conversation_history: List[Dict[str, str]] = []


class AdventureResponse(BaseModel):
    response: str
    completedObjectives: List[int] = []


@router.post("/generate", response_model=ExerciseResponse)
async def generate(request: ExerciseRequest):
    """生成练习题"""
    try:
        result = await generate_exercise(
            exercise_type=request.exercise_type,
            topic=request.topic,
            difficulty=request.difficulty,
            count=request.count,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"生成练习题失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/explain", response_model=ExplainResponse)
async def explain(request: ExplainRequest):
    """解释练习题答案"""
    try:
        result = await explain_exercise(
            question=request.question,
            is_correct=request.is_correct,
        )
        return result
    except Exception as e:
        logger.error(f"解释练习题失败: {e}")
        return ExplainResponse(explanation="解释生成失败，请稍后重试")


@router.post("/adventure/respond", response_model=AdventureResponse)
async def adventure(request: AdventureRequest):
    """冒险场景对话"""
    try:
        result = await adventure_respond(
            scenario_title=request.scenario_title,
            character=request.character,
            objectives=request.objectives,
            conversation_history=request.conversation_history,
        )
        return result
    except Exception as e:
        logger.error(f"冒险场景对话失败: {e}")
        return AdventureResponse(
            response="I'm sorry, could you say that again?",
            completedObjectives=[],
        )
