#!/usr/bin/env python3
"""
Agno会话管理功能测试
测试目标：
1. 完整历史保留
2. 智能上下文管理
3. 多会话支持
4. 用户隔离
5. 重启持久化
"""

import asyncio
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv

# 加载环境变量
load_dotenv('.env')

from agno.agent import Agent
from agno.db.postgres import PostgresDb
from agno.db.base import SessionType
from agno.models.deepseek import DeepSeek

class AgnoSessionTester:
    """Agno会话管理测试器"""

    def __init__(self):
        # 读取环境变量
        self.deepseek_api_key = os.getenv('DEEPSEEK_API_KEY')
        self.deepseek_model = os.getenv('DEEPSEEK_MODEL', 'deepseek-chat')

        if not self.deepseek_api_key:
            raise ValueError("❌ 未找到DEEPSEEK_API_KEY环境变量")

        # 创建数据库连接（凭据从 TEST_DATABASE_URL 读取，见 .env.test.example）
        self.db_url = os.getenv(
            'TEST_DATABASE_URL',
            'postgresql+psycopg://postgres:postgres@localhost:5432/test_db',
        )
        self.db = PostgresDb(db_url=self.db_url, session_table="agno_session_test")

        print(f"✅ 测试器初始化成功")
        print(f"📊 数据库: {self.db_url}")
        print(f"🤖 模型: {self.deepseek_model}")

    def create_agent(self, user_id: str, session_id: str, num_history_runs: int = 5):
        """创建Agent"""
        model = DeepSeek(id=self.deepseek_model, api_key=self.deepseek_api_key)

        return Agent(
            model=model,
            db=self.db,
            session_id=session_id,
            user_id=user_id,
            add_history_to_context=True,
            num_history_runs=num_history_runs,
            enable_user_memories=True,
            markdown=True
        )

    def get_session_data(self, session_id: str):
        """获取会话数据"""
        try:
            return self.db.get_session(session_id, SessionType.AGENT, deserialize=False)
        except Exception as e:
            print(f"⚠️ 获取会话数据失败: {e}")
            return None

    def get_session_messages(self, session_id: str):
        """正确获取会话消息列表"""
        session_data = self.get_session_data(session_id)
        if not session_data:
            return []

        # 数据存储在runs字段中
        runs = session_data.get('runs', [])
        all_messages = []

        for run in runs:
            messages = run.get('messages', [])
            # 只提取user和assistant消息，过滤system消息
            for msg in messages:
                if msg.get('role') in ['user', 'assistant']:
                    all_messages.append({
                        'role': msg.get('role'),
                        'content': msg.get('content'),
                        'created_at': msg.get('created_at'),
                        'run_id': run.get('run_id')
                    })

        return all_messages

    async def test_basic_conversation(self):
        """测试1: 基础对话功能"""
        print("\n" + "="*60)
        print("📝 测试1: 基础对话功能")
        print("="*60)

        session_id = f"test_basic_{uuid.uuid4().hex[:8]}"
        user_id = "test_user_alice"

        agent = self.create_agent(user_id, session_id)

        # 进行3轮对话
        conversations = [
            "Hello, my name is Alice and I'm 25 years old.",
            "I'm learning English conversation. Can you help me?",
            "What's my name and age?"
        ]

        responses = []
        for i, message in enumerate(conversations, 1):
            print(f"\n--- 第 {i} 轮 ---")
            print(f"用户: {message}")

            response = await agent.arun(message, stream=False)
            response_text = response.content if hasattr(response, 'content') else str(response)
            print(f"AI: {response_text[:100]}...")

            responses.append(response_text)

        # 验证记忆功能
        last_response = responses[-1].lower()
        name_remembered = "alice" in last_response
        age_remembered = "25" in last_response

        print(f"\n✅ 对话完成，共 {len(conversations)} 轮")
        print(f"📊 记住姓名: {'✅' if name_remembered else '❌'}")
        print(f"📊 记住年龄: {'✅' if age_remembered else '❌'}")

        # 检查数据库存储
        messages = self.get_session_messages(session_id)
        print(f"📊 数据库消息数: {len(messages)}")

        return {
            "session_id": session_id,
            "user_id": user_id,
            "conversations": len(conversations),
            "name_remembered": name_remembered,
            "age_remembered": age_remembered,
            "db_messages": len(messages)
        }

    async def test_context_management(self):
        """测试2: 上下文管理（长对话）"""
        print("\n" + "="*60)
        print("📝 测试2: 上下文管理（长对话）")
        print("="*60)

        session_id = f"test_context_{uuid.uuid4().hex[:8]}"
        user_id = "test_user_bob"

        # 创建Agent，只保留最近3轮对话传递给LLM
        agent = self.create_agent(user_id, session_id, num_history_runs=3)

        # 进行8轮对话
        conversations = [
            "Hi, I'm Bob and I like playing basketball.",          # 第1轮 - 应该被"遗忘"（不传递给LLM）
            "My favorite team is Lakers.",                         # 第2轮 - 应该被"遗忘"
            "I also enjoy reading books.",                         # 第3轮 - 边界
            "Science fiction is my favorite genre.",               # 第4轮
            "I read 'Dune' last month.",                          # 第5轮
            "Have you read any good sci-fi books?",               # 第6轮 - 最近3轮开始
            "What about 'Foundation' series?",                    # 第7轮
            "Do you remember my favorite basketball team?"        # 第8轮 - 测试早期信息是否"丢失"
        ]

        responses = []
        for i, message in enumerate(conversations, 1):
            print(f"\n--- 第 {i} 轮 ---")
            print(f"用户: {message}")

            response = await agent.arun(message, stream=False)
            response_text = response.content if hasattr(response, 'content') else str(response)
            print(f"AI: {response_text[:80]}...")

            responses.append(response_text)

        # 检验关键问题：AI是否还记得早期提到的"Lakers"
        last_response = responses[-1].lower()
        lakers_remembered = "lakers" in last_response
        recent_context_works = "dune" in last_response or "sci" in last_response or "foundation" in last_response

        print(f"\n✅ 长对话完成，共 {len(conversations)} 轮")
        print(f"📊 记住Lakers(早期信息): {'✅' if lakers_remembered else '❌ (符合预期，超出上下文限制)'}")
        print(f"📊 记住最近话题: {'✅' if recent_context_works else '❌'}")

        # 检查数据库中是否保存了完整历史
        messages = self.get_session_messages(session_id)
        complete_history_saved = len(messages) >= len(conversations) * 2  # user + assistant
        print(f"📊 数据库完整历史: {'✅' if complete_history_saved else '❌'} ({len(messages)}条消息)")

        return {
            "session_id": session_id,
            "user_id": user_id,
            "total_conversations": len(conversations),
            "early_info_forgotten": not lakers_remembered,  # 应该为True
            "recent_context_works": recent_context_works,
            "complete_history_saved": complete_history_saved,
            "db_messages": len(messages)
        }

    async def test_multi_sessions(self):
        """测试3: 多会话隔离"""
        print("\n" + "="*60)
        print("📝 测试3: 多会话隔离")
        print("="*60)

        user_id = "test_user_charlie"
        session1_id = f"test_session1_{uuid.uuid4().hex[:8]}"
        session2_id = f"test_session2_{uuid.uuid4().hex[:8]}"

        # 创建两个独立的Agent
        agent1 = self.create_agent(user_id, session1_id)
        agent2 = self.create_agent(user_id, session2_id)

        # 会话1: 讨论工作
        print("\n🔸 会话1 - 讨论工作")
        msg1 = "I work as a software engineer at Google."
        response1 = await agent1.arun(msg1, stream=False)
        print(f"会话1 - 用户: {msg1}")
        print(f"会话1 - AI: {response1.content[:60]}...")

        # 会话2: 讨论爱好
        print("\n🔸 会话2 - 讨论爱好")
        msg2 = "I love painting and drawing in my free time."
        response2 = await agent2.arun(msg2, stream=False)
        print(f"会话2 - 用户: {msg2}")
        print(f"会话2 - AI: {response2.content[:60]}...")

        # 测试会话隔离：在会话2中询问会话1的信息
        print("\n🔸 测试会话隔离")
        test_msg = "Do you know where I work?"
        test_response = await agent2.arun(test_msg, stream=False)
        print(f"会话2 - 用户: {test_msg}")
        print(f"会话2 - AI: {test_response.content[:80]}...")

        # 检验隔离效果
        isolation_works = "google" not in test_response.content.lower()

        print(f"\n✅ 多会话测试完成")
        print(f"📊 会话隔离: {'✅' if isolation_works else '❌'}")

        return {
            "user_id": user_id,
            "session1_id": session1_id,
            "session2_id": session2_id,
            "isolation_works": isolation_works
        }

    async def test_user_isolation(self):
        """测试4: 用户隔离"""
        print("\n" + "="*60)
        print("📝 测试4: 用户隔离")
        print("="*60)

        session_id = f"test_isolation_{uuid.uuid4().hex[:8]}"
        user1_id = "test_user_david"
        user2_id = "test_user_emma"

        # 用户1的Agent
        agent1 = self.create_agent(user1_id, f"{session_id}_user1")

        # 用户2的Agent
        agent2 = self.create_agent(user2_id, f"{session_id}_user2")

        # 用户1分享个人信息
        print("\n🔸 用户1分享信息")
        msg1 = "My secret hobby is collecting vintage coins."
        response1 = await agent1.arun(msg1, stream=False)
        print(f"用户1: {msg1}")
        print(f"AI回复: {response1.content[:60]}...")

        # 用户2询问用户1的信息
        print("\n🔸 用户2询问用户1的信息")
        msg2 = "Do you know about anyone's coin collection hobby?"
        response2 = await agent2.arun(msg2, stream=False)
        print(f"用户2: {msg2}")
        print(f"AI回复: {response2.content[:80]}...")

        # 检验用户隔离
        user_isolation_works = "coin" not in response2.content.lower() and "vintage" not in response2.content.lower()

        print(f"\n✅ 用户隔离测试完成")
        print(f"📊 用户隔离: {'✅' if user_isolation_works else '❌'}")

        return {
            "user1_id": user1_id,
            "user2_id": user2_id,
            "user_isolation_works": user_isolation_works
        }

    async def test_persistence_simulation(self):
        """测试5: 持久化模拟（创建新Agent模拟重启）"""
        print("\n" + "="*60)
        print("📝 测试5: 持久化模拟（重启恢复）")
        print("="*60)

        session_id = f"test_persist_{uuid.uuid4().hex[:8]}"
        user_id = "test_user_frank"

        # 第一阶段：创建Agent并进行对话
        print("\n🔸 第一阶段：初始对话")
        agent1 = self.create_agent(user_id, session_id)

        msg1 = "I'm learning to play guitar and my favorite song is 'Hotel California'."
        response1 = await agent1.arun(msg1, stream=False)
        print(f"用户: {msg1}")
        print(f"AI: {response1.content[:60]}...")

        # 获取第一阶段的session数据
        messages_before = len(self.get_session_messages(session_id))
        print(f"📊 第一阶段数据库消息数: {messages_before}")

        # 第二阶段：创建新Agent模拟重启
        print("\n🔸 第二阶段：模拟重启后恢复")
        agent2 = self.create_agent(user_id, session_id)  # 新的Agent实例，相同session_id

        msg2 = "What instrument am I learning and what's my favorite song?"
        response2 = await agent2.arun(msg2, stream=False)
        print(f"用户: {msg2}")
        print(f"AI: {response2.content[:80]}...")

        # 检验持久化恢复
        guitar_remembered = "guitar" in response2.content.lower()
        song_remembered = "hotel california" in response2.content.lower()
        persistence_works = guitar_remembered and song_remembered

        # 获取最终的session数据
        messages_after = len(self.get_session_messages(session_id))

        print(f"\n✅ 持久化测试完成")
        print(f"📊 记住乐器: {'✅' if guitar_remembered else '❌'}")
        print(f"📊 记住歌曲: {'✅' if song_remembered else '❌'}")
        print(f"📊 持久化恢复: {'✅' if persistence_works else '❌'}")
        print(f"📊 最终数据库消息数: {messages_after}")

        return {
            "session_id": session_id,
            "user_id": user_id,
            "persistence_works": persistence_works,
            "guitar_remembered": guitar_remembered,
            "song_remembered": song_remembered,
            "messages_before": messages_before,
            "messages_after": messages_after
        }

    async def test_user_memories(self):
        """测试6: 用户记忆系统"""
        print("\n" + "="*60)
        print("📝 测试6: 用户记忆系统")
        print("="*60)

        session_id = f"test_memory_{uuid.uuid4().hex[:8]}"
        user_id = "test_user_grace"

        agent = self.create_agent(user_id, session_id)

        # 分享多个个人信息
        personal_info = [
            "My name is Grace and I'm from Canada.",
            "I'm a teacher and I love reading mystery novels.",
            "My favorite author is Agatha Christie."
        ]

        for i, info in enumerate(personal_info, 1):
            print(f"\n🔸 分享信息 {i}")
            response = await agent.arun(info, stream=False)
            print(f"用户: {info}")
            print(f"AI: {response.content[:50]}...")

        # 获取用户记忆
        try:
            memories = agent.get_user_memories(user_id=user_id)
            print(f"\n📊 用户记忆数量: {len(memories) if memories else 0}")

            if memories:
                print("📋 记忆内容:")
                for i, memory in enumerate(memories[:5], 1):
                    memory_text = str(memory.memory) if hasattr(memory, 'memory') else str(memory)
                    print(f"  {i}. {memory_text}")

            memories_work = memories and len(memories) > 0

        except Exception as e:
            print(f"❌ 获取用户记忆失败: {e}")
            memories_work = False
            memories = []

        print(f"\n✅ 用户记忆测试完成")
        print(f"📊 记忆系统: {'✅' if memories_work else '❌'}")

        return {
            "session_id": session_id,
            "user_id": user_id,
            "memories_work": memories_work,
            "memory_count": len(memories) if memories else 0
        }

    async def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始Agno会话管理全面测试")
        print(f"⏰ 测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        results = {}

        try:
            # 运行所有测试
            results['basic'] = await self.test_basic_conversation()
            results['context'] = await self.test_context_management()
            results['multi_sessions'] = await self.test_multi_sessions()
            results['user_isolation'] = await self.test_user_isolation()
            results['persistence'] = await self.test_persistence_simulation()
            results['memories'] = await self.test_user_memories()

            # 生成测试报告
            self.generate_test_report(results)

        except Exception as e:
            print(f"❌ 测试过程中发生错误: {e}")
            import traceback
            traceback.print_exc()

    def generate_test_report(self, results):
        """生成测试报告"""
        print("\n" + "="*80)
        print("📊 AGNO会话管理测试报告")
        print("="*80)

        # 统计通过的测试
        passed_tests = []
        failed_tests = []

        # 基础对话测试
        basic = results.get('basic', {})
        if basic.get('name_remembered') and basic.get('age_remembered') and basic.get('db_messages') > 0:
            passed_tests.append("✅ 基础对话功能")
        else:
            failed_tests.append("❌ 基础对话功能")

        # 上下文管理测试
        context = results.get('context', {})
        if context.get('early_info_forgotten') and context.get('recent_context_works') and context.get('complete_history_saved'):
            passed_tests.append("✅ 智能上下文管理")
        else:
            failed_tests.append("❌ 智能上下文管理")

        # 多会话隔离测试
        multi = results.get('multi_sessions', {})
        if multi.get('isolation_works'):
            passed_tests.append("✅ 多会话隔离")
        else:
            failed_tests.append("❌ 多会话隔离")

        # 用户隔离测试
        user_iso = results.get('user_isolation', {})
        if user_iso.get('user_isolation_works'):
            passed_tests.append("✅ 用户隔离")
        else:
            failed_tests.append("❌ 用户隔离")

        # 持久化测试
        persist = results.get('persistence', {})
        if persist.get('persistence_works'):
            passed_tests.append("✅ 持久化恢复")
        else:
            failed_tests.append("❌ 持久化恢复")

        # 用户记忆测试
        memories = results.get('memories', {})
        if memories.get('memories_work'):
            passed_tests.append("✅ 用户记忆系统")
        else:
            failed_tests.append("❌ 用户记忆系统")

        # 打印结果
        print(f"\n🎯 测试结果统计:")
        print(f"通过: {len(passed_tests)}/6")
        print(f"失败: {len(failed_tests)}/6")

        print(f"\n✅ 通过的测试:")
        for test in passed_tests:
            print(f"  {test}")

        if failed_tests:
            print(f"\n❌ 失败的测试:")
            for test in failed_tests:
                print(f"  {test}")

        # 详细结果
        print(f"\n📋 详细测试数据:")
        for test_name, test_result in results.items():
            print(f"\n🔸 {test_name.upper()}:")
            for key, value in test_result.items():
                print(f"  {key}: {value}")

        # 总结
        success_rate = len(passed_tests) / 6 * 100
        print(f"\n🏆 总体成功率: {success_rate:.1f}%")

        if success_rate >= 80:
            print("🎉 Agno会话管理功能测试通过！适合用于LittleGrape项目。")
        else:
            print("⚠️ 部分功能存在问题，需要进一步调查。")

async def main():
    """主函数"""
    try:
        tester = AgnoSessionTester()
        await tester.run_all_tests()
    except Exception as e:
        print(f"❌ 测试初始化失败: {e}")
        print("请检查:")
        print("1. PostgreSQL是否运行 (docker ps | grep postgres)")
        print("2. DEEPSEEK_API_KEY是否配置")
        print("3. 网络连接是否正常")

if __name__ == "__main__":
    asyncio.run(main())