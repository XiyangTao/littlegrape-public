"""AI Service Essential Configuration"""

import os
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings
from typing import Optional


def find_env_file() -> str:
    """
    查找项目根目录的 .env 文件
    从当前工作目录开始向上查找，直到找到包含 .env 文件的目录
    """
    current_dir = Path.cwd()

    # 向上查找，直到找到 .env 文件或到达根目录
    while current_dir != current_dir.parent:
        env_file = current_dir / '.env'
        if env_file.exists():
            return str(env_file)
        current_dir = current_dir.parent

    # 如果没找到，返回当前目录的 .env
    return '.env'


class Settings(BaseSettings):
    """Essential AI model configuration"""

    # Service Configuration
    ai_service_port: int = Field(default=3001, description="AI Service port")
    runtime_env: str = Field(default="development", description="Runtime environment")

    # Database Configuration
    postgres_host: str = Field(default="localhost", description="PostgreSQL host")
    postgres_port: int = Field(default=5432, description="PostgreSQL port")
    postgres_db: str = Field(default="littlegrape", description="PostgreSQL database name")
    postgres_user: str = Field(default="littlegrape_admin", description="PostgreSQL user")
    postgres_password: str = Field(default="your_db_password", description="PostgreSQL password")

    # OpenAI Configuration
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API key")

    # DeepSeek Configuration
    deepseek_api_key: Optional[str] = Field(default=None, description="DeepSeek API key")
    deepseek_model: str = Field(default="deepseek-chat", description="Default DeepSeek model")

    # DashScope (Aliyun Bailian) Configuration — for embedding
    dashscope_api_key: Optional[str] = Field(default=None, description="DashScope API key for embedding")

    # Logging
    log_level: str = Field(default="info", description="Log level")

    def get_database_url(self) -> str:
        """获取数据库连接URL"""
        return f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    @property
    def port(self) -> int:
        """获取服务端口，向后兼容"""
        return self.ai_service_port

    @property
    def environment(self) -> str:
        """获取环境，向后兼容"""
        return self.runtime_env

    class Config:
        env_file = find_env_file()  # 动态查找项目根目录的 .env 文件
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"  # 忽略额外的环境变量


# Global settings instance
settings = Settings()