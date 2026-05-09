"""
提示词配置模块
"""

from .score_prompts import build_score_prompt
from .tips_prompts import build_tips_prompt
from .templates import (
    RESPONSE_FORMAT_TEMPLATE,
    SAFETY_GUIDELINES_TEMPLATE,
    BASE_SYSTEM_PROMPT_TEMPLATE,
    FREE_CONVERSATION_TEMPLATE,
)
from .difficulty_config import (
    DIFFICULTY_DESCRIPTIONS,
    DIFFICULTY_REQUIREMENTS,
    get_difficulty_config,
)
from .variant_config import (
    ENGLISH_VARIANT_DESCRIPTIONS,
    VARIANT_REQUIREMENTS,
    get_variant_rules_en,
)
from .style_config import (
    CONVERSATION_STYLE_DESCRIPTIONS,
    STYLE_BASE_REQUIREMENTS,
    get_style_requirements,
)

__all__ = [
    # 评估提示词
    "build_score_prompt",
    "build_tips_prompt",
    # 模板
    "RESPONSE_FORMAT_TEMPLATE",
    "SAFETY_GUIDELINES_TEMPLATE",
    "BASE_SYSTEM_PROMPT_TEMPLATE",
    "FREE_CONVERSATION_TEMPLATE",
    # 难度配置
    "DIFFICULTY_DESCRIPTIONS",
    "DIFFICULTY_REQUIREMENTS",
    "get_difficulty_config",
    # 变体配置
    "ENGLISH_VARIANT_DESCRIPTIONS",
    "VARIANT_REQUIREMENTS",
    "get_variant_rules_en",
    # 风格配置
    "CONVERSATION_STYLE_DESCRIPTIONS",
    "STYLE_BASE_REQUIREMENTS",
    "get_style_requirements",
]
