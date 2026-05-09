"""精读内容处理 Router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from services.reading_agent import process_article, compress_article, _quality_check, clean_article, analyze_explanation_mapping
from utils.logger import logger

router = APIRouter(prefix="/reading", tags=["reading"])


class CompressArticleRequest(BaseModel):
    title: str
    content: str
    skipQualityCheck: bool = False


class CompressArticleResponse(BaseModel):
    qualified: bool
    compressed: Optional[str] = None
    rejectReason: Optional[str] = None
    level: Optional[str] = None
    category: Optional[str] = None
    originalWordCount: int
    compressedWordCount: int


class QualityCheckRequest(BaseModel):
    title: str
    content: str


class QualityCheckResponse(BaseModel):
    qualified: bool
    level: Optional[str] = None
    category: Optional[str] = None
    rejectReason: Optional[str] = None


@router.post("/quality-check", response_model=QualityCheckResponse)
async def quality_check_article(request: QualityCheckRequest):
    """仅质量筛选 + 难度评级，不改写"""
    try:
        result = await _quality_check(request.title, request.content)
        return result
    except Exception as e:
        logger.error(f"质量筛选失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class CleanArticleRequest(BaseModel):
    title: str
    content: str


class CleanArticleResponse(BaseModel):
    cleanedContent: str
    changed: bool


@router.post("/clean", response_model=CleanArticleResponse)
async def clean_reading_article(request: CleanArticleRequest):
    """AI 文章清洗：去除图片标注、作者信息等无关内容"""
    try:
        result = await clean_article(request.title, request.content)
        return result
    except Exception as e:
        logger.error(f"文章清洗失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compress", response_model=CompressArticleResponse)
async def compress_reading_article(request: CompressArticleRequest):
    """质量筛选 + 改写精炼"""
    try:
        original_word_count = len(request.content.split())
        result = await compress_article(
            title=request.title,
            content=request.content,
            skip_quality_check=request.skipQualityCheck,
        )
        compressed = result.get("compressed", "")
        compressed_word_count = len(compressed.split()) if compressed else 0
        return {
            "qualified": result.get("qualified", True),
            "compressed": compressed,
            "rejectReason": result.get("rejectReason"),
            "level": result.get("level"),
            "category": result.get("category"),
            "originalWordCount": original_word_count,
            "compressedWordCount": compressed_word_count,
        }
    except Exception as e:
        logger.error(f"文章压缩失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ProcessArticleRequest(BaseModel):
    title: str
    content: str
    level: str = "intermediate"  # beginner | intermediate | advanced
    articleIndex: int = 0  # 文章序号，用于教师轮换


class ProcessArticleResponse(BaseModel):
    titleZh: Optional[str] = None
    summary: Optional[str] = None
    summaryZh: Optional[str] = None
    paragraphs: List[Dict[str, Any]]
    keyVocabulary: List[Dict[str, Any]]
    quiz: List[Dict[str, Any]]
    explanationScript: Optional[str] = None
    teacherId: Optional[str] = None
    teacherVoiceId: Optional[str] = None
    pipelineVersion: int = 2


@router.post("/process", response_model=ProcessArticleResponse)
async def process_reading_article(request: ProcessArticleRequest):
    """完整处理一篇文章：多步骤管道 + 多教师角色"""
    try:
        result = await process_article(
            title=request.title,
            content=request.content,
            level=request.level,
            article_index=request.articleIndex,
        )
        return result
    except Exception as e:
        logger.error(f"文章处理失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ExplanationMappingRequest(BaseModel):
    explanationScript: str
    paragraphs: List[Dict[str, Any]]
    title: str = ""


@router.post("/explanation-mapping")
async def get_explanation_mapping(request: ExplanationMappingRequest):
    """分析讲解脚本与原文句子的对应关系（AI 拆句 + 映射）"""
    try:
        result = await analyze_explanation_mapping(
            explanation_script=request.explanationScript,
            paragraphs=request.paragraphs,
            title=request.title,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"讲解映射分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
