"""AI Service FastAPI Application"""
import importlib.metadata
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from config.settings import settings
from routers.chat import router as chat_router
from routers.story import router as story_router
from routers.assistant import router as assistant_router
from routers.sentence import router as sentence_router
from routers.grammar import router as grammar_router
from routers.exercise import router as exercise_router
from routers.word_practice import router as word_practice_router
from routers.word_lookup import router as word_lookup_router
from routers.reading import router as reading_router
from routers.companion_mem0 import router as companion_mem0_router
from routers.classics import router as classics_router
from utils.logger import logger, log_info

def get_version() -> str:
    """Get version from pyproject.toml"""
    try:
        return importlib.metadata.version("littlegrape-ai-service")
    except importlib.metadata.PackageNotFoundError:
        return "1.0.0"


def create_app() -> FastAPI:
    """Create and configure FastAPI application"""

    version = get_version()

    app = FastAPI(
        title="LittleGrape AI Service",
        description="AI-powered English learning service with Agno framework",
        version=version,
        docs_url="/docs",
        redoc_url="/redoc"
    )

    # CORS middleware - 配置基于环境
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(chat_router)
    app.include_router(story_router)
    app.include_router(assistant_router)
    app.include_router(companion_mem0_router)
    app.include_router(sentence_router)
    app.include_router(grammar_router)
    app.include_router(exercise_router)
    app.include_router(word_practice_router)
    app.include_router(word_lookup_router)
    app.include_router(reading_router)
    app.include_router(classics_router)

    return app


# Create application instance
app = create_app()


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    log_info("Health check endpoint")
    return {
        "service": "ai-service",
        "status": "healthy",
        "version": get_version()
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "LittleGrape AI Service",
        "message": "AI service is running",
        "version": get_version(),
        "docs": "/docs"
    }


if __name__ == "__main__":
    import sys
    import logging

    # 解析命令行参数
    reload_mode = "--reload" in sys.argv

    # 配置uvicorn使用我们的日志格式
    uvicorn_logger = logging.getLogger("uvicorn")
    uvicorn_access_logger = logging.getLogger("uvicorn.access")

    # 清除uvicorn默认的handlers
    uvicorn_logger.handlers.clear()
    uvicorn_access_logger.handlers.clear()

    # 防止日志传播，避免重复
    uvicorn_logger.propagate = False
    uvicorn_access_logger.propagate = False

    # 让uvicorn使用我们已经配置好的全局logger
    from utils.logger import logger

    # 只添加到主uvicorn logger，access logger继承
    for handler in logger.handlers:
        uvicorn_logger.addHandler(handler)
        uvicorn_access_logger.addHandler(handler)

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=reload_mode,
        access_log=False,
        log_level="info",
        log_config=None,  # 禁用uvicorn默认日志配置
    )