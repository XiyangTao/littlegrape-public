#!/usr/bin/env python3
"""
测试Agno历史上下文管理的详细机制
"""

import os
import time
import json
from agno.agent import Agent
from agno.db.postgres import PostgresDb
from agno.models.openai import OpenAIChat

def test_history_context_behavior():
    """测试add_history_to_context和num_history_runs的具体行为"""

    # 数据库连接配置（凭据从 TEST_DATABASE_URL 读取，见 .env.test.example）
    db_url = os.getenv(
        'TEST_DATABASE_URL',
        'postgresql+psycopg://postgres:postgres@localhost:5432/test_db',
    )
    db = PostgresDb(db_url=db_url, session_table="test_history_context")

    print("=== 测试1：add_history_to_context=False ===")
    agent1 = Agent(
        model=OpenAIChat(id="gpt-4o-mini"),
        db=db,
        session_id="no_history_session",
        add_history_to_context=False,
        instructions="你是助手A，请记住用户说的内容。"
    )

    agent1.run("我的名字是张三")
    response = agent1.run("你还记得我的名字吗？")
    print(f"无历史上下文响应: {response.content}")

    print("\n=== 测试2：add_history_to_context=True, num_history_runs=1 ===")
    agent2 = Agent(
        model=OpenAIChat(id="gpt-4o-mini"),
        db=db,
        session_id="limited_history_session",
        add_history_to_context=True,
        num_history_runs=1,
        instructions="你是助手B，请记住用户说的内容。"
    )

    agent2.run("我的名字是李四")
    agent2.run("我今年25岁")
    agent2.run("我住在北京")
    response = agent2.run("请告诉我关于我的所有信息")
    print(f"限制历史上下文响应: {response.content}")

    print("\n=== 测试3：add_history_to_context=True, num_history_runs=3 ===")
    agent3 = Agent(
        model=OpenAIChat(id="gpt-4o-mini"),
        db=db,
        session_id="full_history_session",
        add_history_to_context=True,
        num_history_runs=3,
        instructions="你是助手C，请记住用户说的内容。"
    )

    agent3.run("我的名字是王五")
    agent3.run("我今年30岁")
    agent3.run("我住在上海")
    agent3.run("我是软件工程师")
    response = agent3.run("请告诉我关于我的所有信息")
    print(f"完整历史上下文响应: {response.content}")

    print("\n=== 测试4：检查实际发送给LLM的消息 ===")
    # 这里我们需要查看AgentSession中的实际消息
    from agno.db.base import SessionType

    for session_id, desc in [
        ("limited_history_session", "限制历史"),
        ("full_history_session", "完整历史")
    ]:
        session_data = db.get_session(
            session_id=session_id,
            session_type=SessionType.AGENT,
            deserialize=True
        )

        if session_data and session_data.runs:
            last_run = session_data.runs[-1]
            print(f"\n{desc}会话的最后一次运行消息数: {len(last_run.messages or [])}")

            for i, msg in enumerate(last_run.messages or []):
                from_history = getattr(msg, 'from_history', False)
                print(f"  消息{i+1}: {msg.role} - 来自历史: {from_history} - {msg.content[:30]}...")

    print("\n=== 测试5：超长对话测试上下文截断 ===")
    agent4 = Agent(
        model=OpenAIChat(id="gpt-4o-mini"),
        db=db,
        session_id="long_conversation",
        add_history_to_context=True,
        num_history_runs=2,
        instructions="你是助手D，简短回答即可。"
    )

    # 进行10轮对话
    for i in range(10):
        response = agent4.run(f"这是第{i+1}条消息，请简单确认收到")
        print(f"第{i+1}轮: {response.content[:50]}...")

    # 检查最后的运行包含多少历史消息
    session_data = db.get_session(
        session_id="long_conversation",
        session_type=SessionType.AGENT,
        deserialize=True
    )

    if session_data and session_data.runs:
        last_run = session_data.runs[-1]
        history_messages = [msg for msg in (last_run.messages or []) if getattr(msg, 'from_history', False)]
        current_messages = [msg for msg in (last_run.messages or []) if not getattr(msg, 'from_history', False)]

        print(f"\n长对话最后运行统计:")
        print(f"  历史消息数: {len(history_messages)}")
        print(f"  当前消息数: {len(current_messages)}")
        print(f"  总消息数: {len(last_run.messages or [])}")

    return {
        'no_history_works': 'no_history_session',
        'limited_history_works': 'limited_history_session',
        'full_history_works': 'full_history_session',
        'long_conversation_works': 'long_conversation'
    }

if __name__ == "__main__":
    try:
        results = test_history_context_behavior()
        print(f"\n=== 测试完成，所有会话ID ===")
        for key, session_id in results.items():
            print(f"{key}: {session_id}")

    except Exception as e:
        print(f"测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()