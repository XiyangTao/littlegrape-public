"""
测试系统提示词生成和质量评估
"""

import sys
import os
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(project_root))

from config.scenarios import format_system_prompt
from common.enums import DifficultyLevel, EnglishVariant, ConversationStyle
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.models.deepseek import DeepSeek
from config.settings import settings


def get_evaluation_model():
    """获取用于评估的AI模型"""
    if settings.deepseek_api_key:
        return DeepSeek(
            id=settings.deepseek_model,
            api_key=settings.deepseek_api_key
        )
    elif settings.openai_api_key:
        return OpenAIChat(
            api_key=settings.openai_api_key
        )
    else:
        raise ValueError("未配置AI模型API密钥")


def evaluate_system_prompt(system_prompt: str, config: dict) -> dict:
    """
    使用AI评估系统提示词的质量

    Args:
        system_prompt: 生成的系统提示词
        config: 配置信息（难度、变体、风格等）

    Returns:
        评估结果字典
    """
    model = get_evaluation_model()

    tips_status = "启用" if config['enable_tips'] else "禁用"

    evaluator_instructions = """你是一个专业的AI提示词工程评估专家。
你的任务是评估英语学习对话系统的系统提示词质量。

请从以下维度评估系统提示词（每项满分10分）：

1. **清晰度** (1-10分)
   - 指令是否明确、具体、易于理解
   - JSON格式要求是否清晰
   - ai_message和tips字段的语言和长度要求是否明确

2. **完整性** (1-10分)
   - 是否涵盖了所有必要的指导要素
   - 难度、变体、风格的要求是否详细
   - 响应格式要求是否完整

3. **可执行性** (1-10分)
   - AI是否能够根据提示词准确执行
   - 是否有足够的示例和反例
   - JSON输出格式是否AI能准确遵守

4. **一致性** (1-10分)
   - 各部分要求是否相互协调（难度与风格、习语使用等）
   - 是否有矛盾或冲突的指令
   - Tips启用/禁用状态是否与其他部分一致

5. **安全性** (1-10分)
   - 是否有明确的安全和内容限制
   - 引导话术是否恰当

**重点检查项：**
- ai_message 必须是纯英文，长度合理(≤150词)
- tips 必须是中文(可含英文示例)，长度合理(≤120中文字符)
- Tips功能状态必须明确(当前配置: """ + tips_status + """)
- 难度级别与对话风格的协调性

请输出JSON格式的评估结果：
```json
{
  "scores": {
    "clarity": 分数,
    "completeness": 分数,
    "executability": 分数,
    "consistency": 分数,
    "safety": 分数
  },
  "total_score": 总分(满分50),
  "strengths": ["优点1", "优点2", "优点3"],
  "weaknesses": ["不足1", "不足2"],
  "suggestions": ["改进建议1", "改进建议2"],
  "overall_assessment": "总体评价(2-3句话)"
}
```"""

    evaluator = Agent(
        model=model,
        instructions=evaluator_instructions,
        markdown=False
    )

    evaluation_request = f"""请评估以下系统提示词的质量：

## 配置信息
- 场景类型: {config.get('scenario', '自由对话')}
- 难度等级: {config['difficulty']}
- 英语变体: {config['variant']}
- 对话风格: {config['style']}
- 学习建议(Tips): {tips_status}

## 系统提示词内容
```
{system_prompt}
```

请按照评估维度进行详细分析，特别注意JSON格式要求、长度限制、Tips功能状态是否清晰明确。"""

    # 同步运行评估
    import asyncio
    loop = asyncio.get_event_loop()
    response = loop.run_until_complete(evaluator.arun(evaluation_request, stream=False))

    return response.content if hasattr(response, 'content') else str(response)


def test_free_conversation_prompt():
    """测试自由对话场景的系统提示词生成"""

    print("=" * 80)
    print("系统提示词生成与评估测试")
    print("=" * 80)
    print()

    # 测试配置 - 扩大覆盖面
    test_configs = [
        # 基础难度测试
        {
            "name": "入门级 + 美式 + 休闲 + Tips启用",
            "difficulty": DifficultyLevel.STARTER,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.CASUAL,
            "enable_tips": True
        },
        {
            "name": "初级 + 英式 + 休闲 + Tips禁用",
            "difficulty": DifficultyLevel.ELEMENTARY,
            "variant": EnglishVariant.BRITISH,
            "style": ConversationStyle.CASUAL,
            "enable_tips": False
        },
        # 中等难度测试
        {
            "name": "CET4 + 美式 + 休闲 + Tips启用",
            "difficulty": DifficultyLevel.CET4,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.CASUAL,
            "enable_tips": True
        },
        {
            "name": "CET4 + 英式 + 正式 + Tips启用",
            "difficulty": DifficultyLevel.CET4,
            "variant": EnglishVariant.BRITISH,
            "style": ConversationStyle.FORMAL,
            "enable_tips": True
        },
        # 高难度测试
        {
            "name": "CET6 + 美式 + 俚语 + Tips启用",
            "difficulty": DifficultyLevel.CET6,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.SLANG,
            "enable_tips": True
        },
        {
            "name": "高级 + 英式 + 正式 + Tips禁用",
            "difficulty": DifficultyLevel.IELTS7_TEM8,
            "variant": EnglishVariant.BRITISH,
            "style": ConversationStyle.FORMAL,
            "enable_tips": False
        },
        {
            "name": "高级 + 美式 + 休闲 + Tips启用",
            "difficulty": DifficultyLevel.IELTS7_TEM8,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.CASUAL,
            "enable_tips": True
        },
        # 母语级测试
        {
            "name": "母语级 + 美式 + 俚语 + Tips禁用",
            "difficulty": DifficultyLevel.NATIVE,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.SLANG,
            "enable_tips": False
        }
    ]

    # 测试所有配置组合，充分覆盖各种场景
    for i, config in enumerate(test_configs, 1):
        print(f"\n{'=' * 80}")
        print(f"测试 {i}/{len(test_configs)}: {config['name']}")
        print(f"{'=' * 80}\n")

        # 生成系统提示词
        print("🔧 生成系统提示词...")
        system_prompt = format_system_prompt(
            scenario_id=None,  # 自由对话
            difficulty_level=config['difficulty'],
            english_variant=config['variant'],
            conversation_style=config['style'],
            enable_tips=config['enable_tips']
        )

        # 打印系统提示词（前500字符预览）
        print("\n📝 系统提示词预览（前500字符）:")
        print("-" * 80)
        print(system_prompt[:500] + "...\n" if len(system_prompt) > 500 else system_prompt + "\n")
        print(f"提示词总长度: {len(system_prompt)} 字符")
        print("-" * 80)

        # 保存完整提示词到文件
        output_dir = Path(__file__).parent / "output"
        output_dir.mkdir(exist_ok=True)

        filename = f"prompt_{config['difficulty'].value}_{config['variant'].value}_{config['style'].value}.txt"
        output_file = output_dir / filename

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"配置: {config['name']}\n")
            f.write("=" * 80 + "\n\n")
            f.write(system_prompt)

        print(f"\n💾 完整提示词已保存到: {output_file}")

        # AI评估
        print("\n🤖 AI评估中...")
        try:
            evaluation = evaluate_system_prompt(system_prompt, config)
            print("\n📊 评估结果:")
            print("-" * 80)
            print(evaluation)
            print("-" * 80)

            # 保存评估结果
            eval_file = output_dir / f"evaluation_{config['difficulty'].value}_{config['variant'].value}_{config['style'].value}.json"
            with open(eval_file, 'w', encoding='utf-8') as f:
                f.write(evaluation)
            print(f"\n💾 评估结果已保存到: {eval_file}")

        except Exception as e:
            print(f"\n❌ 评估失败: {e}")
            print("提示：确保已配置AI模型API密钥")

        print("\n" + "=" * 80)


def test_scenario_prompt():
    """测试场景对话的系统提示词生成"""

    print("\n" + "=" * 80)
    print("预定义场景对话系统提示词测试 (10个场景)")
    print("=" * 80)
    print()

    # 测试10个代表性场景，覆盖不同分类、难度、变体、风格
    test_scenarios = [
        # 旅游出行 (2个)
        {
            "name": "酒店前台 + 入门级 + 美式 + 休闲 + Tips启用",
            "scenario_id": "hotel_reception",
            "scenario": "酒店前台",
            "difficulty": DifficultyLevel.STARTER,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.CASUAL,
            "enable_tips": True
        },
        {
            "name": "出租车司机 + 初级 + 英式 + 休闲 + Tips禁用",
            "scenario_id": "taxi_driver",
            "scenario": "出租车司机",
            "difficulty": DifficultyLevel.ELEMENTARY,
            "variant": EnglishVariant.BRITISH,
            "style": ConversationStyle.CASUAL,
            "enable_tips": False
        },
        # 餐饮购物 (2个)
        {
            "name": "餐厅服务员 + CET4 + 美式 + 休闲 + Tips启用",
            "scenario_id": "restaurant_waiter",
            "scenario": "餐厅服务员",
            "difficulty": DifficultyLevel.CET4,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.CASUAL,
            "enable_tips": True
        },
        {
            "name": "超市购物 + CET4 + 英式 + 休闲 + Tips启用",
            "scenario_id": "supermarket",
            "scenario": "超市购物",
            "difficulty": DifficultyLevel.CET4,
            "variant": EnglishVariant.BRITISH,
            "style": ConversationStyle.CASUAL,
            "enable_tips": True
        },
        # 商务职场 (2个)
        {
            "name": "工作面试 + CET6 + 美式 + 正式 + Tips启用",
            "scenario_id": "job_interview",
            "scenario": "工作面试",
            "difficulty": DifficultyLevel.CET6,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.FORMAL,
            "enable_tips": True
        },
        {
            "name": "客户演示 + 高级 + 英式 + 正式 + Tips禁用",
            "scenario_id": "client_presentation",
            "scenario": "客户演示",
            "difficulty": DifficultyLevel.IELTS7_TEM8,
            "variant": EnglishVariant.BRITISH,
            "style": ConversationStyle.FORMAL,
            "enable_tips": False
        },
        # 医疗健康 (2个)
        {
            "name": "看医生 + CET4 + 美式 + 正式 + Tips启用",
            "scenario_id": "doctor_appointment",
            "scenario": "看医生",
            "difficulty": DifficultyLevel.CET4,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.FORMAL,
            "enable_tips": True
        },
        {
            "name": "药店 + 初级 + 英式 + 休闲 + Tips启用",
            "scenario_id": "pharmacy",
            "scenario": "药店",
            "difficulty": DifficultyLevel.ELEMENTARY,
            "variant": EnglishVariant.BRITISH,
            "style": ConversationStyle.CASUAL,
            "enable_tips": True
        },
        # 社交娱乐 (2个)
        {
            "name": "咖啡店 + CET6 + 美式 + 俚语 + Tips启用",
            "scenario_id": "coffee_shop",
            "scenario": "咖啡店",
            "difficulty": DifficultyLevel.CET6,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.SLANG,
            "enable_tips": True
        },
        {
            "name": "派对聊天 + 母语级 + 美式 + 俚语 + Tips禁用",
            "scenario_id": "party_conversation",
            "scenario": "派对聊天",
            "difficulty": DifficultyLevel.NATIVE,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.SLANG,
            "enable_tips": False
        }
    ]

    for i, config in enumerate(test_scenarios, 1):
        print(f"\n{'=' * 80}")
        print(f"场景测试 {i}/{len(test_scenarios)}: {config['name']}")
        print(f"{'=' * 80}\n")

        # 生成系统提示词
        print("🔧 生成场景系统提示词...")
        system_prompt = format_system_prompt(
            scenario_id=config['scenario_id'],
            difficulty_level=config['difficulty'],
            english_variant=config['variant'],
            conversation_style=config['style'],
            enable_tips=config['enable_tips']
        )

        # 打印预览
        print("\n📝 系统提示词预览（前500字符）:")
        print("-" * 80)
        print(system_prompt[:500] + "...\n" if len(system_prompt) > 500 else system_prompt + "\n")
        print(f"提示词总长度: {len(system_prompt)} 字符")
        print("-" * 80)

        # 保存到文件
        output_dir = Path(__file__).parent / "output"
        output_dir.mkdir(exist_ok=True)

        filename = f"scenario_{config['scenario_id']}_{config['difficulty'].value}_{config['variant'].value}_{config['style'].value}.txt"
        output_file = output_dir / filename

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"配置: {config['name']}\n")
            f.write("=" * 80 + "\n\n")
            f.write(system_prompt)

        print(f"\n💾 完整提示词已保存到: {output_file}")

        # AI评估
        print("\n🤖 AI评估中...")
        try:
            evaluation = evaluate_system_prompt(system_prompt, config)
            print("\n📊 评估结果:")
            print("-" * 80)
            print(evaluation)
            print("-" * 80)

            # 保存评估结果
            eval_file = output_dir / f"evaluation_scenario_{config['scenario_id']}_{config['difficulty'].value}_{config['style'].value}.json"
            with open(eval_file, 'w', encoding='utf-8') as f:
                f.write(evaluation)
            print(f"\n💾 评估结果已保存到: {eval_file}")

        except Exception as e:
            print(f"\n❌ 评估失败: {e}")
            print("提示：确保已配置AI模型API密钥")


if __name__ == "__main__":
    print("\n" + "🚀 " * 20)
    print("LittleGrape 系统提示词质量测试")
    print("🚀 " * 20 + "\n")

    # 测试自由对话 (8种配置组合)
    test_free_conversation_prompt()

    # 测试预定义场景对话 (10个场景，覆盖5个分类)
    test_scenario_prompt()

    print("\n" + "✅ " * 20)
    print("测试完成！请查看 test/output/ 目录下的结果文件")
    print("✅ " * 20 + "\n")
