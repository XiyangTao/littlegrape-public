"""AI 造句评估 Router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.sentence_agent import evaluate_sentence
from utils.logger import logger

router = APIRouter(prefix="/sentence", tags=["sentence"])


class SentenceEvalRequest(BaseModel):
    word: str
    meaning_cn: str
    sentence: str


class SentenceEvalResponse(BaseModel):
    grammar_score: int
    usage_score: int
    natural_score: int
    overall_score: int
    feedback: str
    improved_sentence: str


@router.post("/evaluate", response_model=SentenceEvalResponse)
async def evaluate(request: SentenceEvalRequest):
    """评估用户造句"""
    try:
        result = await evaluate_sentence(
            word=request.word,
            meaning_cn=request.meaning_cn,
            user_sentence=request.sentence,
        )
        return result
    except Exception as e:
        logger.error(f"造句评估失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
