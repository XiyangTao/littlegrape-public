"""
Custom Scenario System Prompt Generator
Validates user input and generates scenario elements in one AI call
"""

from typing import Dict, Any, Optional

from agno.agent import Agent
from pydantic import BaseModel, Field

from common.enums import DifficultyLevel, EnglishVariant, ConversationStyle
from config.prompts.templates import (
    BASE_SYSTEM_PROMPT_TEMPLATE,
    RESPONSE_FORMAT_TEMPLATE,
    SAFETY_REDIRECT_CONFIG,
    SAFETY_GUIDELINES_TEMPLATE,
)
from utils.ai_helpers import get_ai_model
from utils.logger import log_info, log_error

from .prompt_generator import _build_character_identity, _build_language_config


class ScenarioGenerationResult(BaseModel):
    """Scenario generation result model"""
    is_valid: bool = Field(..., description="Whether input is valid")
    rejection_reason: Optional[str] = Field(default=None, description="Rejection reason (when invalid)")
    role_description: Optional[str] = Field(default=None, description="Role description")
    primary_function: Optional[str] = Field(default=None, description="Primary function")
    key_responsibilities: Optional[str] = Field(default=None, description="Key responsibilities list")
    scene_details: Optional[str] = Field(default=None, description="Scene details")
    vocabulary_focus: Optional[str] = Field(default=None, description="Vocabulary focus area")
    dialogue_principles: Optional[str] = Field(default=None, description="Dialogue principles")
    role_priority: Optional[str] = Field(default=None, description="Role priority description")
    interaction_goal: Optional[str] = Field(default=None, description="Interaction goal")


class CustomScenarioGenerator:
    """Custom scenario system prompt generator"""

    def __init__(self):
        pass

    async def generate(
        self,
        ai_role: str,
        scenario_description: str,
        difficulty_level: DifficultyLevel = DifficultyLevel.CET4,
        english_variant: EnglishVariant = EnglishVariant.AMERICAN,
        conversation_style: ConversationStyle = ConversationStyle.CASUAL,
        enable_tips: bool = True,  # Deprecated, kept for compatibility
        voice_name: str = None,
        voice_gender: str = None
    ) -> Dict[str, Any]:
        """
        Generate system prompt for custom scenario (optimized: single AI call)
        """
        try:
            log_info(f"Generating custom scenario: role={ai_role}, scenario={scenario_description[:50]}...")

            # Single AI call: validate + generate scenario elements
            generation_result = await self._validate_and_generate(ai_role, scenario_description)

            token_usage = generation_result.get("token_usage")

            if not generation_result["is_valid"]:
                return {
                    "success": False,
                    "error": generation_result["rejection_reason"],
                    "error_type": "content_rejected",
                    "token_usage": token_usage
                }

            # Build complete system prompt using templates
            system_prompt = self._build_system_prompt(
                ai_role=ai_role,
                scenario_description=scenario_description,
                generation_result=generation_result,
                difficulty_level=difficulty_level,
                english_variant=english_variant,
                conversation_style=conversation_style,
                voice_name=voice_name,
                voice_gender=voice_gender
            )

            log_info(f"Custom scenario system prompt generated successfully, tokens={token_usage['total_tokens'] if token_usage else 0}")
            return {
                "success": True,
                "system_prompt": system_prompt,
                "token_usage": token_usage
            }

        except Exception as e:
            log_error(f"Failed to generate custom scenario: {e}", e)
            return {
                "success": False,
                "error": "自定义场景内容不合适",
                "error_type": "generation_error",
                "token_usage": None
            }

    async def _validate_and_generate(self, ai_role: str, scenario_description: str) -> Dict[str, Any]:
        """
        Validate and generate scenario elements in one AI call
        """
        model = get_ai_model()

        instructions = """You are a content reviewer and scenario designer for an English learning app.

## Task
1. First, check if the user's input is appropriate for English learning
2. If appropriate, generate scenario elements for the roleplay

## Content Rules - REJECT if any of these:
- Sexual, romantic, or intimate content
- Violence, weapons, gore
- Specific political opinions, parties, or events
- Illegal activities (drugs, hacking, fraud)
- Hate speech, discrimination
- Religious extremism

## ACCEPT these (even if they seem sensitive):
- Professional roles: news anchor, reporter, government clerk (as long as no political opinions)
- Service roles: any customer service scenario
- Educational roles: teachers, tutors, coaches
- Healthcare: doctors, nurses (general medical scenarios)

## When generating scenario elements (STRICT FORMAT RULES):
- role_description: A noun phrase (e.g., "a friendly librarian at a public library"). MUST NOT start with "I am", "You are", or "I". Will be used after "You are".
- primary_function: A verb phrase in base form (e.g., "help customers find books", "guide visitors through the museum"). MUST NOT start with "To", "I", or "You". Will be used after "to".
- key_responsibilities: 3-4 bullet points starting with "- " (e.g., "- Greet customers warmly")
- scene_details: Description of the setting (2-3 sentences)
- vocabulary_focus: The domain of vocabulary (e.g., "restaurant and dining")
- dialogue_principles: 2-3 bullet points starting with "- " (e.g., "- Keep responses concise")
- role_priority: A short noun phrase (e.g., "a helpful waiter", "a knowledgeable guide"). MUST NOT start with "I am" or "You are". Will be used after "You are".
- interaction_goal: A complete sentence with subject (e.g., "Your goal is to help the user practice ordering food", "The aim is to guide the customer through the booking process"). MUST NOT start with "To".

Output MUST be a valid JSON matching the schema."""

        agent = Agent(
            model=model,
            instructions=instructions,
            output_schema=ScenarioGenerationResult,
            markdown=False
        )

        request = f"""Please review and process this English learning scenario:

AI Role: {ai_role}
Scenario: {scenario_description}

If the content is appropriate, generate the scenario elements.
If inappropriate, set is_valid=false and provide a brief rejection_reason in Chinese."""

        response = await agent.arun(request, stream=False)
        result = response.content

        # 提取 token 使用信息
        metrics = getattr(response, 'metrics', None)
        token_usage = {
            "input_tokens": getattr(metrics, 'input_tokens', 0) if metrics else 0,
            "output_tokens": getattr(metrics, 'output_tokens', 0) if metrics else 0,
            "total_tokens": getattr(metrics, 'total_tokens', 0) if metrics else 0
        }

        return {
            "is_valid": result.is_valid,
            "rejection_reason": result.rejection_reason,
            "role_description": result.role_description,
            "primary_function": result.primary_function,
            "key_responsibilities": result.key_responsibilities,
            "scene_details": result.scene_details,
            "vocabulary_focus": result.vocabulary_focus,
            "dialogue_principles": result.dialogue_principles,
            "role_priority": result.role_priority,
            "interaction_goal": result.interaction_goal,
            "token_usage": token_usage
        }

    def _build_system_prompt(
        self,
        ai_role: str,
        scenario_description: str,
        generation_result: Dict[str, Any],
        difficulty_level: DifficultyLevel,
        english_variant: EnglishVariant,
        conversation_style: ConversationStyle,
        voice_name: str = None,
        voice_gender: str = None
    ) -> str:
        """Build complete system prompt using templates"""

        # Build shared modules (reuse helper functions)
        language_config = _build_language_config(difficulty_level, english_variant, conversation_style)
        character_identity = _build_character_identity(voice_name, voice_gender)

        # Safety guidelines (custom scenarios use professional tone)
        config = SAFETY_REDIRECT_CONFIG["scenario_mode"].copy()
        config["example_politics"] = config["example_politics"].format(scenario=scenario_description)
        safety_guidelines = SAFETY_GUIDELINES_TEMPLATE.format(**config)

        # Response format (simplified - only ai_message)
        response_format = RESPONSE_FORMAT_TEMPLATE

        # Build using base template
        return BASE_SYSTEM_PROMPT_TEMPLATE.format(
            language_config=language_config,
            safety_guidelines=safety_guidelines,
            response_format=response_format,
            character_identity=character_identity,
            ai_role=ai_role,
            role_description=generation_result.get("role_description", f"a {ai_role}"),
            primary_function=generation_result.get("primary_function", f"help with {scenario_description}"),
            key_responsibilities=generation_result.get("key_responsibilities", "- Engage in natural conversation\n- Help practice English"),
            scenario=scenario_description,
            scene_details=generation_result.get("scene_details", scenario_description),
            vocabulary_focus=generation_result.get("vocabulary_focus", "general conversation"),
            dialogue_principles=generation_result.get("dialogue_principles", "- Keep conversation natural\n- Be helpful and patient"),
            role_priority=generation_result.get("role_priority", f"a helpful {ai_role}"),
            interaction_goal=generation_result.get("interaction_goal", "Help the user practice English in a realistic scenario")
        )


# 全局实例
custom_scenario_generator = CustomScenarioGenerator()
