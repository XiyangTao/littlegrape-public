"""语法学习 Router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from services.grammar_agent import generate_explanation, generate_practice, generate_lesson_practice
from utils.logger import logger

router = APIRouter(prefix="/grammar", tags=["grammar"])


class ExplanationRequest(BaseModel):
    name_zh: str
    name_en: str
    difficulty: str = "intermediate"


class ExplanationResponse(BaseModel):
    explanation: str
    examples: list = []


class PracticeRequest(BaseModel):
    name_zh: str
    name_en: str
    difficulty: str = "intermediate"
    count: int = 10


class PracticeQuestion(BaseModel):
    type: str
    question: str
    options: Optional[List[str]] = None
    answer: str
    explanation: str = ""


class PracticeResponse(BaseModel):
    questions: List[PracticeQuestion]


class LessonPracticeRequest(BaseModel):
    name_zh: str
    name_en: str
    difficulty: str = "intermediate"


class LessonQuestion(BaseModel):
    type: str
    cognitiveLevel: str = "recognition"
    question: str = ""
    options: Optional[List[str]] = None
    answer: str
    answer2: Optional[str] = None
    explanation: str = ""
    errorPart: Optional[str] = None
    correctVersion: Optional[str] = None
    sentence1: Optional[str] = None
    sentence2: Optional[str] = None
    tableData: Optional[Dict[str, Any]] = None
    words: Optional[List[str]] = None
    distractors: Optional[List[str]] = None
    structureHint: Optional[str] = None
    acceptableAnswers: Optional[List[str]] = None
    smartTip: Optional[Dict[str, Any]] = None


class LessonPracticeResponse(BaseModel):
    questions: List[LessonQuestion]


@router.post("/explanation", response_model=ExplanationResponse)
async def get_explanation(request: ExplanationRequest):
    """生成语法点 AI 讲解"""
    try:
        result = await generate_explanation(
            name_zh=request.name_zh,
            name_en=request.name_en,
            difficulty=request.difficulty,
        )
        return result
    except Exception as e:
        logger.error(f"生成语法讲解失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/practice", response_model=PracticeResponse)
async def get_practice(request: PracticeRequest):
    """生成语法练习题"""
    try:
        result = await generate_practice(
            name_zh=request.name_zh,
            name_en=request.name_en,
            difficulty=request.difficulty,
            count=request.count,
        )
        return result
    except Exception as e:
        logger.error(f"生成语法练习题失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lesson-practice", response_model=LessonPracticeResponse)
async def get_lesson_practice(request: LessonPracticeRequest):
    """生成课程式练习题（8 种题型，按认知层级分组）"""
    try:
        result = await generate_lesson_practice(
            name_zh=request.name_zh,
            name_en=request.name_en,
            difficulty=request.difficulty,
        )
        return result
    except Exception as e:
        logger.error(f"生成课程练习题失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
