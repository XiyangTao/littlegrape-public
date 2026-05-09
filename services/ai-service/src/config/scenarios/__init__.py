"""
Scenario Configuration Module
Each scenario is defined in its own file, organized by category
"""

# Core functions from prompt_generator
from .prompt_generator import (
    format_system_prompt,
    get_scenario_by_id,
    get_scenarios_by_category,
    get_all_scenarios,
    PREDEFINED_SCENARIOS,
)

# Templates from config/prompts
from config.prompts.templates import (
    BASE_SYSTEM_PROMPT_TEMPLATE,
    FREE_CONVERSATION_TEMPLATE,
)

# Configurations from config/prompts
from config.prompts.difficulty_config import (
    DIFFICULTY_DESCRIPTIONS,
    DIFFICULTY_REQUIREMENTS,
)
from config.prompts.variant_config import (
    ENGLISH_VARIANT_DESCRIPTIONS,
    VARIANT_REQUIREMENTS,
)
from config.prompts.style_config import (
    CONVERSATION_STYLE_DESCRIPTIONS,
    STYLE_BASE_REQUIREMENTS,
)

# Custom scenario generator
from .custom_scenario_generator import (
    CustomScenarioGenerator,
    custom_scenario_generator,
)

__all__ = [
    # Functions
    'format_system_prompt',
    'get_scenario_by_id',
    'get_scenarios_by_category',
    'get_all_scenarios',

    # Templates
    'BASE_SYSTEM_PROMPT_TEMPLATE',
    'FREE_CONVERSATION_TEMPLATE',

    # Configurations
    'PREDEFINED_SCENARIOS',
    'DIFFICULTY_DESCRIPTIONS',
    'DIFFICULTY_REQUIREMENTS',
    'ENGLISH_VARIANT_DESCRIPTIONS',
    'VARIANT_REQUIREMENTS',
    'CONVERSATION_STYLE_DESCRIPTIONS',
    'STYLE_BASE_REQUIREMENTS',

    # Custom scenario
    'CustomScenarioGenerator',
    'custom_scenario_generator',
]
