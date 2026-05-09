"""
只测试 Evaluation Agent 的提示词质量和执行效果
"""

import sys
import asyncio
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(project_root))

from config.prompts.evaluation_prompts import build_evaluation_prompt
from services.evaluation_agent import EvaluationAgent
from common.enums import DifficultyLevel, EnglishVariant
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


async def evaluate_evaluation_agent_prompt(system_prompt: str, config: dict) -> str:
    """评估 Evaluation Agent 提示词质量"""
    model = get_evaluation_model()

    evaluator_instructions = """你是一个专业的AI提示词工程评估专家。
评估英语学习系统中 **Evaluation Agent** 的系统提示词质量。

请从以下维度评估（每项满分10分）：

1. **评分标准清晰度** (1-10分)
   - 1-10分的评分标准是否清晰
   - 扣分/加分规则是否明确（是否使用整数）
   - 难度系数调整是否量化

2. **Tips生成规范** (1-10分)
   - Tips 数量限制是否统一明确
   - Tips 格式是否清晰
   - 禁止事项是否清晰

3. **可执行性** (1-10分)
   - AI是否能准确执行评分
   - 输出格式是否简洁明确
   - 规则是否无矛盾

4. **难度适配性** (1-10分)
   - 不同难度的评分宽严度是否合理量化
   - 入门级是否足够宽松
   - 高级/母语级是否足够严格

5. **语言变体支持** (1-10分)
   - 美式/英式英语的检测是否明确
   - 是否有明确的提示要求

请输出JSON格式：
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

## 系统提示词内容
```
{system_prompt}
```

请按照评估维度进行详细分析。"""

    response = await evaluator.arun(evaluation_request, stream=False)
    return response.content if hasattr(response, 'content') else str(response)


async def test_evaluation_agent_prompts(output_dir: Path) -> List[Dict]:
    """测试 Evaluation Agent 提示词"""
    print("\n" + "=" * 80)
    print("Evaluation Agent 提示词测试")
    print("=" * 80)

    # 测试关键组合
    test_cases = [
        {"difficulty": DifficultyLevel.STARTER, "variant": EnglishVariant.AMERICAN},
        {"difficulty": DifficultyLevel.STARTER, "variant": EnglishVariant.BRITISH},
        {"difficulty": DifficultyLevel.CET4, "variant": EnglishVariant.AMERICAN},
        {"difficulty": DifficultyLevel.CET4, "variant": EnglishVariant.BRITISH},
        {"difficulty": DifficultyLevel.CET6, "variant": EnglishVariant.AMERICAN},
        {"difficulty": DifficultyLevel.IELTS7_TEM8, "variant": EnglishVariant.BRITISH},
        {"difficulty": DifficultyLevel.NATIVE, "variant": EnglishVariant.AMERICAN},
        {"difficulty": DifficultyLevel.NATIVE, "variant": EnglishVariant.BRITISH},
    ]

    results = []

    for i, case in enumerate(test_cases, 1):
        name = f"EvalAgent_{case['difficulty'].value}_{case['variant'].value}"
        print(f"\n{'-' * 60}")
        print(f"测试 {i}/{len(test_cases)}: {name}")
        print(f"{'-' * 60}")

        try:
            system_prompt = build_evaluation_prompt(
                difficulty_level=case['difficulty'],
                english_variant=case['variant'],
                scenario="测试场景",
                ai_role="测试角色"
            )

            print(f"提示词长度: {len(system_prompt)} 字符")

            # 保存提示词
            prompt_file = output_dir / f"eval_prompt_{name}.txt"
            with open(prompt_file, 'w', encoding='utf-8') as f:
                f.write(f"难度: {case['difficulty'].value}\n")
                f.write(f"变体: {case['variant'].value}\n")
                f.write("=" * 80 + "\n\n")
                f.write(system_prompt)

            # AI 评估
            print("AI评估中...")
            evaluation = await evaluate_evaluation_agent_prompt(system_prompt, {
                'difficulty': case['difficulty'].value,
                'variant': case['variant'].value
            })

            try:
                eval_json = parse_json_from_response(evaluation)
                total_score = eval_json.get("total_score", 0)
                print(f"评估得分: {total_score}/50")
                for key, value in eval_json.get('scores', {}).items():
                    print(f"  {key}: {value}")

                results.append({
                    "case": name,
                    "difficulty": case['difficulty'].value,
                    "variant": case['variant'].value,
                    "prompt_length": len(system_prompt),
                    "total_score": total_score,
                    "scores": eval_json.get("scores", {}),
                    "weaknesses": eval_json.get("weaknesses", []),
                    "overall_assessment": eval_json.get("overall_assessment", "")
                })
            except json.JSONDecodeError:
                print("评估结果解析失败")
                results.append({
                    "case": name,
                    "prompt_length": len(system_prompt),
                    "eval_raw": evaluation
                })

            # 保存评估结果
            eval_file = output_dir / f"eval_eval_{name}.json"
            with open(eval_file, 'w', encoding='utf-8') as f:
                f.write(evaluation)

        except Exception as e:
            print(f"测试失败: {e}")
            results.append({"case": name, "error": str(e)})

    return results


async def test_evaluation_agent_execution(output_dir: Path) -> List[Dict]:
    """测试 Evaluation Agent 实际执行效果"""
    print("\n" + "=" * 80)
    print("Evaluation Agent 执行效果测试")
    print("=" * 80)

    eval_agent = EvaluationAgent()

    test_cases = [
        # 基础测试
        {
            "name": "Starter - 纯中文",
            "difficulty": DifficultyLevel.STARTER,
            "variant": EnglishVariant.AMERICAN,
            "user_message": "我想要咖啡",
            "context": [{"role": "assistant", "content": "Hi! What can I get for you?"}],
            "expected_score_range": (1, 3)
        },
        {
            "name": "Starter - 简单英文",
            "difficulty": DifficultyLevel.STARTER,
            "variant": EnglishVariant.AMERICAN,
            "user_message": "I want coffee",
            "context": [{"role": "assistant", "content": "Hi! What can I get for you?"}],
            "expected_score_range": (6, 9)
        },
        # CET4 测试
        {
            "name": "CET4 - 地道表达",
            "difficulty": DifficultyLevel.CET4,
            "variant": EnglishVariant.AMERICAN,
            "user_message": "I'd love a large latte with an extra shot, please",
            "context": [{"role": "assistant", "content": "Good morning! What would you like?"}],
            "expected_score_range": (8, 10)
        },
        # 英式英语变体检测（关键测试）
        {
            "name": "British - 用了美式拼写 color",
            "difficulty": DifficultyLevel.CET4,
            "variant": EnglishVariant.BRITISH,
            "user_message": "I'd like to check the color options for this item",
            "context": [{"role": "assistant", "content": "How may I help you today?"}],
            "expected_score_range": (7, 9),
            "expect_variant_tip": True  # 应该在 tips 中提到 colour
        },
        {
            "name": "British - 正确英式拼写 colour",
            "difficulty": DifficultyLevel.CET4,
            "variant": EnglishVariant.BRITISH,
            "user_message": "I'd like to check the colour options for this item",
            "context": [{"role": "assistant", "content": "How may I help you today?"}],
            "expected_score_range": (8, 10)
        },
        # 美式英语变体检测
        {
            "name": "American - 用了英式拼写 colour",
            "difficulty": DifficultyLevel.CET4,
            "variant": EnglishVariant.AMERICAN,
            "user_message": "I'd like to check the colour options for this item",
            "context": [{"role": "assistant", "content": "How may I help you today?"}],
            "expected_score_range": (7, 9),
            "expect_variant_tip": True  # 应该在 tips 中提到 color
        },
        # Native 难度测试（关键测试）
        {
            "name": "Native - 普通表达（应该严格）",
            "difficulty": DifficultyLevel.NATIVE,
            "variant": EnglishVariant.AMERICAN,
            "user_message": "I want to order some food",
            "context": [{"role": "assistant", "content": "Hey, what's up! Ready to order?"}],
            "expected_score_range": (5, 7),  # Native 级别普通表达应该偏低
            "expect_natural_tip": True  # 应该建议更自然的表达
        },
        {
            "name": "Native - 地道俚语",
            "difficulty": DifficultyLevel.NATIVE,
            "variant": EnglishVariant.AMERICAN,
            "user_message": "Yeah, I'm starving! Lemme get the usual - the burger that slaps",
            "context": [{"role": "assistant", "content": "Hey, what's up! Ready to order?"}],
            "expected_score_range": (9, 10)
        },
    ]

    results = []

    for i, case in enumerate(test_cases, 1):
        print(f"\n{'-' * 60}")
        print(f"执行测试 {i}/{len(test_cases)}: {case['name']}")
        print(f"难度: {case['difficulty'].value}, 变体: {case['variant'].value}")
        print(f"用户输入: \"{case['user_message']}\"")
        print(f"预期分数: {case['expected_score_range']}")

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

            min_exp, max_exp = case['expected_score_range']
            in_range = min_exp <= score <= max_exp

            # 检查变体提示
            variant_tip_ok = True
            if case.get('expect_variant_tip') and tips:
                variant_tip_ok = 'col' in tips.lower() or '拼写' in tips
            elif case.get('expect_variant_tip') and not tips:
                variant_tip_ok = False

            # 检查自然表达提示
            natural_tip_ok = True
            if case.get('expect_natural_tip') and tips:
                natural_tip_ok = '自然' in tips or '地道' in tips or '母语' in tips
            elif case.get('expect_natural_tip') and not tips:
                natural_tip_ok = False

            status = "PASS" if in_range else "WARN"
            print(f"[{status}] 实际分数: {score}/10")
            print(f"Tips: {tips}")

            if case.get('expect_variant_tip'):
                print(f"变体提示检查: {'✓' if variant_tip_ok else '✗ 未检测到变体提示'}")
            if case.get('expect_natural_tip'):
                print(f"自然表达提示: {'✓' if natural_tip_ok else '✗ 未建议更自然表达'}")

            results.append({
                "case": case['name'],
                "difficulty": case['difficulty'].value,
                "variant": case['variant'].value,
                "user_message": case['user_message'],
                "expected_range": case['expected_score_range'],
                "actual_score": score,
                "tips": tips,
                "in_expected_range": in_range,
                "variant_tip_ok": variant_tip_ok if case.get('expect_variant_tip') else None,
                "natural_tip_ok": natural_tip_ok if case.get('expect_natural_tip') else None
            })

        except Exception as e:
            print(f"[FAIL] 执行失败: {e}")
            results.append({"case": case['name'], "error": str(e)})

    return results


def print_summary(prompt_results: List[Dict], exec_results: List[Dict]):
    """打印测试总结"""
    print("\n" + "=" * 80)
    print("测试总结")
    print("=" * 80)

    # 提示词质量
    scored = [r for r in prompt_results if 'total_score' in r]
    if scored:
        scores = [r['total_score'] for r in scored]
        print(f"\n【Evaluation Agent 提示词质量】")
        print(f"  测试数: {len(scored)}")
        print(f"  平均分: {sum(scores)/len(scores):.1f}/50")
        print(f"  最高分: {max(scores)}/50")
        print(f"  最低分: {min(scores)}/50")

    # 执行效果
    exec_ok = [r for r in exec_results if 'actual_score' in r]
    if exec_ok:
        in_range = [r for r in exec_ok if r.get('in_expected_range')]
        variant_tests = [r for r in exec_ok if r.get('variant_tip_ok') is not None]
        variant_ok = [r for r in variant_tests if r.get('variant_tip_ok')]
        natural_tests = [r for r in exec_ok if r.get('natural_tip_ok') is not None]
        natural_ok = [r for r in natural_tests if r.get('natural_tip_ok')]

        print(f"\n【Evaluation Agent 执行效果】")
        print(f"  分数准确率: {len(in_range)}/{len(exec_ok)} ({100*len(in_range)/len(exec_ok):.0f}%)")
        if variant_tests:
            print(f"  变体检测: {len(variant_ok)}/{len(variant_tests)} ({100*len(variant_ok)/len(variant_tests):.0f}%)")
        if natural_tests:
            print(f"  自然表达提示: {len(natural_ok)}/{len(natural_tests)} ({100*len(natural_ok)/len(natural_tests):.0f}%)")


async def main():
    print("\n" + "=" * 80)
    print("Evaluation Agent 提示词测试")
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)

    output_dir = Path(__file__).parent / "output" / "eval_only"
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. 测试提示词质量
    print("\n>>> 第一部分：提示词质量测试 <<<")
    prompt_results = await test_evaluation_agent_prompts(output_dir)

    # 2. 测试执行效果
    print("\n>>> 第二部分：执行效果测试 <<<")
    exec_results = await test_evaluation_agent_execution(output_dir)

    # 打印总结
    print_summary(prompt_results, exec_results)

    # 保存结果
    summary = {
        "test_time": datetime.now().isoformat(),
        "prompt_results": prompt_results,
        "execution_results": exec_results
    }
    with open(output_dir / "test_summary.json", 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(f"\n结果保存到: {output_dir}")


if __name__ == "__main__":
    asyncio.run(main())
