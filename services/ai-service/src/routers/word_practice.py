"""单词练习题生成 & 评分 Router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from services.word_practice_agent import generate_word_practices
from services.word_practice_reviewer import review_word_practices
from utils.logger import logger

router = APIRouter(prefix="/word-practice", tags=["word-practice"])


class MeaningItem(BaseModel):
    pos: str = ""
    meaningCn: str = ""
    meaningEn: Optional[str] = None
    exampleEn: Optional[str] = None
    exampleCn: Optional[str] = None


class CollocationItem(BaseModel):
    pattern: str = ""
    examples: Any = []
    meaningCn: Optional[str] = None


class GenerateRequest(BaseModel):
    word: str
    meaningCn: str
    meanings: List[MeaningItem] = []
    collocations: List[CollocationItem] = []


class GenerateResponse(BaseModel):
    questions: List[Dict[str, Any]]


@router.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """为单个单词生成 10 道复习题"""
    try:
        result = await generate_word_practices(
            word=request.word,
            meaning_cn=request.meaningCn,
            meanings=[m.model_dump() for m in request.meanings],
            collocations=[c.model_dump() for c in request.collocations],
        )
        return result
    except Exception as e:
        logger.error(f"生成单词练习题失败: {request.word} - {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 评分相关 ====================


class ReviewRequest(BaseModel):
    word: str
    meaningCn: str
    questions: List[Dict[str, Any]]


class ScoreItem(BaseModel):
    index: int
    score: float
    reason: str = ""


class ReviewResponse(BaseModel):
    scores: List[ScoreItem]


@router.post("/review", response_model=ReviewResponse)
async def review(request: ReviewRequest):
    """对一组练习题进行质量评分"""
    try:
        scores = await review_word_practices(
            word=request.word,
            meaning_cn=request.meaningCn,
            questions=request.questions,
        )
        return {"scores": scores}
    except Exception as e:
        logger.error(f"评分单词练习题失败: {request.word} - {e}")
        raise HTTPException(status_code=500, detail=str(e))
