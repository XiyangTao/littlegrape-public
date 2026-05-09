"""
Predefined English Learning Scenarios Configuration
Import scenarios from individual files and build system prompts
"""

from typing import Dict, List, Any

from common.enums import DifficultyLevel, ScenarioCategory, EnglishVariant, ConversationStyle

# Import scenario modules
from . import free_conversation
from .travel import airport_checkin, hotel_reception, taxi_driver, train_station
from .dining_shopping import restaurant_waiter, electronics_store, supermarket, clothing_store
from .business import business_meeting, job_interview, client_presentation, networking_event
from .health import doctor_appointment, pharmacy, dentist, fitness_trainer
from .social import coffee_shop, movie_theater, gym_friend, party_conversation, library

# Import shared configurations from config/prompts
from config.prompts.difficulty_config import DIFFICULTY_DESCRIPTIONS, DIFFICULTY_REQUIREMENTS
from config.prompts.variant_config import VARIANT_REQUIREMENTS
from config.prompts.style_config import get_style_requirements
from config.prompts.templates import (
    LANGUAGE_CONFIG_TEMPLATE,
    SAFETY_GUIDELINES_TEMPLATE,
    SAFETY_REDIRECT_CONFIG,
    RESPONSE_FORMAT_TEMPLATE,
    BASE_SYSTEM_PROMPT_TEMPLATE,
    FREE_CONVERSATION_TEMPLATE,
    COMPANION_CHAT_TEMPLATE,
)
from config.companions.companion_config import get_companion_by_id


# ==================== Predefined Scenarios ====================

PREDEFINED_SCENARIOS: Dict[str, Dict[str, Any]] = {
    # Free conversation
    "free_conversation": free_conversation.SCENARIO,

    # Travel
    "airport_checkin": airport_checkin.SCENARIO,
    "hotel_reception": hotel_reception.SCENARIO,
    "taxi_driver": taxi_driver.SCENARIO,
    "train_station": train_station.SCENARIO,

    # Dining & Shopping
    "restaurant_waiter": restaurant_waiter.SCENARIO,
    "electronics_store": electronics_store.SCENARIO,
    "supermarket": supermarket.SCENARIO,
    "clothing_store": clothing_store.SCENARIO,

    # Business
    "business_meeting": business_meeting.SCENARIO,
    "job_interview": job_interview.SCENARIO,
    "client_presentation": client_presentation.SCENARIO,
    "networking_event": networking_event.SCENARIO,

    # Health
    "doctor_appointment": doctor_appointment.SCENARIO,
    "pharmacy": pharmacy.SCENARIO,
    "dentist": dentist.SCENARIO,
    "fitness_trainer": fitness_trainer.SCENARIO,

    # Social
    "coffee_shop": coffee_shop.SCENARIO,
    "movie_theater": movie_theater.SCENARIO,
    "gym_friend": gym_friend.SCENARIO,
    "party_conversation": party_conversation.SCENARIO,
    "library": library.SCENARIO,
}


# ==================== Scenario Query Functions ====================

def get_scenario_by_id(scenario_id: str) -> Dict[str, Any]:
    """Get scenario configuration by ID"""
    return PREDEFINED_SCENARIOS.get(scenario_id)


def get_scenarios_by_category(category: ScenarioCategory) -> List[Dict[str, Any]]:
    """Get scenarios filtered by category"""
    return [
        {"id": scenario_id, **scenario}
        for scenario_id, scenario in PREDEFINED_SCENARIOS.items()
        if scenario["category"] == category
    ]


def get_all_scenarios() -> List[Dict[str, Any]]:
    """Get all predefined scenarios"""
    return [
        {"id": scenario_id, **scenario}
        for scenario_id, scenario in PREDEFINED_SCENARIOS.items()
    ]


# ==================== Prompt Building Functions ====================

def _build_companion_prompt(
    companion: Dict[str, Any],
    language_config: str,
    safety_guidelines: str,
    response_format: str
) -> str:
    """Build companion character system prompt from character config"""
    # Format example dialogues
    dialogue_lines = []
    for d in companion.get("example_dialogues", []):
        dialogue_lines.append(f"User: {d['user']}")
        dialogue_lines.append(f"{companion['name']}: {d['character']}")
        dialogue_lines.append("")
    example_dialogues_str = "\n".join(dialogue_lines).strip()

    # Format taboos
    taboos_str = "\n".join(f"- {t}" for t in companion.get("taboos", []))

    # Format catchphrases
    catchphrases_str = ", ".join(f'"{c}"' for c in companion.get("catchphrases", []))

    return COMPANION_CHAT_TEMPLATE.format(
        character_name=companion["name"],
        age=companion["age"],
        gender=companion["gender"],
        relation_to_user=companion["relation_to_user"],
        personality=companion["personality"],
        speaking_style=companion["speaking_style"],
        catchphrases=catchphrases_str,
        example_dialogues=example_dialogues_str,
        taboos=taboos_str,
        language_config=language_config,
        safety_guidelines=safety_guidelines,
        response_format=response_format,
    )


def _build_character_identity(voice_name: str = None, voice_gender: str = None) -> str:
    """Build character identity description for AI role"""
    if not voice_name and not voice_gender:
        return ""

    parts = []
    if voice_name:
        parts.append(f"Your name is {voice_name}")
    if voice_gender:
        parts.append(f"you are {'male' if voice_gender.lower() == 'male' else 'female'}")
    return " " + ", and ".join(parts) + "."


def _build_language_config(
    difficulty_level: DifficultyLevel,
    english_variant: EnglishVariant,
    conversation_style: ConversationStyle
) -> str:
    """Build language configuration section"""
    return LANGUAGE_CONFIG_TEMPLATE.format(
        difficulty_level=difficulty_level.value,
        difficulty_description=DIFFICULTY_DESCRIPTIONS.get(difficulty_level, "Intermediate level"),
        difficulty_requirements=DIFFICULTY_REQUIREMENTS.get(difficulty_level, "Use standard English appropriate for intermediate learners."),
        english_variant=english_variant.value.title() + " English",
        variant_requirements=VARIANT_REQUIREMENTS.get(english_variant, "Use American English spelling and vocabulary."),
        conversation_style=conversation_style.value,
        style_requirements=get_style_requirements(conversation_style, difficulty_level)
    )


def _build_safety_guidelines(is_free_mode: bool, scenario_name: str = None) -> str:
    """Build safety guidelines section"""
    config = SAFETY_REDIRECT_CONFIG["free_mode" if is_free_mode else "scenario_mode"].copy()

    # Replace {scenario} placeholder in scenario mode
    if not is_free_mode and scenario_name:
        config["example_politics"] = config["example_politics"].format(scenario=scenario_name)

    return SAFETY_GUIDELINES_TEMPLATE.format(**config)


def format_system_prompt(
    scenario_id: str = None,
    difficulty_level: DifficultyLevel = DifficultyLevel.CET4,
    english_variant: EnglishVariant = EnglishVariant.AMERICAN,
    conversation_style: ConversationStyle = ConversationStyle.CASUAL,
    enable_tips: bool = True,  # Deprecated, kept for compatibility
    voice_name: str = None,
    voice_gender: str = None,
    learned_words: list = None
) -> str:
    """
    Format system prompt for Chat Agent (generates ai_message only)

    Note: Tips and Score are now generated by Evaluation Agent.
    Chat Agent only handles roleplay conversation.

    Args:
        scenario_id: Scenario ID, None for free conversation
        difficulty_level: Difficulty level
        english_variant: English variant (American/British)
        conversation_style: Conversation style
        enable_tips: Deprecated, kept for backward compatibility
        voice_name: AI character name
        voice_gender: AI character gender

    Returns:
        Formatted system prompt
    """
    # Determine mode and get scenario
    scenario = None
    is_free_mode = scenario_id is None or scenario_id == "free_conversation"
    is_companion_mode = scenario_id is not None and scenario_id.startswith("companion_")

    if not is_free_mode and not is_companion_mode:
        scenario = get_scenario_by_id(scenario_id)
        if not scenario:
            raise ValueError(f"Scenario not found: {scenario_id}")
        is_free_mode = scenario.get("is_free_mode", False)

    # Build shared modules
    language_config = _build_language_config(difficulty_level, english_variant, conversation_style)
    safety_guidelines = _build_safety_guidelines(True if (is_free_mode or is_companion_mode) else False,
                                                  scenario["scenario"] if scenario else None)
    response_format = RESPONSE_FORMAT_TEMPLATE

    # Build final prompt
    if is_companion_mode:
        # Companion mode — personality-driven character chat
        character_id = scenario_id.replace("companion_", "")
        companion = get_companion_by_id(character_id)
        if not companion:
            raise ValueError(f"Companion character not found: {character_id}")

        prompt = _build_companion_prompt(companion, language_config, safety_guidelines, response_format)

    elif is_free_mode:
        character_identity = _build_character_identity(voice_name, voice_gender)
        prompt = FREE_CONVERSATION_TEMPLATE.format(
            language_config=language_config,
            safety_guidelines=safety_guidelines,
            response_format=response_format,
            character_identity=character_identity
        )
    else:
        character_identity = _build_character_identity(voice_name, voice_gender)
        prompt = BASE_SYSTEM_PROMPT_TEMPLATE.format(
            language_config=language_config,
            safety_guidelines=safety_guidelines,
            response_format=response_format,
            character_identity=character_identity,
            **{k: scenario[k] for k in [
                "ai_role", "role_description", "primary_function", "key_responsibilities",
                "scenario", "scene_details", "vocabulary_focus", "dialogue_principles",
                "role_priority", "interaction_goal"
            ]}
        )

    # Append vocabulary reinforcement if learned words provided
    if learned_words:
        words_str = ", ".join(learned_words[:30])
        vocab_section = f"""

## Vocabulary Reinforcement
The user has recently learned these English words: {words_str}.
Naturally incorporate 1-2 of these words into your responses when contextually appropriate.
Do NOT force them — only use them when they fit the conversation naturally.
Do NOT explicitly mention that you are using their learned words."""
        prompt += vocab_section

    return prompt
