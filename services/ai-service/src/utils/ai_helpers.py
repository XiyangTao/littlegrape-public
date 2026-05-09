"""
AI 相关的公共工具函数
- AI 模型工厂
- JSON 响应解析
- 枚举解析
"""

import json
import re
from typing import Dict, Any, Optional

from agno.models.deepseek import DeepSeek
from agno.models.openai import OpenAIChat

from config.settings import settings
from utils.logger import log_error


def get_ai_model(temperature: float = None):
    """
    获取 AI 模型实例（工厂方法）

    优先使用 DeepSeek，否则使用 OpenAI

    Args:
        temperature: 温度参数，0 表示确定性输出，None 使用模型默认值
    """
    if settings.deepseek_api_key:
        return DeepSeek(
            id=settings.deepseek_model,
            api_key=settings.deepseek_api_key,
            temperature=temperature
        )
    elif settings.openai_api_key:
        return OpenAIChat(
            api_key=settings.openai_api_key,
            temperature=temperature
        )
    else:
        raise ValueError("未配置AI模型API密钥 (DEEPSEEK_API_KEY 或 OPENAI_API_KEY)")


def parse_json_response(raw_response: str, default_key: str = None) -> Dict[str, Any]:
    """
    解析 AI 返回的 JSON 响应

    支持多种格式：
    1. 纯 JSON 字符串
    2. Markdown 代码块包裹的 JSON
    3. 混合文本中的 JSON

    Args:
        raw_response: AI 原始响应文本
        default_key: 如果指定，返回该键的值；否则返回整个 dict

    Returns:
        解析后的字典，解析失败返回空字典
    """
    try:
        # 1. 尝试直接解析 JSON
        try:
            data = json.loads(raw_response.strip())
            return data if default_key is None else {default_key: data.get(default_key)}
        except json.JSONDecodeError:
            pass

        # 2. 尝试从 markdown 代码块提取
        json_pattern = r'```(?:json)?\s*(\{.*?\})\s*```'
        match = re.search(json_pattern, raw_response, re.DOTALL)
        if match:
            data = json.loads(match.group(1))
            return data if default_key is None else {default_key: data.get(default_key)}

        # 3. 尝试找到第一个 '{' 和最后一个 '}' 之间的内容
        first_brace = raw_response.find('{')
        last_brace = raw_response.rfind('}')
        if first_brace != -1 and last_brace > first_brace:
            candidate = raw_response[first_brace:last_brace + 1]
            try:
                data = json.loads(candidate)
                return data if default_key is None else {default_key: data.get(default_key)}
            except json.JSONDecodeError:
                pass

        return {}

    except Exception as e:
        log_error(f"解析 JSON 响应失败: {e}")
        return {}


def extract_ai_message(raw_response: str) -> str:
    """
    从 AI 响应中提取 ai_message 字段

    如果无法解析，返回原始响应
    """
    data = parse_json_response(raw_response)
    return data.get("ai_message", raw_response)


def extract_evaluation_result(raw_response: str) -> Dict[str, Any]:
    """
    从 AI 响应中提取评估结果 (score + tips)

    返回格式: {"score": int, "tips": str or None}
    """
    data = parse_json_response(raw_response)

    score = data.get("score", 5)
    tips = data.get("tips")

    # 验证 score 范围
    if isinstance(score, (int, float)):
        score = max(1, min(10, int(score)))
    else:
        score = 5

    # 验证 tips
    if tips is not None and not isinstance(tips, str):
        tips = str(tips) if tips else None
    if tips == "" or tips == "null":
        tips = None

    return {"score": score, "tips": tips}


def extract_score_result(raw_response: str) -> Dict[str, Any]:
    """
    从 AI 响应中提取评分结果

    返回格式: {"score": int, "reason": str}
    """
    data = parse_json_response(raw_response)

    score = data.get("score", 5)
    reason = data.get("reason", "")

    # 验证 score 范围
    if isinstance(score, (int, float)):
        score = max(1, min(10, int(score)))
    else:
        score = 5

    return {"score": score, "reason": reason}


def extract_tips_result(raw_response: str) -> Dict[str, Any]:
    """
    从 AI 响应中提取学习建议

    返回格式: {"tips": str}
    """
    data = parse_json_response(raw_response)

    tips = data.get("tips")

    # 验证 tips
    if tips is not None and not isinstance(tips, str):
        tips = str(tips) if tips else None
    if tips == "" or tips == "null":
        tips = None

    # Tips 永远有值
    if tips is None:
        tips = "继续加油！试着用英文表达你的想法"

    return {"tips": tips}


def extract_translation_result(raw_response: str) -> Dict[str, Any]:
    """
    从 AI 响应中提取翻译结果

    返回格式: {"translation": str, "notes": str}
    """
    data = parse_json_response(raw_response)

    translation = data.get("translation", "")
    notes = data.get("notes", "")

    # 验证 translation
    if not isinstance(translation, str):
        translation = str(translation) if translation else ""

    # 验证 notes
    if not isinstance(notes, str):
        notes = str(notes) if notes else ""

    return {"translation": translation, "notes": notes}


def parse_enum_value(value: str, enum_class, default):
    """
    安全地将字符串解析为枚举值

    Args:
        value: 要解析的字符串
        enum_class: 枚举类
        default: 解析失败时的默认值

    Returns:
        枚举值
    """
    try:
        return enum_class(value.lower())
    except (ValueError, AttributeError):
        return default
