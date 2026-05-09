"""Professional logging configuration with daily rotation"""

import logging
import logging.handlers
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

from config.settings import settings


class ColoredFormatter(logging.Formatter):
    """Colored formatter for console output"""

    COLORS = {
        'DEBUG': '\033[36m',     # Cyan
        'INFO': '\033[32m',      # Green
        'WARNING': '\033[33m',   # Yellow
        'ERROR': '\033[31m',     # Red
        'CRITICAL': '\033[35m',  # Magenta
    }
    RESET = '\033[0m'

    def format(self, record):
        # 根据logger名称确定服务标识
        if hasattr(record, 'service'):
            service = record.service
        elif record.name.startswith('uvicorn'):
            service = 'uvicorn'
        else:
            service = 'ai-service'

        level_color = self.COLORS.get(record.levelname, '')
        reset_color = self.RESET

        # Format: timestamp [service] LEVEL: message
        formatted_time = datetime.fromtimestamp(record.created, tz=timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M:%S')
        message = f"{formatted_time} [{service}] {level_color}{record.levelname}{reset_color}: {record.getMessage()}"

        # 添加堆栈信息（如果有的话）
        if record.exc_info:
            message += "\n" + self.formatException(record.exc_info)

        return message


class CustomFormatter(logging.Formatter):
    """Custom formatter for file output"""

    def format(self, record):
        # 根据logger名称确定服务标识
        if hasattr(record, 'service'):
            service = record.service
        elif record.name.startswith('uvicorn'):
            service = 'uvicorn'
        else:
            service = 'ai-service'

        # Format: timestamp [service] LEVEL: message
        formatted_time = datetime.fromtimestamp(record.created, tz=timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M:%S')
        message = f"{formatted_time} [{service}] {record.levelname.upper()}: {record.getMessage()}"

        # 添加堆栈信息（如果有的话）
        if record.exc_info:
            message += "\n" + self.formatException(record.exc_info)

        return message


def setup_logger() -> logging.Logger:
    """Setup professional logger with daily rotation"""

    logger = logging.getLogger("ai-service")

    # 避免重复配置
    if logger.handlers:
        return logger

    # 设置日志级别
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logger.setLevel(log_level)

    # 确保日志目录存在
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    # 创建文件格式化器
    file_formatter = CustomFormatter()

    # 错误日志 - 按日期滚动
    error_handler = logging.handlers.TimedRotatingFileHandler(
        filename=log_dir / "error.log",
        when="midnight",
        interval=1,
        backupCount=30,  # 保留30天
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(file_formatter)
    error_handler.suffix = "%Y-%m-%d"  # 备份文件名格式

    # 综合日志 - 按日期滚动
    general_handler = logging.handlers.TimedRotatingFileHandler(
        filename=log_dir / "ai-service.log",
        when="midnight",
        interval=1,
        backupCount=30,  # 保留30天
        encoding='utf-8'
    )
    general_handler.setLevel(log_level)
    general_handler.setFormatter(file_formatter)
    general_handler.suffix = "%Y-%m-%d"  # 备份文件名格式

    # 添加文件处理器
    logger.addHandler(error_handler)
    logger.addHandler(general_handler)

    # 在非生产环境下输出到控制台
    if settings.runtime_env != 'production':
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(log_level)
        console_handler.setFormatter(ColoredFormatter())
        logger.addHandler(console_handler)

    # 防止日志传播到根logger
    logger.propagate = False

    return logger

# Global logger instance
logger = setup_logger()

# 结构化日志方法
def log_info(message: str):
    """Log info level message"""
    extra = {'service': 'ai-service'}
    logger.info(message, extra=extra)

def log_error(message: str, error: Optional[Exception] = None):
    """Log error level message with optional error"""
    extra = {'service': 'ai-service'}
    if error:
        # 直接把error信息加到message中
        message += f" - Error: {str(error)} ({type(error).__name__})"
    logger.error(message, extra=extra, exc_info=error if error else None)

def log_warn(message: str):
    """Log warning level message"""
    extra = {'service': 'ai-service'}
    logger.warning(message, extra=extra)

def log_debug(message: str):
    """Log debug level message"""
    extra = {'service': 'ai-service'}
    logger.debug(message, extra=extra)