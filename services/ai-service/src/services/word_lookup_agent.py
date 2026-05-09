"""英文单词释义 AI Agent — 支持变形词识别 + 中文释义生成

输入任意英文单词（可能是变形：walked/running/children 等），返回：
- lemma: 原形
- phonetic: 美式 IPA 音标
- partOfSpeech: 主要词性
- meaning: 一句话核心中文释义
- meanings: 最多 6 条常用义项
- notes: 若是变形，一句中文说明
"""
from typing import Dict, Any

from agno.agent import Agent

from utils.ai_helpers import get_ai_model, parse_json_response
from utils.logger import log_info, log_error


PROMPT = """你是一个英汉词典助手。给出英文单词（可能是变形词，如 walked、children、cries），返回严格 JSON：

```json
{{
  "lemma": "原形（base form）；若输入本身就是原形则填相同",
  "phonetic": "**输入词本身**（非 lemma）的 IPA 美式音标，如 gone→/ɡɔːn/、walked→/wɔːkt/、children→/ˈtʃɪldrən/；未知填 null",
  "partOfSpeech": "主要词性：v./n./adj./adv./prep./conj./pron./interj. 等；若不适用填 null",
  "meaning": "**输入词本身**的一句话核心中文释义（1-15 字，最常用义）",
  "meanings": [
    {{"pos": "v.", "definition": "走,步行"}},
    {{"pos": "n.", "definition": "散步"}}
  ],
  "notes": "变形说明（不重复输入词，只说关系）。如 imagining→'imagine 的现在分词'、walked→'walk 的过去式'、children→'child 的复数'；原形词填 null"
}}
```

规则：
- `phonetic` **始终是输入词本身的发音**；例如输入 gone 时返回 /ɡɔːn/（而非 lemma go 的 /ɡoʊ/）
- `meaning` / `meanings` 是**输入词的释义**。变形词和原形释义基本一致（如 walked 的释义和 walk 一致），按常用义给出
- `notes` 用**简短自然中文**描述变形关系，形如 "X 的现在分词/过去式/复数/比较级" 等；不要重复输入词本身，也不要说 "xx 是 yy 的..."
- 输入是**专有名词**（人名地名等），lemma 与输入相同，meaning 简要说明（如 "英格兰"），notes 可为 null
- 输入**不是真实英文词或无法识别**，所有字段返回 null：
  ```json
  {{"lemma":null,"phonetic":null,"partOfSpeech":null,"meaning":null,"meanings":[],"notes":null}}
  ```
- meanings 最多 6 条，按常用度排序
- 严格只输出 JSON，不加任何说明文字或 markdown 围栏

目标单词：{word}"""


async def lookup_word(word: str) -> Dict[str, Any]:
    """对单个英文词查词义；返回词典格式 dict"""
    word = word.strip().lower()
    if not word:
        return _empty_result()

    log_info(f"word_lookup.start: {word}")

    try:
        agent = Agent(
            model=get_ai_model(temperature=0.2),
            instructions=PROMPT.format(word=word),
            markdown=False,
        )
        response = await agent.arun(word)
        raw = response.content if hasattr(response, "content") else str(response)
        parsed = parse_json_response(raw) or {}

        result = {
            "lemma": parsed.get("lemma"),
            "phonetic": parsed.get("phonetic"),
            "partOfSpeech": parsed.get("partOfSpeech"),
            "meaning": parsed.get("meaning"),
            "meanings": _normalize_meanings(parsed.get("meanings")),
            "notes": parsed.get("notes"),
        }
        log_info(f"word_lookup.done: {word} has_meaning={bool(result['meaning'])}")
        return result
    except Exception as e:
        log_error(f"word_lookup.failed: {word}", error=e)
        return _empty_result()


def _normalize_meanings(raw: Any) -> list:
    if not isinstance(raw, list):
        return []
    out = []
    for item in raw[:6]:
        if not isinstance(item, dict):
            continue
        definition = item.get("definition") or item.get("meaning") or ""
        if not definition:
            continue
        out.append({"pos": item.get("pos"), "definition": str(definition).strip()})
    return out


def _empty_result() -> Dict[str, Any]:
    return {
        "lemma": None,
        "phonetic": None,
        "partOfSpeech": None,
        "meaning": None,
        "meanings": [],
        "notes": None,
    }
