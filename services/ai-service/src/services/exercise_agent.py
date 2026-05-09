"""多邻国式练习题生成 Agent — 10 种题型 + 答案解释 + 冒险场景对话"""
import json
import uuid
import random
from typing import Dict, Any, List

from agno.agent import Agent

from utils.ai_helpers import get_ai_model, parse_json_response
from utils.logger import log_info, log_error


# ==================== 各题型 Prompt ====================

PROMPTS: Dict[str, str] = {
    # 1. 翻译句子 (Translation)
    "translation": """你是英语翻译题出题专家。请生成中译英翻译练习题。

要求：
- 生成 {count} 道题
- 主题：{topic}
- 难度：{difficulty}（easy=简单日常句, medium=稍复杂句式, hard=从句/虚拟语气等）

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "translation",
      "sentenceCn": "中文原句",
      "answer": "正确英文翻译",
      "acceptableAnswers": ["其他可接受的翻译1", "其他可接受的翻译2"],
      "words": ["I", "went", "to", "the", "park", "yesterday", "a", "in", "go"]
    }}
  ]
}}

注意：
- words 是词库模式的可选词块，包含正确答案的所有单词 + 2-3 个干扰词
- 干扰词要语法相关但不属于正确答案（如正确用 to，干扰用 in/at）
- acceptableAnswers 提供 1-2 种替代翻译
- 严格返回合法 JSON""",

    # 2. 句子排词 (Sentence Shuffle)
    "sentence_shuffle": """你是英语排词题出题专家。请生成句子排词练习题。

要求：
- 生成 {count} 道题
- 主题：{topic}
- 难度：{difficulty}

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "sentence_shuffle",
      "sentenceCn": "她每天早上喝咖啡。",
      "correctWords": ["She", "drinks", "coffee", "every", "morning"],
      "shuffledWords": ["coffee", "She", "in", "every", "drinks", "morning", "at"]
    }}
  ]
}}

注意：
- correctWords 是正确顺序的英文词块
- shuffledWords 包含 correctWords 的所有单词（打乱顺序）+ 2-3 个干扰词
- 干扰词要与主题或语法相关，具有迷惑性
- 严格返回合法 JSON""",

    # 3. 听写句子 (Dictation)
    "dictation": """你是英语听写题出题专家。请生成听写练习句子。

要求：
- 生成 {count} 道题
- 主题：{topic}
- 难度：{difficulty}（easy=5-8词简单句, medium=8-12词日常句, hard=12-16词复杂句）

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "dictation",
      "sentence": "The cat is sleeping on the sofa.",
      "sentenceCn": "猫正在沙发上睡觉。"
    }}
  ]
}}

注意：
- 句子要自然地道，适合听写
- 避免生僻词，发音要清晰可辨
- 严格返回合法 JSON""",

    # 4. 听音辨词 (Listen Choice)
    "listen_choice": """你是英语听力辨音题出题专家。请生成听音选择练习题。

要求：
- 生成 {count} 道题
- 主题：{topic}
- 难度：{difficulty}

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "listen_choice",
      "audio": "through",
      "options": ["through", "though", "thorough", "thought"],
      "answer": "through"
    }}
  ]
}}

注意：
- audio 是正确的单词或短语（将用于 TTS 播放）
- options 包含 4 个选项，其中 1 个正确，3 个为形近词或音近词
- answer 必须是 options 中的一个元素
- 干扰项要发音或拼写相近，具有辨别难度
- easy: 简单常见词; medium: 易混淆词对; hard: 复杂拼写/发音词
- 严格返回合法 JSON""",

    # 5. 朗读句子 (Read Aloud)
    "read_aloud": """你是英语口语练习出题专家。请生成朗读练习句子。

要求：
- 生成 {count} 道题
- 主题：{topic}
- 难度：{difficulty}

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "read_aloud",
      "sentence": "The weather is beautiful today.",
      "sentenceCn": "今天天气真好。"
    }}
  ]
}}

注意：
- 句子要包含丰富的语音特征（连读、重音、语调变化）
- easy: 短句5-8词; medium: 中等句8-12词含连读; hard: 长句12+词含从句
- 严格返回合法 JSON""",

    # 6. 词汇配对 (Matching Pairs)
    "matching_pairs": """你是英语词汇配对题出题专家。请生成中英词汇配对练习。

要求：
- 生成 1 组配对题，包含 5 对中英词汇
- 主题：{topic}
- 难度：{difficulty}

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "matching_pairs",
      "pairs": [
        {{"english": "apple", "chinese": "苹果"}},
        {{"english": "banana", "chinese": "香蕉"}},
        {{"english": "orange", "chinese": "橙子"}},
        {{"english": "grape", "chinese": "葡萄"}},
        {{"english": "mango", "chinese": "芒果"}}
      ]
    }}
  ]
}}

注意：
- 5 对词汇，同一主题下的相关词
- 词汇间要有一定迷惑性（如近义词、同类词）
- easy: 基础高频词; medium: 中等词汇; hard: 不常见或多义词
- 严格返回合法 JSON""",

    # 7. 选词填空 (Fill Blank)
    "fill_blank": """你是英语选词填空题出题专家。请生成选词填空练习。

要求：
- 生成 {count} 道题
- 主题：{topic}
- 难度：{difficulty}

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "fill_blank",
      "sentence": "She _____ to school every day.",
      "options": ["goes", "going", "gone", "go"],
      "answer": "goes",
      "explanation": "主语 She 是第三人称单数，一般现在时动词要加 -s。"
    }}
  ]
}}

注意：
- sentence 中用 _____ 表示空白，每题仅一个空
- options 提供 4 个选项，answer 必须在 options 中
- 干扰项要有语法层面的迷惑性（如时态、人称变化等）
- explanation 用中文简洁解析
- 严格返回合法 JSON""",

    # 8. 选择正确翻译 (Meaning Choice)
    "meaning_choice": """你是英语翻译选择题出题专家。请生成英译中选择练习。

要求：
- 生成 {count} 道题
- 主题：{topic}
- 难度：{difficulty}

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "meaning_choice",
      "sentence": "I can't stand the noise.",
      "options": ["我不能站在噪音里", "我受不了这个噪音", "我不能停止噪音", "我站不起来"],
      "answer": "我受不了这个噪音"
    }}
  ]
}}

注意：
- sentence 是英文句子
- options 提供 4 个中文翻译选项，1 正确 + 3 干扰
- 干扰项要"似是而非"——可以是字面翻译、词义混淆或语法理解错误
- answer 必须在 options 中
- easy: 简单直译句; medium: 含习语/多义词; hard: 复杂句式/隐含义
- 严格返回合法 JSON""",

    # 9. 补全翻译 (Complete Translation)
    "complete_translation": """你是英语补全翻译题出题专家。请生成补全翻译练习。

要求：
- 生成 {count} 道题
- 主题：{topic}
- 难度：{difficulty}

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "complete_translation",
      "sentenceCn": "她每天早上喝咖啡。",
      "sentenceEn": "She drinks coffee every _____.",
      "answer": "morning",
      "hint": "m______"
    }}
  ]
}}

注意：
- sentenceEn 中用 _____ 表示缺失的单词，只挖一个词
- 挖掉的词应是有学习价值的关键词（名词/动词/形容词/副词）
- hint 给出首字母 + 下划线（长度近似原词）
- 严格返回合法 JSON""",

    # 10. 阅读理解 (Read and Respond)
    "read_respond": """你是英语阅读理解出题专家。请生成单句词义理解练习。

要求：
- 生成 {count} 道题
- 主题：{topic}
- 难度：{difficulty}

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "read_respond",
      "sentence": "He was completely baffled by the question.",
      "highlightWord": "baffled",
      "options": ["困惑的", "高兴的", "无聊的"],
      "answer": "困惑的"
    }}
  ]
}}

注意：
- sentence 是完整英文句子
- highlightWord 是句中值得理解的词或短语（可以是生词、多义词或习语）
- options 提供 3 个中文含义选项，1 正确 + 2 干扰
- answer 必须在 options 中
- highlightWord 必须在 sentence 中出现
- easy: 常见多义词; medium: 中等难度词汇; hard: 低频词/习语
- 严格返回合法 JSON""",

    # 11. 排列单词 (Arrange Words — 根据英文提示排列词块)
    "arrange_words": """你是英语排词题出题专家。请生成根据提示排列单词的练习题。

要求：
- 生成 {count} 道题
- 主题：{topic}
- 难度：{difficulty}（easy=5-7词简单句, medium=7-10词日常句, hard=10+词含从句）

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "arrange_words",
      "hint": "她每天早上喝一杯咖啡。",
      "correctWords": ["She", "drinks", "a", "cup", "of", "coffee", "every", "morning"],
      "shuffledWords": ["morning", "She", "a", "every", "drinks", "of", "coffee", "cup", "in", "the"]
    }}
  ]
}}

注意：
- hint 是中文含义提示，帮助用户理解要排列的句子
- correctWords 是正确顺序的英文词块
- shuffledWords 包含 correctWords 的所有单词（打乱顺序）+ 2-3 个干扰词
- 干扰词要与主题或语法相关，具有迷惑性
- 严格返回合法 JSON""",

    # 12. 最小对立对 (Minimal Pairs — 听发音选择正确的词)
    "minimal_pairs": """你是英语语音辨析题出题专家。请生成最小对立对（minimal pairs）听力辨析题。

要求：
- 生成 {count} 道题
- 主题：{topic}
- 难度：{difficulty}（easy=元音差异明显, medium=辅音对立如b/p, hard=/θ/ð/等易混淆音）

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "minimal_pairs",
      "targetWord": "ship",
      "pairWord": "sheep",
      "options": ["ship", "sheep"]
    }}
  ]
}}

注意：
- targetWord 是播放的正确单词（用于 TTS）
- pairWord 是与 targetWord 构成最小对立对的近音词
- options 是两个选项，包含 targetWord 和 pairWord，顺序随机
- 两个词的发音差异应该只在一个音素上（如 /ɪ/ vs /iː/）
- 严格返回合法 JSON""",

    # 13. 听力填空 (Listen Fill — 听句子选择填空)
    "listen_fill": """你是英语听力填空题出题专家。请生成听句子填空练习。

要求：
- 生成 {count} 道题
- 主题：{topic}
- 难度：{difficulty}（easy=挖常见名词/动词, medium=挖介词/连词, hard=挖易混淆词/短语）

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "listen_fill",
      "sentence": "I went to the store to buy some milk.",
      "sentenceCn": "我去商店买了一些牛奶。",
      "blankSentence": "I went to the store to buy some _____.",
      "options": ["milk", "silk", "meal", "mall"],
      "answer": "milk"
    }}
  ]
}}

注意：
- sentence 是完整句子（用于 TTS 播放）
- sentenceCn 是中文翻译
- blankSentence 是挖空后的句子，用 _____ 表示空白
- options 提供 4 个选项，含正确答案和 3 个音近或义近干扰词
- answer 必须在 options 中
- 严格返回合法 JSON""",

    # 14. 跟读重复 (Listen Repeat — 听并跟读句子)
    "listen_repeat": """你是英语口语跟读题出题专家。请生成听力跟读练习句子。

要求：
- 生成 {count} 道题
- 主题：{topic}
- 难度：{difficulty}（easy=5-8词短句, medium=8-12词含连读弱读, hard=12+词含从句/强调）

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "listen_repeat",
      "sentence": "Could you tell me how to get to the nearest subway station?",
      "sentenceCn": "你能告诉我怎么去最近的地铁站吗？"
    }}
  ]
}}

注意：
- sentence 是要跟读的英文句子，发音清晰自然
- sentenceCn 是中文翻译，帮助理解
- 选择包含丰富语音特征的句子（连读、弱读、语调变化等）
- 严格返回合法 JSON""",

    # 15. 口语翻译 (Speak Translation — 看中文说英文)
    "speak_translation": """你是英语口语翻译题出题专家。请生成看中文说英文的口语练习。

要求：
- 生成 {count} 道题
- 主题：{topic}
- 难度：{difficulty}（easy=简单日常短句, medium=稍复杂实用句, hard=含从句/习语）

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "speak_translation",
      "sentenceCn": "请问洗手间在哪里？",
      "expectedEnglish": "Excuse me, where is the restroom?",
      "acceptableAnswers": ["Where is the bathroom?", "Could you tell me where the restroom is?"]
    }}
  ]
}}

注意：
- sentenceCn 是展示给用户的中文句子
- expectedEnglish 是标准的英文翻译
- acceptableAnswers 提供 1-3 种可接受的替代翻译
- 句子要自然地道，实用性强
- 严格返回合法 JSON""",

    # 16. 词汇闪卡 (Flashcard — 翻转学习)
    "flashcard": """你是英语词汇教学专家。请生成词汇闪卡学习内容。

要求：
- 生成 {count} 张闪卡
- 主题：{topic}
- 难度：{difficulty}（easy=基础高频词, medium=中等实用词, hard=高级/学术词汇）

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "flashcard",
      "word": "resilient",
      "phonetic": "/rɪˈzɪliənt/",
      "meaningCn": "有弹性的；能迅速恢复的",
      "exampleSentence": "Children are often more resilient than we think.",
      "exampleSentenceCn": "孩子们往往比我们想象的更有韧性。"
    }}
  ]
}}

注意：
- word 是英文单词
- phonetic 是国际音标
- meaningCn 是中文释义，简洁准确
- exampleSentence 是自然地道的例句
- exampleSentenceCn 是例句的中文翻译
- 严格返回合法 JSON""",

    # 17. 沉浸式填空 (Immersive Fill — 段落阅读 + 填空)
    "immersive_fill": """你是英语沉浸式阅读出题专家。请生成段落阅读填空练习。

要求：
- 生成 {count} 道题
- 主题：{topic}
- 难度：{difficulty}（easy=简单段落100词内, medium=中等段落150词内, hard=复杂段落200词内）

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "immersive_fill",
      "passage": "The city park is a wonderful place to relax. Every morning, many people come here to exercise. Some people jog along the paths, while others practice tai chi under the trees.",
      "blankSentence": "Every morning, many people come here to _____.",
      "options": ["exercise", "sleep", "work", "study"],
      "answer": "exercise",
      "explanation": "根据段落描述，人们早上来公园是为了锻炼（exercise），后面提到了慢跑和太极拳等运动方式。"
    }}
  ]
}}

注意：
- passage 是完整的英文段落
- blankSentence 是从段落中提取并挖空的句子，用 _____ 表示
- options 提供 4 个选项，answer 必须在 options 中
- explanation 用中文解释答案
- 挖空的词应来自段落上下文可推断的关键词
- 严格返回合法 JSON""",

    # 18. 沉浸式阅读 (Immersive Reading — 段落 + 理解题)
    "immersive_reading": """你是英语阅读理解出题专家。请生成沉浸式段落阅读理解练习。

要求：
- 生成 {count} 道题
- 主题：{topic}
- 难度：{difficulty}（easy=简单段落100词内, medium=中等段落150词内, hard=复杂段落200词内）

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "immersive_reading",
      "passage": "Sarah had always dreamed of visiting Japan. Last spring, she finally saved enough money for the trip. She spent two weeks exploring Tokyo, Kyoto, and Osaka. The food was incredible, and the people were very kind.",
      "questionText": "How long did Sarah spend in Japan?",
      "options": ["One week", "Two weeks", "Three weeks", "One month"],
      "answer": "Two weeks",
      "explanation": "段落中明确提到 'She spent two weeks exploring'，所以答案是两周。"
    }}
  ]
}}

注意：
- passage 是完整的英文段落，内容有趣且有教育意义
- questionText 是针对段落内容的理解问题
- options 提供 4 个选项，answer 必须在 options 中
- explanation 用中文解释为什么选这个答案
- 问题要考查阅读理解能力，不是简单的原文查找
- 严格返回合法 JSON""",

    # 19. 沉浸式对话 (Immersive Dialogue — 对话补全)
    "immersive_dialogue": """你是英语对话理解出题专家。请生成对话补全练习。

要求：
- 生成 {count} 道题
- 主题：{topic}
- 难度：{difficulty}（easy=日常简单对话, medium=情境对话, hard=复杂社交/商务对话）

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "immersive_dialogue",
      "context": "在咖啡店点餐",
      "dialogue": [
        {{"speaker": "Barista", "text": "Hi! Welcome to Coffee House. What can I get for you?"}},
        {{"speaker": "Customer", "text": ""}},
        {{"speaker": "Barista", "text": "Sure! What size would you like?"}},
        {{"speaker": "Customer", "text": "A medium, please."}}
      ],
      "blankLineIndex": 1,
      "options": ["I'd like a latte, please.", "Where is the bathroom?", "How much is it?", "See you later."],
      "answer": "I'd like a latte, please."
    }}
  ]
}}

注意：
- context 是场景描述（中文）
- dialogue 是对话数组，每项含 speaker 和 text
- blankLineIndex 表示哪一行的 text 为空（需要填的行），0-based
- 空白行的 text 设为空字符串 ""
- options 提供 4 个选项，answer 必须在 options 中
- 选项要符合对话逻辑，干扰项要有迷惑性
- 严格返回合法 JSON""",

    # 20. 对话口语 (Dialogue Speaking — 扮演对话)
    "dialogue_speaking": """你是英语对话口语练习出题专家。请生成角色扮演对话练习。

要求：
- 生成 {count} 组对话
- 主题：{topic}
- 难度：{difficulty}（easy=3-4轮简单对话, medium=4-6轮日常对话, hard=6-8轮复杂对话）

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "dialogue_speaking",
      "title": "在餐厅点餐",
      "lines": [
        {{"speaker": "ai", "text": "Good evening! Welcome to our restaurant. Do you have a reservation?", "textCn": "晚上好！欢迎来到我们的餐厅。您有预约吗？"}},
        {{"speaker": "user", "text": "No, I don't. Do you have a table for two?", "textCn": "没有。你们有两个人的桌子吗？"}},
        {{"speaker": "ai", "text": "Yes, please follow me.", "textCn": "有的，请跟我来。"}},
        {{"speaker": "user", "text": "Thank you very much.", "textCn": "非常感谢。"}}
      ]
    }}
  ]
}}

注意：
- title 是对话主题（中文）
- lines 数组中 speaker 只能是 "ai" 或 "user"
- ai 和 user 交替发言
- text 是英文台词，textCn 是中文翻译
- 对话要自然流畅，贴近真实场景
- 严格返回合法 JSON""",

    # 21. 疯狂配对 (Timed Match — 多轮限时配对)
    "timed_match": """你是英语词汇配对游戏出题专家。请生成多轮限时配对练习。

要求：
- 生成 1 组配对游戏，包含 3 轮
- 主题：{topic}
- 难度：{difficulty}（easy=基础高频词, medium=中等词汇, hard=高级/易混淆词）

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "timed_match",
      "rounds": [
        {{
          "pairs": [
            {{"english": "apple", "chinese": "苹果"}},
            {{"english": "banana", "chinese": "香蕉"}},
            {{"english": "grape", "chinese": "葡萄"}},
            {{"english": "mango", "chinese": "芒果"}}
          ]
        }},
        {{
          "pairs": [
            {{"english": "carrot", "chinese": "胡萝卜"}},
            {{"english": "tomato", "chinese": "番茄"}},
            {{"english": "potato", "chinese": "土豆"}},
            {{"english": "onion", "chinese": "洋葱"}}
          ]
        }},
        {{
          "pairs": [
            {{"english": "chicken", "chinese": "鸡肉"}},
            {{"english": "beef", "chinese": "牛肉"}},
            {{"english": "pork", "chinese": "猪肉"}},
            {{"english": "lamb", "chinese": "羊肉"}}
          ]
        }}
      ]
    }}
  ]
}}

注意：
- 每轮 4 对中英词汇
- 3 轮词汇同属一个主题但不重复
- 同一轮内的词汇要有一定迷惑性（如同类词）
- 严格返回合法 JSON""",

    # 22. 完美发音 (Perfect Pronunciation — 单词精准发音)
    "perfect_pronunciation": """你是英语发音教学专家。请生成单词精准发音练习。

要求：
- 生成 {count} 道题
- 主题：{topic}
- 难度：{difficulty}（easy=常见简单词, medium=含易错音素的词, hard=多音节/特殊发音词）

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "perfect_pronunciation",
      "targetWord": "comfortable",
      "phonetic": "/ˈkʌmftəbl/",
      "weakPhonemes": ["/ə/", "/f/"],
      "exampleSentence": "This chair is very comfortable.",
      "tips": "注意 comfortable 实际发音只有3个音节，中间的 'or' 弱化为 /ə/，'ta' 弱读。不要读成4个音节。"
    }}
  ]
}}

注意：
- targetWord 是目标单词
- phonetic 是国际音标
- weakPhonemes 是该词中容易发错的薄弱音素列表
- exampleSentence 是包含目标词的例句
- tips 是中文发音技巧说明
- 严格返回合法 JSON""",

    # 23. 听力节目 (Duo Radio — 听段落 + 理解题)
    "duo_radio": """你是英语听力节目出题专家。请生成听力节目内容及理解题。

要求：
- 生成 {count} 个听力节目
- 主题：{topic}
- 难度：{difficulty}（easy=100词简单内容, medium=150词日常话题, hard=200词深度话题）

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "duo_radio",
      "title": "The Benefits of Morning Exercise",
      "transcript": "Good morning, everyone! Today we're going to talk about why exercising in the morning is great for your health. Studies show that people who exercise before breakfast burn more fat...",
      "transcriptCn": "大家早上好！今天我们来聊聊为什么早上锻炼对健康有益。研究表明，早餐前运动的人燃烧更多脂肪……",
      "comprehensionQuestions": [
        {{
          "question": "When is the best time to exercise according to the passage?",
          "options": ["In the morning", "In the afternoon", "In the evening", "At night"],
          "answer": "In the morning"
        }},
        {{
          "question": "What benefit does morning exercise have?",
          "options": ["Burns more fat", "Builds more muscle", "Improves eyesight", "Reduces appetite"],
          "answer": "Burns more fat"
        }}
      ]
    }}
  ]
}}

注意：
- title 是节目标题（英文）
- transcript 是英文文本内容（用于 TTS 播放）
- transcriptCn 是对应中文翻译
- comprehensionQuestions 包含 2-3 道理解选择题
- 每道理解题有 question、options（4个选项）和 answer
- answer 必须在 options 中
- 严格返回合法 JSON""",

    # 24. 故事练习 (Story — 交互式故事)
    "story": """你是英语故事教学专家。请生成交互式故事练习。

要求：
- 生成 {count} 个故事
- 主题：{topic}
- 难度：{difficulty}（easy=简单故事5-8个元素, medium=中等故事8-12个元素, hard=复杂故事12-16个元素）

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "story",
      "title": "A Day at the Beach",
      "storyElements": [
        {{"elementType": "dialogue", "speaker": "Narrator", "text": "It was a sunny Saturday morning. Tom decided to go to the beach.", "textCn": "那是一个阳光明媚的周六早晨。汤姆决定去海滩。"}},
        {{"elementType": "dialogue", "speaker": "Tom", "text": "What a beautiful day! Let's go swimming!", "textCn": "多么美好的一天！我们去游泳吧！"}},
        {{"elementType": "exercise", "exerciseType": "comprehension", "question": "Where did Tom want to go?", "options": ["The beach", "The park", "The mall", "The school"], "answer": "The beach", "explanation": "故事开头提到 Tom decided to go to the beach。"}},
        {{"elementType": "exercise", "exerciseType": "fill_blank", "question": "Tom said: 'What a _____ day!'", "options": ["beautiful", "terrible", "boring", "rainy"], "answer": "beautiful", "explanation": "Tom 说的是 'What a beautiful day!'"}},
        {{"elementType": "exercise", "exerciseType": "true_false", "question": "Tom went to the beach on Sunday.", "answer": false, "explanation": "故事说的是 Saturday（周六），不是 Sunday（周日）。"}},
        {{"elementType": "dialogue", "speaker": "Tom", "text": "The water feels so refreshing!", "textCn": "水感觉真清爽！"}},
        {{"elementType": "exercise", "exerciseType": "meaning", "question": "What does 'refreshing' mean in this context?", "options": ["令人耳目一新的", "令人疲惫的", "令人害怕的", "令人困惑的"], "answer": "令人耳目一新的", "explanation": "'refreshing' 在这里表示水让人感觉清爽、舒适。"}}
      ]
    }}
  ]
}}

注意：
- storyElements 交替包含 dialogue（故事内容）和 exercise（穿插练习）
- dialogue 元素含 speaker、text（英文）、textCn（中文翻译，可选）
- exercise 元素的 exerciseType 可以是：true_false、fill_blank、comprehension、meaning
  - true_false：answer 是 true 或 false（布尔值）
  - fill_blank：包含 question（含 _____ 的挖空句）、options 和 answer
  - comprehension：包含 question、options 和 answer
  - meaning：包含 question、options 和 answer
- explanation 用中文解释
- 故事要有趣、连贯，练习要紧扣故事内容
- 严格返回合法 JSON""",

    # 25. 冒险场景 (Adventure — 开放对话)
    "adventure": """你是英语冒险场景设计专家。请生成冒险场景练习。

要求：
- 生成 {count} 个冒险场景
- 主题：{topic}
- 难度：{difficulty}（easy=简单场景2-3个目标, medium=日常场景3-4个目标, hard=复杂场景4-5个目标）

严格按以下 JSON 返回：
{{
  "questions": [
    {{
      "type": "adventure",
      "scenarioTitle": "Checking In at a Hotel",
      "scenarioDescription": "You just arrived at a hotel in New York City. You need to check in, ask about the facilities, and find your room.",
      "character": "Hotel Receptionist",
      "objectives": ["Greet the receptionist and say you have a reservation", "Ask about the Wi-Fi password", "Ask what time breakfast is served"],
      "openingLine": "Good afternoon! Welcome to the Grand Hotel. How may I help you today?"
    }}
  ]
}}

注意：
- scenarioTitle 是场景标题（英文）
- scenarioDescription 是场景描述（英文），设定情境背景
- character 是 AI 扮演的角色名称
- objectives 是用户需要完成的对话目标列表（英文）
- openingLine 是 AI 角色的开场白（英文）
- 场景要贴近真实生活，目标要明确可达成
- 严格返回合法 JSON""",
}


# ==================== 校验函数 ====================

def _add_ids(questions: List[Dict]) -> List[Dict]:
    """为每道题添加唯一 id"""
    for q in questions:
        q["id"] = str(uuid.uuid4())[:8]
        # 为配对题中的 pairs 也加 id
        if q.get("type") == "matching_pairs" and "pairs" in q:
            for i, pair in enumerate(q["pairs"]):
                pair["id"] = f"p{i}"
        # 为疯狂配对题中每轮的 pairs 也加 id
        if q.get("type") == "timed_match" and "rounds" in q:
            for ri, round_data in enumerate(q["rounds"]):
                for pi, pair in enumerate(round_data.get("pairs", [])):
                    pair["id"] = f"r{ri}p{pi}"
    return questions


def _validate_question(q: Dict, exercise_type: str) -> bool:
    """校验单道题目的基本格式"""
    if q.get("type") != exercise_type:
        return False

    if exercise_type == "translation":
        return bool(q.get("sentenceCn") and q.get("answer"))

    elif exercise_type == "sentence_shuffle":
        return bool(q.get("sentenceCn") and q.get("correctWords") and q.get("shuffledWords"))

    elif exercise_type == "dictation":
        return bool(q.get("sentence") and q.get("sentenceCn"))

    elif exercise_type == "listen_choice":
        opts = q.get("options", [])
        return bool(q.get("audio") and opts and q.get("answer") in opts)

    elif exercise_type == "read_aloud":
        return bool(q.get("sentence") and q.get("sentenceCn"))

    elif exercise_type == "matching_pairs":
        pairs = q.get("pairs", [])
        return len(pairs) >= 3 and all(p.get("english") and p.get("chinese") for p in pairs)

    elif exercise_type == "fill_blank":
        opts = q.get("options", [])
        return bool(q.get("sentence") and opts and q.get("answer") in opts)

    elif exercise_type == "meaning_choice":
        opts = q.get("options", [])
        return bool(q.get("sentence") and opts and q.get("answer") in opts)

    elif exercise_type == "complete_translation":
        return bool(q.get("sentenceCn") and q.get("sentenceEn") and q.get("answer"))

    elif exercise_type == "read_respond":
        opts = q.get("options", [])
        return bool(
            q.get("sentence") and q.get("highlightWord")
            and opts and q.get("answer") in opts
            and q["highlightWord"] in q["sentence"]
        )

    elif exercise_type == "arrange_words":
        return bool(q.get("hint") and q.get("correctWords") and q.get("shuffledWords"))

    elif exercise_type == "minimal_pairs":
        opts = q.get("options", [])
        return bool(
            q.get("targetWord") and q.get("pairWord")
            and len(opts) == 2
            and q["targetWord"] in opts and q["pairWord"] in opts
        )

    elif exercise_type == "listen_fill":
        opts = q.get("options", [])
        return bool(
            q.get("sentence") and q.get("sentenceCn")
            and q.get("blankSentence") and opts
            and q.get("answer") in opts
        )

    elif exercise_type == "listen_repeat":
        return bool(q.get("sentence") and q.get("sentenceCn"))

    elif exercise_type == "speak_translation":
        return bool(q.get("sentenceCn") and q.get("expectedEnglish"))

    elif exercise_type == "flashcard":
        return bool(
            q.get("word") and q.get("phonetic")
            and q.get("meaningCn") and q.get("exampleSentence")
            and q.get("exampleSentenceCn")
        )

    elif exercise_type == "immersive_fill":
        opts = q.get("options", [])
        return bool(
            q.get("passage") and q.get("blankSentence")
            and opts and q.get("answer") in opts
            and q.get("explanation")
        )

    elif exercise_type == "immersive_reading":
        opts = q.get("options", [])
        return bool(
            q.get("passage") and q.get("questionText")
            and opts and q.get("answer") in opts
            and q.get("explanation")
        )

    elif exercise_type == "immersive_dialogue":
        opts = q.get("options", [])
        dialogue = q.get("dialogue", [])
        blank_idx = q.get("blankLineIndex")
        return bool(
            q.get("context") and dialogue
            and blank_idx is not None and 0 <= blank_idx < len(dialogue)
            and opts and q.get("answer") in opts
        )

    elif exercise_type == "dialogue_speaking":
        lines = q.get("lines", [])
        return bool(
            q.get("title") and lines
            and all(
                ln.get("speaker") in ("ai", "user")
                and ln.get("text") and ln.get("textCn")
                for ln in lines
            )
        )

    elif exercise_type == "timed_match":
        rounds = q.get("rounds", [])
        if not rounds:
            return False
        for r in rounds:
            pairs = r.get("pairs", [])
            if len(pairs) < 2:
                return False
            if not all(p.get("english") and p.get("chinese") for p in pairs):
                return False
        return True

    elif exercise_type == "perfect_pronunciation":
        return bool(
            q.get("targetWord") and q.get("phonetic")
            and q.get("weakPhonemes") and q.get("exampleSentence")
            and q.get("tips")
        )

    elif exercise_type == "duo_radio":
        cqs = q.get("comprehensionQuestions", [])
        if not (q.get("title") and q.get("transcript") and q.get("transcriptCn") and cqs):
            return False
        return all(
            cq.get("question") and cq.get("options")
            and cq.get("answer") in cq.get("options", [])
            for cq in cqs
        )

    elif exercise_type == "story":
        elements = q.get("storyElements", [])
        if not (q.get("title") and elements):
            return False
        for el in elements:
            et = el.get("elementType")
            if et == "dialogue":
                if not (el.get("speaker") and el.get("text")):
                    return False
            elif et == "exercise":
                ex_type = el.get("exerciseType")
                if ex_type not in ("true_false", "fill_blank", "comprehension", "meaning"):
                    return False
                if not el.get("question"):
                    return False
                if ex_type == "true_false":
                    if el.get("answer") not in (True, False):
                        return False
                else:
                    if not (el.get("options") and el.get("answer") in el.get("options", [])):
                        return False
            else:
                return False
        return True

    elif exercise_type == "adventure":
        return bool(
            q.get("scenarioTitle") and q.get("scenarioDescription")
            and q.get("character") and q.get("objectives")
            and q.get("openingLine")
        )

    return False


# ==================== 主生成函数 ====================

async def generate_exercise(
    exercise_type: str,
    topic: str = "daily life",
    difficulty: str = "medium",
    count: int = 1,
    max_retries: int = 2,
) -> Dict[str, Any]:
    """生成指定题型的练习题"""

    if exercise_type not in PROMPTS:
        raise ValueError(f"不支持的题型: {exercise_type}，支持: {list(PROMPTS.keys())}")

    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            log_info(f"练习题生成: type={exercise_type}, topic={topic}, "
                     f"difficulty={difficulty}, count={count}, 第{attempt}次")

            prompt = PROMPTS[exercise_type].format(
                count=count, topic=topic, difficulty=difficulty
            )

            user_message = f"""请生成练习题。
主题：{topic}
难度：{difficulty}
数量：{count}

请严格按照 JSON 格式返回。"""

            agent = Agent(
                model=get_ai_model(temperature=0.6),
                instructions=prompt,
                markdown=False,
            )

            response = await agent.arun(user_message, stream=False)
            content = response.content if hasattr(response, "content") else str(response)

            # 解析 JSON
            result = parse_json_response(content)
            if result is None:
                result = json.loads(content.strip())

            questions = result.get("questions", [])

            # 校验
            validated = [q for q in questions if _validate_question(q, exercise_type)]

            if not validated:
                raise ValueError(f"无有效题目（共{len(questions)}题全部校验失败）")

            # 添加 id
            validated = _add_ids(validated)

            log_info(f"练习题生成完成: type={exercise_type}, "
                     f"有效={len(validated)}/{len(questions)}")

            return {"questions": validated}

        except Exception as e:
            last_error = e
            if attempt < max_retries:
                log_info(f"练习题第{attempt}次失败，重试: {exercise_type} - {e}")
            else:
                log_error(f"练习题生成失败（已重试{max_retries}次）: {exercise_type} - {e}", e)

    raise last_error


# ==================== 解释答案 ====================

EXPLAIN_PROMPT = """你是一个友善的英语老师。用户刚刚完成了一道英语练习题，请简洁地解释这道题的知识点。

要求：
- 用中文回答，50-100字以内
- 解释核心语法/词汇知识点
- 如果用户答错了，指出正确答案并解释为什么
- 如果用户答对了，给予简短的鼓励并补充拓展知识
- 不要使用 markdown 格式，纯文本回复"""


async def explain_exercise(
    question: Dict[str, Any],
    is_correct: bool,
) -> Dict[str, str]:
    """解释一道练习题的答案"""
    try:
        question_summary = json.dumps(question, ensure_ascii=False, indent=None)
        # 限制长度避免 token 浪费
        if len(question_summary) > 800:
            question_summary = question_summary[:800] + "..."

        user_message = f"""题目信息：
{question_summary}

用户{'答对了' if is_correct else '答错了'}这道题。
请解释这道题的知识点。"""

        agent = Agent(
            model=get_ai_model(temperature=0.5),
            instructions=EXPLAIN_PROMPT,
            markdown=False,
        )

        response = await agent.arun(user_message, stream=False)
        content = response.content if hasattr(response, "content") else str(response)

        return {"explanation": content.strip()}

    except Exception as e:
        log_error(f"解释练习题失败: {e}", e)
        return {"explanation": "解释生成失败，请稍后重试"}


# ==================== 冒险场景对话 ====================

ADVENTURE_PROMPT = """You are playing the role of "{character}" in a language learning adventure scenario: "{scenario_title}".

Rules:
1. Stay in character at all times — respond ONLY as the character
2. Use simple, natural English (A2-B1 level)
3. Keep responses to 1-3 sentences
4. Guide the conversation toward the learning objectives naturally
5. Be friendly and patient

The learning objectives are:
{objectives}

You must respond in JSON format:
{{
  "response": "your in-character reply in English",
  "completedObjectives": [0, 1]
}}

completedObjectives: an array of 0-based indices of objectives that the user has successfully accomplished in the conversation so far (including this turn). Only mark an objective as completed when the user has clearly attempted it.

IMPORTANT: Return ONLY valid JSON, no other text."""


async def adventure_respond(
    scenario_title: str,
    character: str,
    objectives: List[str],
    conversation_history: List[Dict[str, str]],
) -> Dict[str, Any]:
    """冒险场景对话回复"""
    try:
        objectives_text = "\n".join(f"{i}. {obj}" for i, obj in enumerate(objectives))

        prompt = ADVENTURE_PROMPT.format(
            character=character,
            scenario_title=scenario_title,
            objectives=objectives_text,
        )

        # 构建对话历史
        history_text = ""
        for msg in conversation_history:
            role = "User" if msg.get("role") == "user" else character
            history_text += f"{role}: {msg.get('content', '')}\n"

        user_message = f"""Conversation so far:
{history_text}

Respond as {character}. Return JSON only."""

        agent = Agent(
            model=get_ai_model(temperature=0.7),
            instructions=prompt,
            markdown=False,
        )

        response = await agent.arun(user_message, stream=False)
        content = response.content if hasattr(response, "content") else str(response)

        # 解析 JSON
        result = parse_json_response(content)
        if result is None:
            result = json.loads(content.strip())

        return {
            "response": result.get("response", "I'm sorry, could you say that again?"),
            "completedObjectives": result.get("completedObjectives", []),
        }

    except Exception as e:
        log_error(f"冒险场景对话失败: {e}", e)
        return {
            "response": "I'm sorry, could you say that again?",
            "completedObjectives": [],
        }
