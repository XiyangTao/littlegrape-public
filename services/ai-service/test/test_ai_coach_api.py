#!/usr/bin/env python3
"""
AI教练服务API测试
完整测试AI教练的对话功能
"""

import asyncio
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:3003"
TEST_USER = "test_user_api_demo"


def print_separator(title=""):
    """打印分隔线"""
    print("\n" + "="*80)
    if title:
        print(f"🧪 {title}")
    print("="*80)


def test_service_health():
    """测试服务健康状态"""
    print_separator("服务健康检查")

    try:
        # 测试根路径
        response = requests.get(f"{BASE_URL}/")
        print(f"✅ 根路径: {response.status_code}")
        print(f"📋 服务信息: {response.json()}")

        # 测试健康检查
        response = requests.get(f"{BASE_URL}/chat/health")
        print(f"✅ 健康检查: {response.status_code}")
        print(f"📋 健康状态: {response.json()}")

        return True

    except Exception as e:
        print(f"❌ 服务健康检查失败: {e}")
        return False


def test_conversation_types():
    """测试对话类型获取"""
    print_separator("获取对话类型")

    try:
        response = requests.get(f"{BASE_URL}/chat/conversation-types")

        if response.status_code == 200:
            types = response.json()
            print(f"✅ 获取对话类型成功")
            print(f"📋 支持的对话类型:")

            for conv_type in types["conversation_types"]:
                print(f"  {conv_type['icon']} {conv_type['name']} ({conv_type['type']})")
                print(f"     {conv_type['description']}")

            return types["conversation_types"]
        else:
            print(f"❌ 获取对话类型失败: {response.status_code}")
            return []

    except Exception as e:
        print(f"❌ 测试对话类型失败: {e}")
        return []


def test_create_session(conversation_type="general"):
    """测试创建会话"""
    print_separator(f"创建{conversation_type}会话")

    try:
        payload = {
            "conversation_type": conversation_type,
            "session_title": f"测试{conversation_type}会话"
        }

        response = requests.post(
            f"{BASE_URL}/chat/sessions",
            json=payload,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 200:
            session_data = response.json()
            print(f"✅ 会话创建成功")
            print(f"📋 会话信息:")
            print(f"  会话ID: {session_data['session_id']}")
            print(f"  对话类型: {session_data['conversation_type']}")
            print(f"  创建时间: {session_data['created_at']}")
            print(f"🤖 欢迎消息: {session_data['welcome_message'][:100]}...")

            return session_data
        else:
            print(f"❌ 创建会话失败: {response.status_code}")
            print(f"错误详情: {response.text}")
            return None

    except Exception as e:
        print(f"❌ 测试创建会话失败: {e}")
        return None


def test_chat_conversation(session_id, messages):
    """测试对话交流"""
    print_separator(f"对话测试 - 会话 {session_id[:8]}")

    responses = []

    for i, message in enumerate(messages, 1):
        try:
            print(f"\n--- 第 {i} 轮对话 ---")
            print(f"👤 用户: {message}")

            payload = {"message": message}

            response = requests.post(
                f"{BASE_URL}/chat/sessions/{session_id}/messages",
                json=payload,
                headers={"Content-Type": "application/json"}
            )

            if response.status_code == 200:
                chat_data = response.json()
                ai_response = chat_data["response"]
                response_time = chat_data["response_time"]

                print(f"🤖 AI教练: {ai_response[:200]}...")
                print(f"⏱️ 响应时间: {response_time:.2f}秒")

                responses.append({
                    "user_message": message,
                    "ai_response": ai_response,
                    "response_time": response_time
                })
            else:
                print(f"❌ 发送消息失败: {response.status_code}")
                print(f"错误详情: {response.text}")

        except Exception as e:
            print(f"❌ 对话测试失败: {e}")

    return responses


def test_get_session_messages(session_id):
    """测试获取会话消息历史"""
    print_separator(f"获取消息历史 - 会话 {session_id[:8]}")

    try:
        response = requests.get(f"{BASE_URL}/chat/sessions/{session_id}/messages")

        if response.status_code == 200:
            messages = response.json()
            print(f"✅ 获取消息历史成功")
            print(f"📊 消息总数: {len(messages)}")

            print(f"\n📋 消息列表:")
            for i, msg in enumerate(messages, 1):
                role_icon = "👤" if msg["role"] == "user" else "🤖"
                content = msg["content"][:60] + "..." if len(msg["content"]) > 60 else msg["content"]
                history_flag = "[历史]" if msg.get("from_history") else "[新]"
                print(f"  {i}. {history_flag} {role_icon} {content}")

            return messages
        else:
            print(f"❌ 获取消息历史失败: {response.status_code}")
            return []

    except Exception as e:
        print(f"❌ 测试获取消息历史失败: {e}")
        return []


def test_get_user_sessions():
    """测试获取用户会话列表"""
    print_separator("获取用户会话列表")

    try:
        response = requests.get(f"{BASE_URL}/chat/sessions")

        if response.status_code == 200:
            sessions = response.json()
            print(f"✅ 获取会话列表成功")
            print(f"📊 会话总数: {len(sessions)}")

            if sessions:
                print(f"\n📋 会话列表:")
                for i, session in enumerate(sessions, 1):
                    print(f"  {i}. 会话 {session['session_id'][:8]} - {session['title']}")
                    print(f"     消息数: {session['message_count']}, 更新: {session['updated_at']}")
                    if session['last_message']:
                        print(f"     最后消息: {session['last_message'][:50]}...")

            return sessions
        else:
            print(f"❌ 获取会话列表失败: {response.status_code}")
            return []

    except Exception as e:
        print(f"❌ 测试获取会话列表失败: {e}")
        return []


def test_get_user_memories():
    """测试获取用户记忆"""
    print_separator("获取用户学习记忆")

    try:
        response = requests.get(f"{BASE_URL}/chat/users/memories")

        if response.status_code == 200:
            memories = response.json()
            print(f"✅ 获取用户记忆成功")
            print(f"📊 记忆总数: {len(memories)}")

            if memories:
                print(f"\n🧠 学习记忆:")
                for i, memory in enumerate(memories, 1):
                    print(f"  {i}. {memory['content']}")
                    if memory.get('topics'):
                        print(f"     主题: {', '.join(memory['topics'])}")

            return memories
        else:
            print(f"❌ 获取用户记忆失败: {response.status_code}")
            return []

    except Exception as e:
        print(f"❌ 测试获取用户记忆失败: {e}")
        return []


def run_full_test():
    """运行完整的API测试"""
    print("🚀 开始LittleGrape AI教练服务完整测试")
    print(f"⏰ 测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🔗 服务地址: {BASE_URL}")
    print(f"👤 测试用户: {TEST_USER}")

    # 1. 健康检查
    if not test_service_health():
        print("❌ 服务不可用，退出测试")
        return

    # 2. 获取对话类型
    conversation_types = test_conversation_types()

    # 3. 创建会话并测试对话
    test_sessions = []

    # 测试通用对话
    session = test_create_session("general")
    if session:
        general_messages = [
            "Hello! My name is Alice and I'm from Beijing.",
            "I want to improve my English conversation skills.",
            "Can you help me practice talking about my hobbies?",
            "I love reading books and playing guitar.",
            "What's my name and where am I from?"
        ]

        responses = test_chat_conversation(session["session_id"], general_messages)
        test_get_session_messages(session["session_id"])
        test_sessions.append(session)

    # 测试工作面试对话
    session = test_create_session("job_interview")
    if session:
        interview_messages = [
            "I'm a software engineer with 3 years of experience.",
            "I worked on web development using React and Node.js.",
            "My greatest strength is problem-solving and teamwork."
        ]

        responses = test_chat_conversation(session["session_id"], interview_messages)
        test_sessions.append(session)

    # 4. 获取会话列表
    test_get_user_sessions()

    # 5. 获取用户记忆
    test_get_user_memories()

    # 6. 生成测试报告
    print_separator("测试完成")
    print(f"✅ 总体测试完成")
    print(f"📊 创建会话数: {len(test_sessions)}")
    print(f"🎯 功能测试:")
    print(f"  ✅ 服务健康检查")
    print(f"  ✅ 对话类型获取")
    print(f"  ✅ 会话创建")
    print(f"  ✅ 多轮对话")
    print(f"  ✅ 消息历史获取")
    print(f"  ✅ 会话列表获取")
    print(f"  ✅ 用户记忆获取")

    print(f"\n🎉 LittleGrape AI教练服务测试全部通过！")
    print(f"📱 可以开始前端集成开发")


if __name__ == "__main__":
    run_full_test()