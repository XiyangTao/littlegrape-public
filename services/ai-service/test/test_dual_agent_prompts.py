"""
测试双 Agent 架构的系统提示词质量
- Chat Agent: 负责角色扮演对话，只输出 ai_message
- Evaluation Agent: 负责评估用户英语输入，输出 tips 和 score (1-10)
"""

import sys
import asyncio
import json
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(project_root))

from config.scenarios import format_system_prompt
from services.evaluation_agent import EvaluationAgent
from common.enums import DifficultyLevel, EnglishVariant, ConversationStyle
from agno.agent import Agent
from agno.models.deepseek import DeepSeek
from agno.models.openai import OpenAIChat
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


async def evaluate_chat_agent_prompt(system_prompt: str, config: dict) -> str:
    """评估 Chat Agent 提示词质量"""
    model = get_evaluation_model()

    evaluator_instructions = """你是一个专业的AI提示词工程评估专家。
你的任务是评估英语学习对话系统中 **Chat Agent** 的系统提示词质量。

**Chat Agent 的职责**：
- 负责角色扮演对话
- 只输出 ai_message（纯英文回复）
- 不负责评分和学习建议（由独立的 Evaluation Agent 处理）

请从以下维度评估系统提示词（每项满分10分）：

1. **清晰度** (1-10分)
   - JSON格式要求是否清晰（只输出 ai_message）
   - 角色扮演指令是否明确
   - 语言要求（纯英文）是否明确

2. **完整性** (1-10分)
   - 难度等级的词汇/语法限制是否详细
   - 英语变体（美式/英式）的拼写和词汇要求是否完整
   - 对话风格的要求是否清晰

3. **可执行性** (1-10分)
   - AI是否能准确遵守难度限制
   - 输出格式是否简洁明确
   - 角色扮演是否有足够指导

4. **一致性** (1-10分)
   - 难度与风格是否协调
   - 没有冲突的指令

5. **安全性** (1-10分)
   - 是否有明确的安全限制
   - 敏感话题引导是否恰当

**重点检查**：
- 输出格式必须是 `{"ai_message": "..."}`
- ai_message 必须是纯英文
- 不应该有 tips 或 score 相关指令

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
  "strengths": ["优点1", "优点2"],
  "weaknesses": ["不足1", "不足2"],
  "suggestions": ["改进建议1"],
  "overall_assessment": "总体评价"
}
```"""

    evaluator = Agent(
        model=model,
        instructions=evaluator_instructions,
        markdown=False
    )

    evaluation_request = f"""请评估以下 Chat Agent 系统提示词：

## 配置信息
- 场景: {config.get('scenario', '自由对话')}
- 难度等级: {config['difficulty']}
- 英语变体: {config['variant']}
- 对话风格: {config['style']}

## 系统提示词内容
```
{system_prompt}
```

请按照评估维度进行详细分析。"""

    response = await evaluator.arun(evaluation_request, stream=False)
    return response.content if hasattr(response, 'content') else str(response)


async def evaluate_evaluation_agent_prompt(system_prompt: str, config: dict) -> str:
    """评估 Evaluation Agent 提示词质量"""
    model = get_evaluation_model()

    evaluator_instructions = """你是一个专业的AI提示词工程评估专家。
你的任务是评估英语学习对话系统中 **Evaluation Agent** 的系统提示词质量。

**Evaluation Agent 的职责**：
- 评估用户英语输入的质量
- 输出 score (1-10分) 和 tips (中文学习建议)
- 根据难度等级调整评分标准

请从以下维度评估系统提示词（每项满分10分）：

1. **评分标准清晰度** (1-10分)
   - 1-10分的评分标准是否清晰可执行
   - 扣分/加分规则是否明确
   - 难度系数调整是否合理

2. **Tips生成规范** (1-10分)
   - Tips 内容优先级是否明确
   - Tips 风格根据难度调整是否合理
   - 禁止事项是否清晰

3. **可执行性** (1-10分)
   - AI是否能准确执行评分
   - 输出格式是否简洁明确
   - 边界情况处理是否完善

4. **难度适配性** (1-10分)
   - 不同难度的评分宽严度是否合理
   - Tips 风格是否与难度匹配

5. **语言变体支持** (1-10分)
   - 美式/英式英语的判断标准是否明确
   - 变体提示是否恰当

**重点检查**：
- 评分必须是 1-10 整数
- Tips 必须是中文（可含英文示例）
- 只评估用户最新一条消息

请输出JSON格式的评估结果：
```json
{
  "scores": {
    "scoring_clarity": 分数,
    "tips_specification": 分数,
    "executability": 分数,
    "difficulty_adaptation": 分数,
    "variant_support": 分数
  },
  "total_score": 总分(满分50),
  "strengths": ["优点1", "优点2"],
  "weaknesses": ["不足1", "不足2"],
  "suggestions": ["改进建议1"],
  "overall_assessment": "总体评价"
}
```"""

    evaluator = Agent(
        model=model,
        instructions=evaluator_instructions,
        markdown=False
    )

    evaluation_request = f"""请评估以下 Evaluation Agent 系统提示词：

## 配置信息
- 场景: {config.get('scenario', '通用')}
- 难度等级: {config['difficulty']}
- 英语变体: {config['variant']}

## 系统提示词内容
```
{system_prompt}
```

请按照评估维度进行详细分析。"""

    response = await evaluator.arun(evaluation_request, stream=False)
    return response.content if hasattr(response, 'content') else str(response)


async def test_chat_agent_prompts():
    """测试 Chat Agent 提示词"""
    print("\n" + "=" * 80)
    print("Chat Agent 提示词测试")
    print("=" * 80)

    test_configs = [
        {
            "name": "Starter + 美式 + 休闲 + 自由对话",
            "scenario_id": None,
            "difficulty": DifficultyLevel.STARTER,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.CASUAL
        },
        {
            "name": "CET4 + 英式 + 正式 + 咖啡店",
            "scenario_id": "coffee_shop",
            "scenario": "咖啡店",
            "difficulty": DifficultyLevel.CET4,
            "variant": EnglishVariant.BRITISH,
            "style": ConversationStyle.FORMAL
        },
        {
            "name": "CET6 + 美式 + 俚语 + 工作面试",
            "scenario_id": "job_interview",
            "scenario": "工作面试",
            "difficulty": DifficultyLevel.CET6,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.SLANG
        },
        {
            "name": "IELTS7 + 英式 + 正式 + 商务会议",
            "scenario_id": "business_meeting",
            "scenario": "商务会议",
            "difficulty": DifficultyLevel.IELTS7_TEM8,
            "variant": EnglishVariant.BRITISH,
            "style": ConversationStyle.FORMAL
        }
    ]

    results = []
    output_dir = Path(__file__).parent / "output" / "dual_agent"
    output_dir.mkdir(parents=True, exist_ok=True)

    for i, config in enumerate(test_configs, 1):
        print(f"\n{'-' * 60}")
        print(f"测试 {i}/{len(test_configs)}: {config['name']}")
        print(f"{'-' * 60}")

        # 生成 Chat Agent 提示词
        system_prompt = format_system_prompt(
            scenario_id=config.get('scenario_id'),
            difficulty_level=config['difficulty'],
            english_variant=config['variant'],
            conversation_style=config['style']
        )

        print(f"提示词长度: {len(system_prompt)} 字符")

        # 保存提示词
        safe_name = config['name'].replace(' ', '_').replace('+', '_')
        prompt_file = output_dir / f"chat_agent_{safe_name}.txt"
        with open(prompt_file, 'w', encoding='utf-8') as f:
            f.write(f"配置: {config['name']}\n")
            f.write("=" * 80 + "\n\n")
            f.write(system_prompt)

        # AI 评估
        print("AI评估中...")
        try:
            evaluation = await evaluate_chat_agent_prompt(system_prompt, {
                'scenario': config.get('scenario', '自由对话'),
                'difficulty': config['difficulty'].value,
                'variant': config['variant'].value,
                'style': config['style'].value
            })

            # 解析评估结果
            eval_text = evaluation
            if "```json" in eval_text:
                json_start = eval_text.find("```json") + 7
                json_end = eval_text.find("```", json_start)
                eval_text = eval_text[json_start:json_end].strip()

            try:
                eval_json = json.loads(eval_text)
                total_score = eval_json.get("total_score", 0)
                print(f"评估得分: {total_score}/50")
                for key, value in eval_json.get('scores', {}).items():
                    print(f"  {key}: {value}")

                results.append({
                    "config": config['name'],
                    "prompt_length": len(system_prompt),
                    "total_score": total_score,
                    "scores": eval_json.get("scores", {}),
                    "strengths": eval_json.get("strengths", []),
                    "weaknesses": eval_json.get("weaknesses", []),
                    "overall_assessment": eval_json.get("overall_assessment", "")
                })
            except json.JSONDecodeError:
                print("评估结果解析失败")
                results.append({
                    "config": config['name'],
                    "prompt_length": len(system_prompt),
                    "eval_raw": evaluation
                })

            # 保存评估结果
            eval_file = output_dir / f"chat_agent_eval_{safe_name}.json"
            with open(eval_file, 'w', encoding='utf-8') as f:
                f.write(evaluation)

        except Exception as e:
            print(f"评估失败: {e}")

    return results


async def test_evaluation_agent_prompts():
    """测试 Evaluation Agent 提示词"""
    print("\n" + "=" * 80)
    print("Evaluation Agent 提示词测试")
    print("=" * 80)

    eval_agent = EvaluationAgent()

    test_configs = [
        {
            "name": "Starter + 美式",
            "difficulty": DifficultyLevel.STARTER,
            "variant": EnglishVariant.AMERICAN,
            "scenario": "便利店购物",
            "ai_role": "收银员"
        },
        {
            "name": "CET4 + 英式",
            "difficulty": DifficultyLevel.CET4,
            "variant": EnglishVariant.BRITISH,
            "scenario": "咖啡店点单",
            "ai_role": "咖啡师"
        },
        {
            "name": "CET6 + 美式",
            "difficulty": DifficultyLevel.CET6,
            "variant": EnglishVariant.AMERICAN,
            "scenario": "工作面试",
            "ai_role": "HR经理"
        },
        {
            "name": "IELTS7 + 英式",
            "difficulty": DifficultyLevel.IELTS7_TEM8,
            "variant": EnglishVariant.BRITISH,
            "scenario": "学术讨论",
            "ai_role": "大学教授"
        },
        {
            "name": "Native + 美式",
            "difficulty": DifficultyLevel.NATIVE,
            "variant": EnglishVariant.AMERICAN,
            "scenario": "脱口秀访谈",
            "ai_role": "脱口秀主持人"
        }
    ]

    results = []
    output_dir = Path(__file__).parent / "output" / "dual_agent"
    output_dir.mkdir(parents=True, exist_ok=True)

    for i, config in enumerate(test_configs, 1):
        print(f"\n{'-' * 60}")
        print(f"测试 {i}/{len(test_configs)}: {config['name']}")
        print(f"{'-' * 60}")

        # 生成 Evaluation Agent 提示词
        system_prompt = eval_agent._build_system_prompt(
            difficulty_level=config['difficulty'],
            english_variant=config['variant'],
            scenario=config['scenario'],
            ai_role=config['ai_role']
        )

        print(f"提示词长度: {len(system_prompt)} 字符")

        # 保存提示词
        safe_name = config['name'].replace(' ', '_').replace('+', '_')
        prompt_file = output_dir / f"eval_agent_{safe_name}.txt"
        with open(prompt_file, 'w', encoding='utf-8') as f:
            f.write(f"配置: {config['name']}\n")
            f.write(f"场景: {config['scenario']}\n")
            f.write(f"角色: {config['ai_role']}\n")
            f.write("=" * 80 + "\n\n")
            f.write(system_prompt)

        # AI 评估
        print("AI评估中...")
        try:
            evaluation = await evaluate_evaluation_agent_prompt(system_prompt, {
                'scenario': config['scenario'],
                'difficulty': config['difficulty'].value,
                'variant': config['variant'].value
            })

            # 解析评估结果
            eval_text = evaluation
            if "```json" in eval_text:
                json_start = eval_text.find("```json") + 7
                json_end = eval_text.find("```", json_start)
                eval_text = eval_text[json_start:json_end].strip()

            try:
                eval_json = json.loads(eval_text)
                total_score = eval_json.get("total_score", 0)
                print(f"评估得分: {total_score}/50")
                for key, value in eval_json.get('scores', {}).items():
                    print(f"  {key}: {value}")

                results.append({
                    "config": config['name'],
                    "scenario": config['scenario'],
                    "prompt_length": len(system_prompt),
                    "total_score": total_score,
                    "scores": eval_json.get("scores", {}),
                    "strengths": eval_json.get("strengths", []),
                    "weaknesses": eval_json.get("weaknesses", []),
                    "overall_assessment": eval_json.get("overall_assessment", "")
                })
            except json.JSONDecodeError:
                print("评估结果解析失败")
                results.append({
                    "config": config['name'],
                    "prompt_length": len(system_prompt),
                    "eval_raw": evaluation
                })

            # 保存评估结果
            eval_file = output_dir / f"eval_agent_eval_{safe_name}.json"
            with open(eval_file, 'w', encoding='utf-8') as f:
                f.write(evaluation)

        except Exception as e:
            print(f"评估失败: {e}")

    return results


async def test_evaluation_agent_execution():
    """测试 Evaluation Agent 实际执行效果"""
    print("\n" + "=" * 80)
    print("Evaluation Agent 执行效果测试")
    print("=" * 80)

    eval_agent = EvaluationAgent()

    # 测试用例：不同质量的用户输入
    test_cases = [
        # Starter 难度测试
        {
            "name": "Starter - 纯中文输入",
            "difficulty": DifficultyLevel.STARTER,
            "variant": EnglishVariant.AMERICAN,
            "user_message": "我想要一杯咖啡",
            "context": [{"role": "assistant", "content": "Hi! What can I get for you?"}],
            "expected_score_range": (1, 3)
        },
        {
            "name": "Starter - 简单正确英文",
            "difficulty": DifficultyLevel.STARTER,
            "variant": EnglishVariant.AMERICAN,
            "user_message": "I want coffee",
            "context": [{"role": "assistant", "content": "Hi! What can I get for you?"}],
            "expected_score_range": (6, 9)
        },
        {
            "name": "Starter - 语法错误",
            "difficulty": DifficultyLevel.STARTER,
            "variant": EnglishVariant.AMERICAN,
            "user_message": "I want book room",
            "context": [{"role": "assistant", "content": "Welcome! How can I help you?"}],
            "expected_score_range": (4, 7)
        },

        # CET4 难度测试
        {
            "name": "CET4 - 简单但正确",
            "difficulty": DifficultyLevel.CET4,
            "variant": EnglishVariant.AMERICAN,
            "user_message": "I want a large latte please",
            "context": [{"role": "assistant", "content": "Good morning! What would you like today?"}],
            "expected_score_range": (6, 8)
        },
        {
            "name": "CET4 - 地道表达",
            "difficulty": DifficultyLevel.CET4,
            "variant": EnglishVariant.AMERICAN,
            "user_message": "I'd love a large latte with an extra shot of espresso, please",
            "context": [{"role": "assistant", "content": "Good morning! What would you like today?"}],
            "expected_score_range": (8, 10)
        },

        # CET6 难度测试
        {
            "name": "CET6 - 基础错误",
            "difficulty": DifficultyLevel.CET6,
            "variant": EnglishVariant.AMERICAN,
            "user_message": "I want book room",
            "context": [{"role": "assistant", "content": "Welcome to Grand Hotel. How may I assist you?"}],
            "expected_score_range": (2, 5)
        },
        {
            "name": "CET6 - 复杂正确",
            "difficulty": DifficultyLevel.CET6,
            "variant": EnglishVariant.AMERICAN,
            "user_message": "I was wondering if you might have any rooms available for this weekend. I'd prefer one with a view if possible.",
            "context": [{"role": "assistant", "content": "Welcome to Grand Hotel. How may I assist you?"}],
            "expected_score_range": (8, 10)
        },

        # 英式英语测试
        {
            "name": "British - 美式拼写",
            "difficulty": DifficultyLevel.CET4,
            "variant": EnglishVariant.BRITISH,
            "user_message": "I'd like to check the color options for this item",
            "context": [{"role": "assistant", "content": "How may I help you today?"}],
            "expected_score_range": (6, 8)  # 应该在 tips 中提醒使用 colour
        }
    ]

    results = []
    output_dir = Path(__file__).parent / "output" / "dual_agent"
    output_dir.mkdir(parents=True, exist_ok=True)

    for i, case in enumerate(test_cases, 1):
        print(f"\n{'-' * 60}")
        print(f"执行测试 {i}/{len(test_cases)}: {case['name']}")
        print(f"难度: {case['difficulty'].value}, 变体: {case['variant'].value}")
        print(f"用户输入: \"{case['user_message']}\"")
        print(f"预期分数范围: {case['expected_score_range']}")

        try:
            result = await eval_agent.evaluate(
                user_message=case['user_message'],
                recent_context=case['context'],
                difficulty_level=case['difficulty'],
                english_variant=case['variant'],
                scenario="测试场景",
                ai_role="测试角色"
            )

            score = result.get('score', 0)
            tips = result.get('tips')

            min_expected, max_expected = case['expected_score_range']
            in_range = min_expected <= score <= max_expected
            status = "✅" if in_range else "⚠️"

            print(f"{status} 实际分数: {score}/10")
            print(f"Tips: {tips}")

            results.append({
                "case": case['name'],
                "user_message": case['user_message'],
                "difficulty": case['difficulty'].value,
                "variant": case['variant'].value,
                "expected_range": case['expected_score_range'],
                "actual_score": score,
                "tips": tips,
                "in_expected_range": in_range
            })

        except Exception as e:
            print(f"❌ 执行失败: {e}")
            results.append({
                "case": case['name'],
                "error": str(e)
            })

    # 总结
    print("\n" + "=" * 80)
    print("执行测试总结")
    print("=" * 80)

    successful = [r for r in results if 'actual_score' in r]
    in_range = [r for r in successful if r.get('in_expected_range', False)]

    print(f"成功执行: {len(successful)}/{len(test_cases)}")
    print(f"分数在预期范围内: {len(in_range)}/{len(successful)}")

    # 保存结果
    exec_results_file = output_dir / "evaluation_execution_results.json"
    with open(exec_results_file, 'w', encoding='utf-8') as f:
        json.dump({
            "total_tests": len(test_cases),
            "successful": len(successful),
            "in_expected_range": len(in_range),
            "detailed_results": results
        }, f, ensure_ascii=False, indent=2)

    print(f"\n结果保存到: {exec_results_file}")
    return results


async def main():
    """运行所有测试"""
    print("\n" + "🚀 " * 20)
    print("双 Agent 架构提示词质量测试")
    print("🚀 " * 20)

    output_dir = Path(__file__).parent / "output" / "dual_agent"
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. 测试 Chat Agent 提示词
    print("\n\n>>> 第一部分：Chat Agent 提示词测试 <<<")
    chat_results = await test_chat_agent_prompts()

    # 2. 测试 Evaluation Agent 提示词
    print("\n\n>>> 第二部分：Evaluation Agent 提示词测试 <<<")
    eval_results = await test_evaluation_agent_prompts()

    # 3. 测试 Evaluation Agent 实际执行
    print("\n\n>>> 第三部分：Evaluation Agent 执行效果测试 <<<")
    exec_results = await test_evaluation_agent_execution()

    # 打印总结
    print("\n" + "=" * 80)
    print("测试总结")
    print("=" * 80)

    # Chat Agent 总结
    chat_scored = [r for r in chat_results if 'total_score' in r]
    if chat_scored:
        avg_chat = sum(r['total_score'] for r in chat_scored) / len(chat_scored)
        print(f"\nChat Agent 提示词:")
        print(f"  平均分: {avg_chat:.1f}/50")
        print(f"  测试数: {len(chat_scored)}")

    # Evaluation Agent 总结
    eval_scored = [r for r in eval_results if 'total_score' in r]
    if eval_scored:
        avg_eval = sum(r['total_score'] for r in eval_scored) / len(eval_scored)
        print(f"\nEvaluation Agent 提示词:")
        print(f"  平均分: {avg_eval:.1f}/50")
        print(f"  测试数: {len(eval_scored)}")

    # 执行测试总结
    exec_successful = [r for r in exec_results if 'actual_score' in r]
    exec_in_range = [r for r in exec_successful if r.get('in_expected_range', False)]
    if exec_successful:
        print(f"\nEvaluation Agent 执行效果:")
        print(f"  成功率: {len(exec_successful)}/{len(exec_results)}")
        print(f"  准确率: {len(exec_in_range)}/{len(exec_successful)} ({100*len(exec_in_range)/len(exec_successful):.1f}%)")

    # 保存总结
    summary = {
        "chat_agent": {
            "tests": len(chat_results),
            "scored": len(chat_scored),
            "average_score": round(avg_chat, 1) if chat_scored else None,
            "results": chat_results
        },
        "evaluation_agent": {
            "tests": len(eval_results),
            "scored": len(eval_scored),
            "average_score": round(avg_eval, 1) if eval_scored else None,
            "results": eval_results
        },
        "execution_test": {
            "tests": len(exec_results),
            "successful": len(exec_successful),
            "in_expected_range": len(exec_in_range),
            "results": exec_results
        }
    }

    summary_file = output_dir / "dual_agent_test_summary.json"
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(f"\n结果保存到: {output_dir}")
    print("\n" + "✅ " * 20)
    print("测试完成！")
    print("✅ " * 20 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
