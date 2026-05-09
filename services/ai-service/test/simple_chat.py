"""Simple Chat using Agno Framework - 基于Agno官方例子实现"""

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.models.anthropic import Claude
from agno.models.deepseek import DeepSeek
from agno.models.siliconflow import Siliconflow
from config.settings import settings
from utils.logger import logger
from typing import Dict, Any, Optional
from textwrap import dedent
import asyncio


def create_chat_agent() -> Optional[Agent]:
    """创建聊天Agent"""
    try:
        model = None

        # 按优先级尝试不同的AI提供商
        if settings.deepseek_api_key:
            logger.info(f"初始化DeepSeek模型: {settings.deepseek_model}")
            model = DeepSeek(
                id=settings.deepseek_model,
                api_key=settings.deepseek_api_key
            )
        elif settings.siliconflow_api_key:
            logger.info(f"初始化SiliconFlow模型: {settings.siliconflow_model}")
            logger.info(f"SiliconFlow base_url: {settings.siliconflow_base_url}")
            model = Siliconflow(
                id=settings.siliconflow_model,
                api_key=settings.siliconflow_api_key,
                base_url=settings.siliconflow_base_url
            )
        elif settings.anthropic_api_key:
            logger.info(f"初始化Claude模型: {settings.anthropic_model}")
            model = Claude(
                id=settings.anthropic_model,
                api_key=settings.anthropic_api_key
            )
        elif settings.openai_api_key:
            logger.info(f"初始化OpenAI模型: {settings.openai_model}")
            model = OpenAIChat(
                id=settings.openai_model,
                api_key=settings.openai_api_key
            )
        else:
            logger.error("未配置任何AI模型API密钥")
            return None

        # 创建Agent - 基于Agno官方例子的简单实现
        agent = Agent(
            model=model,
            markdown=True
        )

        logger.info("聊天Agent创建成功")
        return agent

    except Exception as e:
        logger.error(f"创建Agent失败: {e}")
        return None


async def chat_with_agent(agent: Agent, message: str) -> Dict[str, Any]:
    """与Agent对话"""
    try:
        logger.info(f"处理消息: {message[:50]}...")

        # 使用Agno Agent进行对话
        response = await agent.arun(message)

        return {
            "success": True,
            "response": response.content if hasattr(response, 'content') else str(response),
            "model_used": agent.model.id if agent.model else "unknown"
        }

    except Exception as e:
        logger.error(f"对话处理失败: {e}")
        return {
            "success": False,
            "error": str(e)
        }


# 测试函数
async def test_chat():
    """测试聊天功能"""
    print("🤖 创建聊天Agent...")
    agent = create_chat_agent()

    if not agent:
        print("❌ Agent创建失败，请检查API密钥配置")
        return

    print("✅ Agent创建成功！")
    print("\n开始测试对话...")

    test_messages = [
        "Hello, how are you?",
        "Can you help me practice English?",
        "What's the weather like today?"
    ]

    for i, message in enumerate(test_messages, 1):
        print(f"\n--- 测试 {i} ---")
        print(f"用户: {message}")

        result = await chat_with_agent(agent, message)

        if result["success"]:
            print(f"AI: {result['response']}")
            print(f"模型: {result['model_used']}")
        else:
            print(f"❌ 错误: {result['error']}")


if __name__ == "__main__":
    # 运行测试
    asyncio.run(test_chat())