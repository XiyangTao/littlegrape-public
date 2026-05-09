"""
Difficulty Level Configuration
"""

from typing import Dict, Any
from common.enums import DifficultyLevel


# Difficulty level descriptions (for Chat Agent)
DIFFICULTY_DESCRIPTIONS = {
    DifficultyLevel.STARTER: "A1/CEFR Beginner - Simple words and basic sentences",
    DifficultyLevel.ELEMENTARY: "A2/CEFR Elementary - Common everyday expressions",
    DifficultyLevel.CET4: "B1/CEFR Intermediate - Standard conversational English",
    DifficultyLevel.CET6: "B2/CEFR Upper-Intermediate - Complex topics and nuanced language",
    DifficultyLevel.IELTS7_TEM8: "C1/CEFR Advanced - Sophisticated vocabulary and structures",
    DifficultyLevel.NATIVE: "C2/CEFR Proficient - Native-level fluency and idioms"
}


# Difficulty level requirements (for Chat Agent)
DIFFICULTY_REQUIREMENTS = {
    DifficultyLevel.STARTER: """**Vocabulary:** 800-1200 common words only
**Grammar:** Present simple, basic questions (What/Where/How)
**Sentences:** Short (5-8 words), one idea per sentence
**Phrasal Verbs:** ❌ AVOID (only: sit down, stand up, come in, go out)
**Idioms:** ❌ AVOID ALL - use literal expressions only
✓ "Hello! How are you?" / "I like coffee." / "Can I have water?"
✗ "figure out", "piece of cake", "I've been wondering...\"""",

    DifficultyLevel.ELEMENTARY: """**Vocabulary:** 2000-3000 common words
**Grammar:** Past simple, future (will/going to), basic modals (can, should)
**Sentences:** 8-12 words, using "and", "but", "because"
**Phrasal Verbs:** ⚠️ Basic only: look at/for, pick up, put down, try on
**Idioms:** ⚠️ Simple only: "take a break", "have fun", "good luck"
✓ "Yesterday I went to the park." / "I would like to try this on."
✗ "figure out", "break the ice", "Had I known...\"""",

    DifficultyLevel.CET4: """**Vocabulary:** 4000-5000 words, common phrasal verbs
**Grammar:** All basic tenses, conditionals (1st & 2nd), passive voice
**Sentences:** Complex with conjunctions (because, although, if)
**Phrasal Verbs:** ✅ Common: figure out, look forward to, work out, check in/out
**Idioms:** ✅ Common: "piece of cake", "break the ice", "by the way"
✓ "If I were you, I would choose the second option."
✗ "Notwithstanding...", obscure phrasal verbs""",

    DifficultyLevel.CET6: """**Vocabulary:** 5500-6500 words, wide range of phrasal verbs
**Grammar:** Perfect continuous, advanced conditionals, subjunctive mood
**Sentences:** Complex and compound-complex, relative clauses
**Phrasal Verbs:** ✅ Advanced: bank on, draw up, iron out, phase out
**Idioms:** ✅ Most: "burn the midnight oil", "back to square one"
✓ "Were it not for your assistance, we couldn't have succeeded."
✓ Using: "nevertheless", "furthermore", "on the other hand\"""",

    DifficultyLevel.IELTS7_TEM8: """**Vocabulary:** 8000-10000 words, sophisticated expressions
**Grammar:** Inversion, cleft sentences, advanced passives
**Sentences:** Sophisticated multi-clause, embedded clauses
**Phrasal Verbs & Idioms:** ✅ Full range including literary/academic
✓ "Rarely have I encountered such a compelling argument."
✓ Using: "albeit", "notwithstanding", "hitherto", "whereby\"""",

    DifficultyLevel.NATIVE: """**Vocabulary:** 10000+ words, slang, colloquialisms, regional variations
**Grammar:** Full mastery including archaic and literary forms
**Sentences:** Complete flexibility, fragments to elaborate periods
**Phrasal Verbs & Idioms:** ✅ EVERYTHING including current slang
✓ "Ain't that the truth!" / "Chef's kiss!" / "No cap, that's lit!"
✓ Cultural references, wordplay, puns, sarcasm, irony"""
}


# Evaluation Agent difficulty configuration (all in English)
EVALUATION_DIFFICULTY_CONFIG = {
    DifficultyLevel.STARTER: {
        "description_en": "A1/CEFR Beginner - Simple vocabulary and basic sentences",
        "severe_grammar_deduct": "0.5",
        "minor_grammar_deduct": "0.25",
        "spelling_deduct": "0.25",
        "native_bonus": "0.5",
        "vocab_bonus": "0.5",
        "adjustment_rules_en": """- Reduce deductions for minor grammar errors by half
- Award "complete sentence" bonus for basic meaning expression
- Simple but correct expressions can earn bonuses
- Be lenient with spelling errors""",
        "tips_style_en": """Point out only 1 most important issue, use simple Chinese
Example: "加 to：I want to book" """
    },
    DifficultyLevel.ELEMENTARY: {
        "description_en": "A2/CEFR Elementary - Common everyday expressions",
        "severe_grammar_deduct": "0.75",
        "minor_grammar_deduct": "0.5",
        "spelling_deduct": "0.5",
        "native_bonus": "0.75",
        "vocab_bonus": "0.75",
        "adjustment_rules_en": """- Minor grammar errors: -0.5 each
- Simple but correct expressions can earn bonuses
- Basic vocabulary usage is acceptable""",
        "tips_style_en": """Point out 1-2 issues with simple explanation
Example: "want 后面要加 to，试试说：I want to book a room" """
    },
    DifficultyLevel.CET4: {
        "description_en": "B1/CEFR Intermediate - Standard conversational English",
        "severe_grammar_deduct": "1",
        "minor_grammar_deduct": "0.5",
        "spelling_deduct": "0.5",
        "native_bonus": "1",
        "vocab_bonus": "1",
        "adjustment_rules_en": """- Standard scoring, no special adjustments
- Expect basic grammar correctness
- Allow minor unnatural expressions""",
        "tips_style_en": """Point out main issues, provide better expressions
Example: "语法：want to + verb. 更自然的说法：I'd like to book a room" """
    },
    DifficultyLevel.CET6: {
        "description_en": "B2/CEFR Upper-Intermediate - Complex topics and nuanced language",
        "severe_grammar_deduct": "1.5",
        "minor_grammar_deduct": "0.75",
        "spelling_deduct": "0.75",
        "native_bonus": "1",
        "vocab_bonus": "1",
        "adjustment_rules_en": """- Increase deductions for grammar errors
- Require more natural expressions for "native" bonus
- Expect richer vocabulary usage""",
        "tips_style_en": """Detailed analysis, provide multiple alternatives
Example: "基础语法问题：缺少 to 和冠词。建议：I'd like to book a room / Could I reserve a room?" """
    },
    DifficultyLevel.IELTS7_TEM8: {
        "description_en": "C1/CEFR Advanced - Precise vocabulary and complex structures",
        "severe_grammar_deduct": "2",
        "minor_grammar_deduct": "1",
        "spelling_deduct": "1",
        "native_bonus": "1",
        "vocab_bonus": "1",
        "adjustment_rules_en": """- Double deductions for all grammar errors
- Only advanced expressions earn bonuses
- Require precise vocabulary and idiomatic usage""",
        "tips_style_en": """Deep analysis, emphasize naturalness and advanced expressions
Example: "语法需修正。更地道的表达：I was wondering if I could book a room" """
    },
    DifficultyLevel.NATIVE: {
        "description_en": "C2/CEFR Proficient - Native-level fluency",
        "severe_grammar_deduct": "2",
        "minor_grammar_deduct": "1",
        "spelling_deduct": "1",
        "native_bonus": "1",
        "vocab_bonus": "1",
        "adjustment_rules_en": """- Judge by native speaker standards
- Require completely natural and idiomatic usage
- Any unnatural expression affects the score""",
        "tips_style_en": """Analyze from native speaker perspective, provide most idiomatic expressions
Example: "虽然语法正确，但母语者更常说：Any chance you have a room available?" """
    }
}


def get_difficulty_config(difficulty_level: DifficultyLevel) -> Dict[str, Any]:
    """Get evaluation config for specified difficulty level"""
    return EVALUATION_DIFFICULTY_CONFIG.get(
        difficulty_level,
        EVALUATION_DIFFICULTY_CONFIG[DifficultyLevel.CET4]
    )


def get_difficulty_tier(difficulty_level: DifficultyLevel) -> str:
    """Get difficulty tier: low/mid/high"""
    if difficulty_level in [DifficultyLevel.STARTER, DifficultyLevel.ELEMENTARY]:
        return "low"
    elif difficulty_level in [DifficultyLevel.CET4, DifficultyLevel.CET6]:
        return "mid"
    else:
        return "high"
