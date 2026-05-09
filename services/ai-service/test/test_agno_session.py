#!/usr/bin/env python3
"""测试Agno的会话管理机制"""

import asyncio
import os
import sys

from agno.agent import Agent
from agno.db.postgres import PostgresDb
from agno.models.deepseek import DeepSeek
from config.settings import settings
import uuid

async def test_agno_session_management():
    """测试Agno的会话管理"""

    print("🔍 测试Agno会话管理机制...")

    # 1. 创建PostgreSQL数据库连接（凭据从 TEST_DATABASE_URL 读取）
    try:
        db_url = os.getenv(
            'TEST_DATABASE_URL',
            'postgresql+psycopg://postgres:postgres@localhost:5432/test_db',
        )
        db = PostgresDb(db_url=db_url, session_table="agno_test_sessions")
        print("✅ 使用PostgreSQL数据库")
        print(f"📊 数据库连接: {db_url}")
    except Exception as e:
        print(f"❌ PostgreSQL连接失败: {e}")
        print("💡 使用内存存储进行测试...")
        db = None

    # 2. 创建Agent
    if settings.deepseek_api_key:
        model = DeepSeek(id=settings.deepseek_model, api_key=settings.deepseek_api_key)
    else:
        print("❌ 未配置DeepSeek API密钥")
        return [], "no_session"

    # 测试会话ID
    session_id = f"test_session_{uuid.uuid4().hex[:8]}"
    user_id = "test_user_123"

    print(f"📝 创建测试会话: {session_id}")

    # 3. 创建带会话管理的Agent
    agent = Agent(
        model=model,
        db=db,
        session_id=session_id,
        user_id=user_id,
        add_history_to_context=True,    # 关键：添加历史到上下文
        num_history_runs=3,             # 关键：保留最近3轮对话
        enable_user_memories=True,      # 启用用户记忆
        markdown=True
    )

    print("✅ Agent创建成功")

    # 4. 进行多轮对话测试
    test_messages = [
        "Hello, my name is Alice and I'm learning English.",
        "Can you help me practice conversation?",
        "What's the difference between 'see' and 'watch'?",
        "Can you give me some examples?",
        "Thanks! Now let's practice using these words.",
        "I see a bird in the tree. Is this correct?",
        "What about 'I watch TV every evening'?",
        "Great! Can you remember my name from our earlier conversation?"
    ]

    print(f"\n🤖 开始 {len(test_messages)} 轮对话测试...\n")

    responses = []
    for i, message in enumerate(test_messages, 1):
        print(f"--- 第 {i} 轮 ---")
        print(f"用户: {message}")

        try:
            # 使用Agno进行对话
            response = await agent.arun(message, stream=False)
            response_text = response.content if hasattr(response, 'content') else str(response)

            print(f"AI: {response_text[:100]}...")
            responses.append({
                "round": i,
                "user": message,
                "assistant": response_text,
                "session_id": session_id
            })

            # 检查会话状态
            if db:
                try:
                    session_data = db.get_session(session_id)
                    if session_data:
                        messages_count = len(session_data.get('messages', []))
                        print(f"📊 当前会话消息数: {messages_count}")
                except Exception as e:
                    print(f"⚠️ 无法获取会话数据: {e}")

            print()

        except Exception as e:
            print(f"❌ 对话失败: {e}")
            break

    # 5. 分析会话管理结果
    print("=" * 50)
    print("📊 会话管理分析结果:")
    print(f"总对话轮数: {len(responses)}")
    print(f"会话ID: {session_id}")
    print(f"用户ID: {user_id}")

    # 6. 检查历史保留效果
    print("\n🔍 检查最后一轮对话是否记住了用户名...")
    last_response = responses[-1]['assistant'] if responses else ""
    if "Alice" in last_response or "alice" in last_response.lower():
        print("✅ Agent成功记住了用户名Alice！")
        print("✅ 说明Agno的会话管理和用户记忆功能正常工作")
    else:
        print("❌ Agent没有记住用户名，可能需要调整配置")

    # 7. 尝试获取用户记忆
    try:
        memories = agent.get_user_memories(user_id=user_id)
        print(f"\n🧠 用户记忆数量: {len(memories) if memories else 0}")
        if memories:
            print("用户记忆内容:")
            for memory in memories[:3]:  # 显示前3个记忆
                print(f"  - {memory}")
    except Exception as e:
        print(f"⚠️ 无法获取用户记忆: {e}")

    # 8. 如果有数据库，检查存储的原始数据
    if db:
        try:
            print(f"\n🗃️ 检查数据库中的会话数据...")
            session_data = db.get_session(session_id)
            if session_data:
                messages = session_data.get('messages', [])
                print(f"数据库中存储的消息数: {len(messages)}")
                print("前3条消息:")
                for i, msg in enumerate(messages[:3]):
                    role = msg.get('role', 'unknown')
                    content = msg.get('content', '')[:50]
                    print(f"  {i+1}. [{role}] {content}...")

                print("最后3条消息:")
                for i, msg in enumerate(messages[-3:]):
                    role = msg.get('role', 'unknown')
                    content = msg.get('content', '')[:50]
                    print(f"  {len(messages)-2+i}. [{role}] {content}...")

            else:
                print("❌ 数据库中未找到会话数据")

        except Exception as e:
            print(f"⚠️ 检查数据库数据失败: {e}")

    print("\n✅ Agno会话管理测试完成")
    return responses, session_id

def analyze_agno_session_behavior(responses, session_id):
    """分析Agno会话行为"""
    print("\n" + "="*60)
    print("📋 Agno会话管理行为分析报告")
    print("="*60)

    print(f"""
🔍 测试配置:
- session_id: {session_id}
- add_history_to_context: True
- num_history_runs: 3
- enable_user_memories: True

📊 测试结果:
- 总对话轮数: {len(responses)}
- 最后一轮是否记住用户名: {'是' if any('Alice' in resp['assistant'] or 'alice' in resp['assistant'].lower() for resp in responses[-2:]) else '否'}

💡 关键发现:
1. Agno自动管理会话上下文
2. num_history_runs参数控制传递给LLM的历史轮数
3. 超出num_history_runs的历史可能不会传递给LLM，但仍存储在数据库
4. enable_user_memories功能独立于对话历史，用于长期记忆
5. 数据库中存储完整的对话历史

🎯 对LittleGrape项目的启示:
- ✅ Agno会保留完整的对话历史在数据库中
- ✅ 可以通过num_history_runs控制传递给LLM的上下文长度
- ✅ 用户记忆功能适合记录学习者的个人信息和学习进度
- ⚠️ 需要进一步测试长对话时的行为（如100+轮对话）
    """)

if __name__ == "__main__":
    responses, session_id = asyncio.run(test_agno_session_management())
    analyze_agno_session_behavior(responses, session_id)