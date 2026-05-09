"""
综合测试系统提示词质量
覆盖各种参数组合:
- 自由对话场景 / 预定义场景 / 自定义场景
- 6个难度等级
- 美式/英式英语
- 3种对话风格
- Tips 启用/禁用 (对于旧API兼容性测试)

测试双 Agent 架构:
1. Chat Agent 系统提示词质量
2. Evaluation Agent 系统提示词质量
"""

import sys
import asyncio
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any
from itertools import product

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(project_root))

from config.scenarios import format_system_prompt, get_all_scenarios
from config.scenarios.custom_scenario_generator import custom_scenario_generator
from config.prompts.evaluation_prompts import build_evaluation_prompt
from services.evaluation_agent import EvaluationAgent
from common.enums import DifficultyLevel, EnglishVariant, ConversationStyle
from agno.agent import Agent
from agno.models.deepseek import DeepSeek
from agno.models.openai import OpenAIChat
from config.settings import settings


# ==================== 工具函数 ====================

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


def parse_json_from_response(text: str) -> Dict:
    """从响应中解析JSON"""
    if "```json" in text:
        json_start = text.find("```json") + 7
        json_end = text.find("```", json_start)
        text = text[json_start:json_end].strip()
    elif "```" in text:
        json_start = text.find("```") + 3
        json_end = text.find("```", json_start)
        text = text[json_start:json_end].strip()

    return json.loads(text)


# ==================== AI 评估器 ====================

async def evaluate_chat_agent_prompt(system_prompt: str, config: dict) -> Dict:
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
- 场景类型: {config.get('scenario_type', '自由对话')}
- 场景名称: {config.get('scenario_name', 'N/A')}
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
- 难度等级: {config['difficulty']}
- 英语变体: {config['variant']}
- 场景: {config.get('scenario', '通用')}

## 系统提示词内容
```
{system_prompt}
```

请按照评估维度进行详细分析。"""

    response = await evaluator.arun(evaluation_request, stream=False)
    return response.content if hasattr(response, 'content') else str(response)


# ==================== 测试用例生成 ====================

def generate_chat_agent_test_cases() -> List[Dict]:
    """生成 Chat Agent 测试用例，覆盖各种参数组合"""
    test_cases = []

    # 定义要测试的参数组合
    # 为了控制测试数量，每个维度选择有代表性的值

    # 1. 自由对话场景 - 全面覆盖各种参数组合
    difficulties = list(DifficultyLevel)
    variants = list(EnglishVariant)
    styles = list(ConversationStyle)

    # 选择关键组合
    key_combinations = [
        # 低难度组合
        (DifficultyLevel.STARTER, EnglishVariant.AMERICAN, ConversationStyle.CASUAL),
        (DifficultyLevel.STARTER, EnglishVariant.BRITISH, ConversationStyle.FORMAL),
        (DifficultyLevel.ELEMENTARY, EnglishVariant.AMERICAN, ConversationStyle.CASUAL),
        (DifficultyLevel.ELEMENTARY, EnglishVariant.BRITISH, ConversationStyle.CASUAL),

        # 中等难度组合
        (DifficultyLevel.CET4, EnglishVariant.AMERICAN, ConversationStyle.CASUAL),
        (DifficultyLevel.CET4, EnglishVariant.BRITISH, ConversationStyle.FORMAL),
        (DifficultyLevel.CET4, EnglishVariant.AMERICAN, ConversationStyle.SLANG),
        (DifficultyLevel.CET6, EnglishVariant.AMERICAN, ConversationStyle.FORMAL),
        (DifficultyLevel.CET6, EnglishVariant.BRITISH, ConversationStyle.CASUAL),
        (DifficultyLevel.CET6, EnglishVariant.AMERICAN, ConversationStyle.SLANG),

        # 高难度组合
        (DifficultyLevel.IELTS7_TEM8, EnglishVariant.AMERICAN, ConversationStyle.FORMAL),
        (DifficultyLevel.IELTS7_TEM8, EnglishVariant.BRITISH, ConversationStyle.FORMAL),
        (DifficultyLevel.NATIVE, EnglishVariant.AMERICAN, ConversationStyle.SLANG),
        (DifficultyLevel.NATIVE, EnglishVariant.BRITISH, ConversationStyle.CASUAL),
    ]

    for diff, var, style in key_combinations:
        test_cases.append({
            "name": f"自由对话_{diff.value}_{var.value}_{style.value}",
            "scenario_type": "free_conversation",
            "scenario_id": None,
            "scenario_name": "自由对话",
            "difficulty": diff,
            "variant": var,
            "style": style
        })

    # 2. 预定义场景 - 每个类别选1-2个代表性场景
    predefined_scenarios = [
        # 旅行
        ("hotel_reception", "酒店前台", DifficultyLevel.STARTER, EnglishVariant.AMERICAN, ConversationStyle.CASUAL),
        ("airport_checkin", "机场值机", DifficultyLevel.CET4, EnglishVariant.AMERICAN, ConversationStyle.FORMAL),

        # 餐饮购物
        ("restaurant_waiter", "餐厅服务员", DifficultyLevel.CET4, EnglishVariant.AMERICAN, ConversationStyle.CASUAL),
        ("supermarket", "超市购物", DifficultyLevel.ELEMENTARY, EnglishVariant.BRITISH, ConversationStyle.CASUAL),

        # 商务职场
        ("job_interview", "工作面试", DifficultyLevel.CET6, EnglishVariant.AMERICAN, ConversationStyle.FORMAL),
        ("business_meeting", "商务会议", DifficultyLevel.IELTS7_TEM8, EnglishVariant.BRITISH, ConversationStyle.FORMAL),

        # 医疗健康
        ("doctor_appointment", "看医生", DifficultyLevel.CET4, EnglishVariant.AMERICAN, ConversationStyle.FORMAL),
        ("pharmacy", "药店", DifficultyLevel.ELEMENTARY, EnglishVariant.BRITISH, ConversationStyle.CASUAL),

        # 社交娱乐
        ("coffee_shop", "咖啡店", DifficultyLevel.CET6, EnglishVariant.AMERICAN, ConversationStyle.SLANG),
        ("party_conversation", "派对聊天", DifficultyLevel.NATIVE, EnglishVariant.AMERICAN, ConversationStyle.SLANG),
    ]

    for scenario_id, scenario_name, diff, var, style in predefined_scenarios:
        test_cases.append({
            "name": f"预定义场景_{scenario_id}_{diff.value}_{style.value}",
            "scenario_type": "predefined",
            "scenario_id": scenario_id,
            "scenario_name": scenario_name,
            "difficulty": diff,
            "variant": var,
            "style": style
        })

    return test_cases


def generate_custom_scenario_test_cases() -> List[Dict]:
    """生成自定义场景测试用例"""
    return [
        # 入门级场景
        {
            "name": "便利店收银员_入门美式休闲",
            "ai_role": "便利店收银员",
            "scenario_description": "顾客在便利店结账，收银员帮助找零和装袋",
            "difficulty": DifficultyLevel.STARTER,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.CASUAL
        },
        {
            "name": "图书馆管理员_入门英式休闲",
            "ai_role": "图书馆管理员",
            "scenario_description": "帮助读者查找图书和办理借阅手续",
            "difficulty": DifficultyLevel.STARTER,
            "variant": EnglishVariant.BRITISH,
            "style": ConversationStyle.CASUAL
        },

        # 初级场景
        {
            "name": "快餐店服务员_初级美式休闲",
            "ai_role": "快餐店服务员",
            "scenario_description": "顾客在快餐店点餐，服务员介绍菜单和推荐套餐",
            "difficulty": DifficultyLevel.ELEMENTARY,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.CASUAL
        },
        {
            "name": "酒店门童_初级英式正式",
            "ai_role": "酒店门童",
            "scenario_description": "在五星级酒店迎接客人，帮助搬运行李和指引方向",
            "difficulty": DifficultyLevel.ELEMENTARY,
            "variant": EnglishVariant.BRITISH,
            "style": ConversationStyle.FORMAL
        },

        # CET4中等难度
        {
            "name": "旅行社顾问_CET4美式休闲",
            "ai_role": "旅行社顾问",
            "scenario_description": "帮助客户规划旅行行程，推荐景点和预订服务",
            "difficulty": DifficultyLevel.CET4,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.CASUAL
        },
        {
            "name": "银行柜员_CET4英式正式",
            "ai_role": "银行柜员",
            "scenario_description": "帮助客户办理存取款、开户和转账业务",
            "difficulty": DifficultyLevel.CET4,
            "variant": EnglishVariant.BRITISH,
            "style": ConversationStyle.FORMAL
        },

        # CET6高级难度
        {
            "name": "科技公司HR_CET6美式正式",
            "ai_role": "科技公司人力资源专员",
            "scenario_description": "进行校招面试，询问求职者的技能和职业规划",
            "difficulty": DifficultyLevel.CET6,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.FORMAL
        },
        {
            "name": "美食博主_CET6美式俚语",
            "ai_role": "美食博主",
            "scenario_description": "在直播中与粉丝互动，分享美食制作心得和餐厅推荐",
            "difficulty": DifficultyLevel.CET6,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.SLANG
        },

        # IELTS7/TEM8高级
        {
            "name": "大学教授_高级英式正式",
            "ai_role": "大学文学教授",
            "scenario_description": "与学生讨论莎士比亚作品的主题和写作技巧",
            "difficulty": DifficultyLevel.IELTS7_TEM8,
            "variant": EnglishVariant.BRITISH,
            "style": ConversationStyle.FORMAL
        },

        # 母语级
        {
            "name": "脱口秀主持人_母语级美式俚语",
            "ai_role": "深夜脱口秀主持人",
            "scenario_description": "与嘉宾进行轻松幽默的访谈，讨论流行文化话题",
            "difficulty": DifficultyLevel.NATIVE,
            "variant": EnglishVariant.AMERICAN,
            "style": ConversationStyle.SLANG
        },
    ]


def generate_evaluation_agent_test_cases() -> List[Dict]:
    """生成 Evaluation Agent 测试用例"""
    test_cases = []

    # 覆盖所有难度等级和两种英语变体
    for diff in DifficultyLevel:
        for var in EnglishVariant:
            test_cases.append({
                "name": f"EvalAgent_{diff.value}_{var.value}",
                "difficulty": diff,
                "variant": var,
                "scenario": "通用测试场景",
                "ai_role": "测试角色"
            })

    return test_cases


# ==================== 测试执行 ====================

async def test_chat_agent_prompts(test_cases: List[Dict], output_dir: Path) -> List[Dict]:
    """测试 Chat Agent 提示词"""
    print("\n" + "=" * 80)
    print("Chat Agent 提示词测试")
    print("=" * 80)

    results = []

    for i, case in enumerate(test_cases, 1):
        print(f"\n{'-' * 60}")
        print(f"测试 {i}/{len(test_cases)}: {case['name']}")
        print(f"{'-' * 60}")

        try:
            # 生成 Chat Agent 提示词
            system_prompt = format_system_prompt(
                scenario_id=case.get('scenario_id'),
                difficulty_level=case['difficulty'],
                english_variant=case['variant'],
                conversation_style=case['style']
            )

            print(f"提示词长度: {len(system_prompt)} 字符")

            # 保存提示词
            safe_name = case['name'].replace(' ', '_').replace('/', '_')
            prompt_file = output_dir / f"chat_prompt_{safe_name}.txt"
            with open(prompt_file, 'w', encoding='utf-8') as f:
                f.write(f"配置: {case['name']}\n")
                f.write(f"场景类型: {case['scenario_type']}\n")
                f.write(f"难度: {case['difficulty'].value}\n")
                f.write(f"变体: {case['variant'].value}\n")
                f.write(f"风格: {case['style'].value}\n")
                f.write("=" * 80 + "\n\n")
                f.write(system_prompt)

            # AI 评估
            print("AI评估中...")
            evaluation = await evaluate_chat_agent_prompt(system_prompt, {
                'scenario_type': case['scenario_type'],
                'scenario_name': case.get('scenario_name', '自由对话'),
                'difficulty': case['difficulty'].value,
                'variant': case['variant'].value,
                'style': case['style'].value
            })

            # 解析评估结果
            try:
                eval_json = parse_json_from_response(evaluation)
                total_score = eval_json.get("total_score", 0)
                print(f"评估得分: {total_score}/50")

                results.append({
                    "case": case['name'],
                    "scenario_type": case['scenario_type'],
                    "difficulty": case['difficulty'].value,
                    "variant": case['variant'].value,
                    "style": case['style'].value,
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
                    "case": case['name'],
                    "prompt_length": len(system_prompt),
                    "eval_raw": evaluation
                })

            # 保存评估结果
            eval_file = output_dir / f"chat_eval_{safe_name}.json"
            with open(eval_file, 'w', encoding='utf-8') as f:
                f.write(evaluation)

        except Exception as e:
            print(f"测试失败: {e}")
            results.append({
                "case": case['name'],
                "error": str(e)
            })

    return results


async def test_custom_scenario_prompts(test_cases: List[Dict], output_dir: Path) -> List[Dict]:
    """测试自定义场景提示词"""
    print("\n" + "=" * 80)
    print("自定义场景提示词测试")
    print("=" * 80)

    results = []

    for i, case in enumerate(test_cases, 1):
        print(f"\n{'-' * 60}")
        print(f"测试 {i}/{len(test_cases)}: {case['name']}")
        print(f"AI角色: {case['ai_role']}")
        print(f"场景: {case['scenario_description']}")
        print(f"{'-' * 60}")

        try:
            # 生成自定义场景提示词
            result = await custom_scenario_generator.generate(
                ai_role=case['ai_role'],
                scenario_description=case['scenario_description'],
                difficulty_level=case['difficulty'],
                english_variant=case['variant'],
                conversation_style=case['style'],
                enable_tips=True
            )

            if not result["success"]:
                print(f"生成失败: {result['error']}")
                results.append({
                    "case": case['name'],
                    "success": False,
                    "error": result['error']
                })
                continue

            system_prompt = result["system_prompt"]
            print(f"生成成功! 提示词长度: {len(system_prompt)} 字符")

            # 保存提示词
            safe_name = case['name'].replace(' ', '_').replace('/', '_')
            prompt_file = output_dir / f"custom_prompt_{safe_name}.txt"
            with open(prompt_file, 'w', encoding='utf-8') as f:
                f.write(f"场景: {case['name']}\n")
                f.write(f"AI角色: {case['ai_role']}\n")
                f.write(f"场景描述: {case['scenario_description']}\n")
                f.write(f"难度: {case['difficulty'].value}\n")
                f.write(f"变体: {case['variant'].value}\n")
                f.write(f"风格: {case['style'].value}\n")
                f.write("=" * 80 + "\n\n")
                f.write(system_prompt)

            # AI 评估
            print("AI评估中...")
            evaluation = await evaluate_chat_agent_prompt(system_prompt, {
                'scenario_type': 'custom',
                'scenario_name': case['ai_role'],
                'difficulty': case['difficulty'].value,
                'variant': case['variant'].value,
                'style': case['style'].value
            })

            # 解析评估结果
            try:
                eval_json = parse_json_from_response(evaluation)
                total_score = eval_json.get("total_score", 0)
                print(f"评估得分: {total_score}/50")

                results.append({
                    "case": case['name'],
                    "ai_role": case['ai_role'],
                    "difficulty": case['difficulty'].value,
                    "variant": case['variant'].value,
                    "style": case['style'].value,
                    "prompt_length": len(system_prompt),
                    "total_score": total_score,
                    "scores": eval_json.get("scores", {}),
                    "strengths": eval_json.get("strengths", []),
                    "weaknesses": eval_json.get("weaknesses", [])
                })
            except json.JSONDecodeError:
                print("评估结果解析失败")
                results.append({
                    "case": case['name'],
                    "prompt_length": len(system_prompt),
                    "eval_raw": evaluation
                })

            # 保存评估结果
            eval_file = output_dir / f"custom_eval_{safe_name}.json"
            with open(eval_file, 'w', encoding='utf-8') as f:
                f.write(evaluation)

        except Exception as e:
            print(f"测试失败: {e}")
            results.append({
                "case": case['name'],
                "error": str(e)
            })

    return results


async def test_evaluation_agent_prompts(test_cases: List[Dict], output_dir: Path) -> List[Dict]:
    """测试 Evaluation Agent 提示词"""
    print("\n" + "=" * 80)
    print("Evaluation Agent 提示词测试")
    print("=" * 80)

    results = []

    for i, case in enumerate(test_cases, 1):
        print(f"\n{'-' * 60}")
        print(f"测试 {i}/{len(test_cases)}: {case['name']}")
        print(f"{'-' * 60}")

        try:
            # 生成 Evaluation Agent 提示词
            system_prompt = build_evaluation_prompt(
                difficulty_level=case['difficulty'],
                english_variant=case['variant'],
                scenario=case['scenario'],
                ai_role=case['ai_role']
            )

            print(f"提示词长度: {len(system_prompt)} 字符")

            # 保存提示词
            safe_name = case['name'].replace(' ', '_').replace('/', '_')
            prompt_file = output_dir / f"eval_prompt_{safe_name}.txt"
            with open(prompt_file, 'w', encoding='utf-8') as f:
                f.write(f"配置: {case['name']}\n")
                f.write(f"难度: {case['difficulty'].value}\n")
                f.write(f"变体: {case['variant'].value}\n")
                f.write("=" * 80 + "\n\n")
                f.write(system_prompt)

            # AI 评估
            print("AI评估中...")
            evaluation = await evaluate_evaluation_agent_prompt(system_prompt, {
                'difficulty': case['difficulty'].value,
                'variant': case['variant'].value,
                'scenario': case['scenario']
            })

            # 解析评估结果
            try:
                eval_json = parse_json_from_response(evaluation)
                total_score = eval_json.get("total_score", 0)
                print(f"评估得分: {total_score}/50")

                results.append({
                    "case": case['name'],
                    "difficulty": case['difficulty'].value,
                    "variant": case['variant'].value,
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
                    "case": case['name'],
                    "prompt_length": len(system_prompt),
                    "eval_raw": evaluation
                })

            # 保存评估结果
            eval_file = output_dir / f"eval_eval_{safe_name}.json"
            with open(eval_file, 'w', encoding='utf-8') as f:
                f.write(evaluation)

        except Exception as e:
            print(f"测试失败: {e}")
            results.append({
                "case": case['name'],
                "error": str(e)
            })

    return results


async def test_evaluation_agent_execution(output_dir: Path) -> List[Dict]:
    """测试 Evaluation Agent 实际执行效果"""
    print("\n" + "=" * 80)
    print("Evaluation Agent 执行效果测试")
    print("=" * 80)

    eval_agent = EvaluationAgent()

    # 测试用例：不同难度等级下不同质量的用户输入
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
            "expected_score_range": (6, 8)
        },
        {
            "name": "British - 英式拼写正确",
            "difficulty": DifficultyLevel.CET4,
            "variant": EnglishVariant.BRITISH,
            "user_message": "I'd like to check the colour options for this item",
            "context": [{"role": "assistant", "content": "How may I help you today?"}],
            "expected_score_range": (7, 10)
        },

        # Native 难度测试
        {
            "name": "Native - 普通表达",
            "difficulty": DifficultyLevel.NATIVE,
            "variant": EnglishVariant.AMERICAN,
            "user_message": "I want to order some food",
            "context": [{"role": "assistant", "content": "Hey, what's up! Ready to order?"}],
            "expected_score_range": (5, 7)
        },
        {
            "name": "Native - 地道俚语",
            "difficulty": DifficultyLevel.NATIVE,
            "variant": EnglishVariant.AMERICAN,
            "user_message": "Yeah, I'm starving! Lemme get the usual - you know, the burger that slaps",
            "context": [{"role": "assistant", "content": "Hey, what's up! Ready to order?"}],
            "expected_score_range": (8, 10)
        },
    ]

    results = []

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
            status = "PASS" if in_range else "WARN"

            print(f"[{status}] 实际分数: {score}/10")
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
            print(f"[FAIL] 执行失败: {e}")
            results.append({
                "case": case['name'],
                "error": str(e)
            })

    return results


# ==================== 汇总统计 ====================

def print_summary(
    chat_results: List[Dict],
    custom_results: List[Dict],
    eval_prompt_results: List[Dict],
    eval_exec_results: List[Dict]
):
    """打印测试总结"""
    print("\n" + "=" * 80)
    print("综合测试总结")
    print("=" * 80)

    # Chat Agent 总结
    chat_scored = [r for r in chat_results if 'total_score' in r]
    if chat_scored:
        scores = [r['total_score'] for r in chat_scored]
        avg_score = sum(scores) / len(scores)
        print(f"\n【Chat Agent 提示词】")
        print(f"  测试用例数: {len(chat_results)}")
        print(f"  成功评估数: {len(chat_scored)}")
        print(f"  平均分: {avg_score:.1f}/50")
        print(f"  最高分: {max(scores)}/50")
        print(f"  最低分: {min(scores)}/50")

        # 按难度分组
        by_difficulty = {}
        for r in chat_scored:
            diff = r['difficulty']
            if diff not in by_difficulty:
                by_difficulty[diff] = []
            by_difficulty[diff].append(r['total_score'])

        print("\n  按难度等级:")
        for diff in ['starter', 'elementary', 'cet4', 'cet6', 'ielts7_tem8', 'native']:
            if diff in by_difficulty:
                scores = by_difficulty[diff]
                print(f"    {diff}: 平均 {sum(scores)/len(scores):.1f}/50 ({len(scores)}个)")

    # Custom Scenario 总结
    custom_scored = [r for r in custom_results if 'total_score' in r]
    if custom_scored:
        scores = [r['total_score'] for r in custom_scored]
        avg_score = sum(scores) / len(scores)
        print(f"\n【自定义场景提示词】")
        print(f"  测试用例数: {len(custom_results)}")
        print(f"  成功生成数: {len([r for r in custom_results if 'error' not in r])}")
        print(f"  成功评估数: {len(custom_scored)}")
        print(f"  平均分: {avg_score:.1f}/50")

    # Evaluation Agent Prompt 总结
    eval_prompt_scored = [r for r in eval_prompt_results if 'total_score' in r]
    if eval_prompt_scored:
        scores = [r['total_score'] for r in eval_prompt_scored]
        avg_score = sum(scores) / len(scores)
        print(f"\n【Evaluation Agent 提示词】")
        print(f"  测试用例数: {len(eval_prompt_results)}")
        print(f"  成功评估数: {len(eval_prompt_scored)}")
        print(f"  平均分: {avg_score:.1f}/50")
        print(f"  最高分: {max(scores)}/50")
        print(f"  最低分: {min(scores)}/50")

    # Evaluation Agent Execution 总结
    exec_successful = [r for r in eval_exec_results if 'actual_score' in r]
    exec_in_range = [r for r in exec_successful if r.get('in_expected_range', False)]
    if exec_successful:
        print(f"\n【Evaluation Agent 执行效果】")
        print(f"  测试用例数: {len(eval_exec_results)}")
        print(f"  成功执行数: {len(exec_successful)}")
        print(f"  分数在预期范围内: {len(exec_in_range)}/{len(exec_successful)} ({100*len(exec_in_range)/len(exec_successful):.1f}%)")


def save_summary(
    chat_results: List[Dict],
    custom_results: List[Dict],
    eval_prompt_results: List[Dict],
    eval_exec_results: List[Dict],
    output_dir: Path
):
    """保存测试总结"""
    summary = {
        "test_time": datetime.now().isoformat(),
        "chat_agent": {
            "total_tests": len(chat_results),
            "scored_tests": len([r for r in chat_results if 'total_score' in r]),
            "average_score": round(sum(r['total_score'] for r in chat_results if 'total_score' in r) / len([r for r in chat_results if 'total_score' in r]), 1) if [r for r in chat_results if 'total_score' in r] else None,
            "results": chat_results
        },
        "custom_scenario": {
            "total_tests": len(custom_results),
            "successful_generation": len([r for r in custom_results if 'error' not in r]),
            "scored_tests": len([r for r in custom_results if 'total_score' in r]),
            "average_score": round(sum(r['total_score'] for r in custom_results if 'total_score' in r) / len([r for r in custom_results if 'total_score' in r]), 1) if [r for r in custom_results if 'total_score' in r] else None,
            "results": custom_results
        },
        "evaluation_agent_prompt": {
            "total_tests": len(eval_prompt_results),
            "scored_tests": len([r for r in eval_prompt_results if 'total_score' in r]),
            "average_score": round(sum(r['total_score'] for r in eval_prompt_results if 'total_score' in r) / len([r for r in eval_prompt_results if 'total_score' in r]), 1) if [r for r in eval_prompt_results if 'total_score' in r] else None,
            "results": eval_prompt_results
        },
        "evaluation_agent_execution": {
            "total_tests": len(eval_exec_results),
            "successful_execution": len([r for r in eval_exec_results if 'actual_score' in r]),
            "in_expected_range": len([r for r in eval_exec_results if r.get('in_expected_range', False)]),
            "results": eval_exec_results
        }
    }

    summary_file = output_dir / "comprehensive_test_summary.json"
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(f"\n总结已保存到: {summary_file}")


# ==================== 主函数 ====================

async def main():
    """运行综合测试"""
    print("\n" + "=" * 80)
    print("LittleGrape 系统提示词综合质量测试")
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)

    # 创建输出目录
    output_dir = Path(__file__).parent / "output" / "comprehensive"
    output_dir.mkdir(parents=True, exist_ok=True)

    # 生成测试用例
    chat_test_cases = generate_chat_agent_test_cases()
    custom_test_cases = generate_custom_scenario_test_cases()
    eval_test_cases = generate_evaluation_agent_test_cases()

    print(f"\n测试用例数量:")
    print(f"  Chat Agent: {len(chat_test_cases)}")
    print(f"  自定义场景: {len(custom_test_cases)}")
    print(f"  Evaluation Agent 提示词: {len(eval_test_cases)}")
    print(f"  Evaluation Agent 执行效果: 11")

    # 1. 测试 Chat Agent 提示词
    print("\n\n>>> 第一部分：Chat Agent 提示词测试 <<<")
    chat_results = await test_chat_agent_prompts(chat_test_cases, output_dir)

    # 2. 测试自定义场景提示词
    print("\n\n>>> 第二部分：自定义场景提示词测试 <<<")
    custom_results = await test_custom_scenario_prompts(custom_test_cases, output_dir)

    # 3. 测试 Evaluation Agent 提示词
    print("\n\n>>> 第三部分：Evaluation Agent 提示词测试 <<<")
    eval_prompt_results = await test_evaluation_agent_prompts(eval_test_cases, output_dir)

    # 4. 测试 Evaluation Agent 实际执行
    print("\n\n>>> 第四部分：Evaluation Agent 执行效果测试 <<<")
    eval_exec_results = await test_evaluation_agent_execution(output_dir)

    # 打印总结
    print_summary(chat_results, custom_results, eval_prompt_results, eval_exec_results)

    # 保存总结
    save_summary(chat_results, custom_results, eval_prompt_results, eval_exec_results, output_dir)

    print("\n" + "=" * 80)
    print("测试完成！")
    print(f"结果保存在: {output_dir}")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
