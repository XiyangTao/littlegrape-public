"""
English Variant Configuration
"""

from common.enums import EnglishVariant


# English variant descriptions
ENGLISH_VARIANT_DESCRIPTIONS = {
    EnglishVariant.AMERICAN: "American English (e.g., 'color', 'center', 'apartment')",
    EnglishVariant.BRITISH: "British English (e.g., 'colour', 'centre', 'flat')"
}


# English variant requirements (for Chat Agent)
VARIANT_REQUIREMENTS = {
    EnglishVariant.AMERICAN: """**Spelling Rules:**
- Use -or endings: color, favor, honor, behavior
- Use -er endings: center, theater, meter
- Use -ize endings: realize, organize, recognize
- Single 'l': traveled, canceled, modeling
- Use -ense: defense, offense, license

**Vocabulary Preferences:**
- apartment (not flat), elevator (not lift), vacation (not holiday)
- truck (not lorry), gas (not petrol), sidewalk (not pavement)
- cookies (not biscuits), fries (not chips), candy (not sweets)
- fall (not autumn), trash (not rubbish), movie (not film)

**Grammar & Usage:**
- Use "on the weekend" (not "at the weekend")
- Use "different from/than" (not "different to")
- Past participles: gotten (not got), learned (not learnt)

**Date Format:** Month/Day/Year (e.g., 12/25/2024)
**Time:** Use 12-hour format with AM/PM (e.g., 3:00 PM)

**Examples:**
  ✓ "I'm going to the movies this weekend."
  ✓ "Could you mail this letter at the post office?"
  ✓ "The theater is in the center of downtown."
  ✗ "I'm going to the cinema at the weekend."
  ✗ "Could you post this letter?"
""",

    EnglishVariant.BRITISH: """**Spelling Rules:**
- Use -our endings: colour, favour, honour, behaviour
- Use -re endings: centre, theatre, metre
- Use -ise/-ize: realise/realize, organise/organize (both acceptable)
- Double 'l': travelled, cancelled, modelling
- Use -ence: defence, offence, licence (noun)

**Vocabulary Preferences:**
- flat (not apartment), lift (not elevator), holiday (not vacation)
- lorry (not truck), petrol (not gas), pavement (not sidewalk)
- biscuits (not cookies), chips (not fries), sweets (not candy)
- autumn (not fall), rubbish (not trash), film (not movie)

**Grammar & Usage:**
- Use "at the weekend" (not "on the weekend")
- Use "different from/to" (not "different than")
- Past participles: got (not gotten), learnt/learned (both ok)
- Use "have got" more frequently: "Have you got...?" vs "Do you have...?"

**Date Format:** Day/Month/Year (e.g., 25/12/2024)
**Time:** Use 24-hour format more commonly (e.g., 15:00 or 3 o'clock)

**Examples:**
  ✓ "I'm going to the cinema at the weekend."
  ✓ "Could you post this letter?"
  ✓ "The theatre is in the centre of town."
  ✗ "I'm going to the movies this weekend."
  ✗ "Could you mail this letter at the post office?"
"""
}


def get_variant_rules_en(english_variant: EnglishVariant) -> str:
    """Get English variant rules for Evaluation Agent (in English)"""
    if english_variant == EnglishVariant.AMERICAN:
        return """**American English Standard**
- Spelling: color, center, realize, traveled
- Vocabulary: apartment, elevator, vacation, truck, gas
- If user uses British spelling/vocabulary, gently suggest American alternatives in tips
- Do NOT deduct points for British usage, but tips may suggest American alternatives"""
    else:
        return """**British English Standard**
- Spelling: colour, centre, realise, travelled
- Vocabulary: flat, lift, holiday, lorry, petrol
- If user uses American spelling/vocabulary, gently suggest British alternatives in tips
- Do NOT deduct points for American usage, but tips may suggest British alternatives"""
