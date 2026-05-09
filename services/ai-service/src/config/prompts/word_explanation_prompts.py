"""
单词 AI 解说提示词配置
"""

WORD_EXPLANATION_SYSTEM_PROMPT = """你是一位专业的英语教师，擅长用生动有趣的方式讲解英语单词。

你的任务是根据提供的单词信息，生成一段自然流畅的中英混合解说文稿，帮助中国学生更好地记忆和理解这个单词。

## 输出要求

1. **语言风格**：中文为主，单词本身、例句用英文
2. **长度控制**：100-200字，适合15-30秒的语音播放
3. **内容结构**：
   - 直接从单词开始，不要任何开场白（如"今天我们来聊聊"、"让我们来看看"等）
   - 介绍单词的主要含义，不需要单词音标
   - 如果有词源信息，用简洁有趣的方式讲解词根词缀
   - 给出一个实用的例句
   - 如果有常用搭配，提及1-2个最重要的
4. **表达方式**：
   - 像在和学生聊天一样自然
   - 避免生硬的"首先、其次、最后"等过度结构化的表达
   - 可以适当加入一些帮助记忆的小技巧

## 输出格式

直接输出解说文稿，不需要任何 JSON 格式或标记。

**重要：输出必须是纯文本，不要使用任何 Markdown 格式（如 **加粗**、*斜体*、`代码` 等），因为这段文字将被用于语音合成（TTS）。**
"""


def build_word_explanation_request(
    word: str,
    phonetic: str,
    meanings: list,
    examples: list = None,
    collocations: list = None,
    etymology: dict = None
) -> str:
    """
    构建单词解说请求

    Args:
        word: 单词
        phonetic: 音标
        meanings: 义项列表，每个包含 pos, meaningCn, meaningEn
        examples: 例句列表，每个包含 en, cn
        collocations: 搭配列表
        etymology: 词源信息，包含 roots 和 affixes
    """
    parts = [f"请为以下单词生成解说文稿：\n"]
    parts.append(f"**单词**: {word}")
    if phonetic:
        parts.append(f"**音标**: {phonetic}")

    # 释义
    if meanings:
        parts.append("\n**释义**:")
        for i, m in enumerate(meanings[:3], 1):  # 最多取3个义项
            pos = m.get('pos', '')
            cn = m.get('meaningCn', '')
            en = m.get('meaningEn', '')
            if pos and cn:
                meaning_str = f"{i}. [{pos}] {cn}"
                if en:
                    meaning_str += f" ({en})"
                parts.append(meaning_str)

    # 例句
    if examples:
        parts.append("\n**例句**:")
        for ex in examples[:2]:  # 最多取2个例句
            en = ex.get('en', '')
            cn = ex.get('cn', '')
            if en:
                parts.append(f"- {en}")
                if cn:
                    parts.append(f"  {cn}")

    # 搭配
    if collocations:
        parts.append("\n**常用搭配**:")
        for col in collocations[:3]:  # 最多取3个搭配
            parts.append(f"- {col}")

    # 词源
    if etymology:
        roots = etymology.get('roots', [])
        affixes = etymology.get('affixes', [])
        if roots or affixes:
            parts.append("\n**词根词缀**:")
            for root in roots[:2]:
                root_text = root.get('root', '')
                meaning = root.get('meaning', '')
                if root_text and meaning:
                    parts.append(f"- 词根 {root_text}: {meaning}")
            for affix in affixes[:2]:
                affix_text = affix.get('affix', '')
                affix_type = affix.get('type', '')
                meaning = affix.get('meaning', '')
                if affix_text and meaning:
                    type_label = "前缀" if affix_type == "prefix" else "后缀" if affix_type == "suffix" else affix_type
                    parts.append(f"- {type_label} {affix_text}: {meaning}")

    return "\n".join(parts)
