"""
对话风格配置
"""

from common.enums import ConversationStyle, DifficultyLevel
from .difficulty_config import get_difficulty_tier


# 对话风格描述
CONVERSATION_STYLE_DESCRIPTIONS = {
    ConversationStyle.FORMAL: "formal and professional",
    ConversationStyle.CASUAL: "casual and friendly",
    ConversationStyle.SLANG: "colloquial with slang and idioms"
}


# 对话风格基础要求
STYLE_BASE_REQUIREMENTS = {
    ConversationStyle.FORMAL: """**⚠️ RULE: Difficulty level controls complexity; Formal style controls register.**

**Characteristics:**
- Avoid contractions: use "do not", "cannot", "I am"
- Polite forms: "Would you mind...", "Could you please..."
- Formal vocabulary at CET4+: "assist" (not help), "purchase" (not buy)
- Avoid slang and casual expressions
- Use passive voice when appropriate

**Tone:** Professional, respectful, courteous
✓ "Good morning. How may I assist you?"
✗ "Hey! What's up?" / "Yeah, no worries!\"""",

    ConversationStyle.CASUAL: """**⚠️ RULE: Difficulty level controls complexity; Casual style controls tone.**

**Characteristics:**
- Use contractions: I'm, you're, don't, can't, won't
- Everyday vocabulary: get, have, make, do
- Simple, direct expressions
- Friendly and relaxed

**Tone:** Warm, approachable, conversational
✓ "Hey! How's it going?" / "I'd love to help you with that!"
✗ "Good morning. How may I be of service?" (too formal)""",

    ConversationStyle.SLANG: """**⚠️ RULE: Difficulty level controls complexity; Slang style controls delivery.**

**Characteristics:**
- Informal contractions: gonna, wanna, gotta, kinda
- Slang terms: cool, awesome, lit, dope
- Filler words: like, you know, I mean
- Colloquial expressions: "What's up?", "No way!"

**Tone:** Very casual, youth culture, expressive
✓ "Yo! What's up?" / "That's so cool!"
✗ "Good morning. How may I assist you?\""""
}


# 风格+难度组合的动态示例
STYLE_DIFFICULTY_EXAMPLES = {
    ConversationStyle.FORMAL: {
        "low": '✓ "Hello. I can help you." (simple but polite)',
        "mid": '✓ "Good morning. How may I assist you with your inquiry?"',
        "high": '✓ "Were it not for the circumstances, I would be delighted to elaborate further."'
    },
    ConversationStyle.CASUAL: {
        "low": '✓ "Hello! I like your bag. It is nice." (simple + friendly)',
        "mid": '✓ "Hey! Let me figure out the best option for you."',
        "high": '✓ "Oh wow, had I realized this sooner, I definitely would\'ve approached it differently!"'
    },
    ConversationStyle.SLANG: {
        "low": '✓ "Hey! That\'s cool!" (simple slang)',
        "mid": '✓ "Like, that\'s gonna be awesome! I\'m totally down for that."',
        "high": '✓ "Bruh, notwithstanding all the chaos, we pulled it off—no cap, that\'s iconic."'
    }
}


def get_style_requirements(style: ConversationStyle, difficulty_level: DifficultyLevel) -> str:
    """根据风格和难度动态生成风格要求"""
    base = STYLE_BASE_REQUIREMENTS.get(style, "")
    tier = get_difficulty_tier(difficulty_level)
    example = STYLE_DIFFICULTY_EXAMPLES.get(style, {}).get(tier, "")

    if example:
        return f"{base}\n\n**Example for your difficulty level:**\n{example}"
    return base
