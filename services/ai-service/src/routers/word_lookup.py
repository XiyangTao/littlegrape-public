"""英文单词释义 Router — 供名著阅读点词查义兜底"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.word_lookup_agent import lookup_word
from utils.logger import logger

router = APIRouter(prefix="/word-lookup", tags=["word-lookup"])


class LookupRequest(BaseModel):
    word: str


class LookupMeaning(BaseModel):
    pos: Optional[str] = None
    definition: str


class LookupResponse(BaseModel):
    lemma: Optional[str] = None
    phonetic: Optional[str] = None
    partOfSpeech: Optional[str] = None
    meaning: Optional[str] = None
    meanings: List[LookupMeaning] = []
    notes: Optional[str] = None


@router.post("/define", response_model=LookupResponse)
async def define(request: LookupRequest):
    """AI 查词（支持变形、专有名词、词库兜底）"""
    try:
        result = await lookup_word(request.word)
        return result
    except Exception as e:
        logger.error(f"word_lookup define failed: {request.word} - {e}")
        raise HTTPException(status_code=500, detail=str(e))
