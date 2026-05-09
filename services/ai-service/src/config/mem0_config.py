"""
Mem0 Configuration — 基于 pgvector 的 AI 记忆层配置

使用阿里云 RDS PostgreSQL + pgvector 扩展作为向量存储，
无需额外部署向量数据库。

前置条件：
  1. 阿里云 RDS 已安装 pgvector 扩展：CREATE EXTENSION IF NOT EXISTS vector;
  2. pip install mem0ai
"""

from config.settings import settings


def get_mem0_config() -> dict:
    """
    获取 Mem0 配置

    - vector_store: pgvector（复用现有阿里云 RDS）
    - llm: DeepSeek（记忆提取用便宜模型，节省成本）
    - embedder: OpenAI text-embedding-3-small（1536 维）
    - custom_instructions: 控制记忆提取质量（过滤噪声）
    """
    config = {
        # 记忆提取指令 — 完全替换 Mem0 默认的 FACT_RETRIEVAL_PROMPT
        # 注意：开源版必须用 custom_fact_extraction_prompt，custom_instructions 会被静默忽略
        "custom_fact_extraction_prompt": """
Extract durable personal facts about the user. A fact is durable if it would still be relevant in a few weeks.

Extract these categories:
1. Identity: name, age, birthday, location, job, school, nationality
2. Relationships: pets (name, breed, age), family members, partners, close friends
3. Personal preferences & interests:
   - Favorite media they personally consume: movies, TV shows, books, music, video games, podcasts
   - Favorite food, drinks, brands
   - Hobbies, sports they play, skills they're learning
   - Recurring activities (gym schedule, weekly yoga, monthly book club, learning guitar)
4. Goals & aspirations: career goals, language learning goals, fitness goals, travel plans
5. Life events: moving, new job, graduation, illness, travel (with dates if mentioned)
6. Health & lifestyle: dietary restrictions, allergies, sleep habits, work schedule

Do NOT extract:
- Greetings, filler, or casual reactions ("hey", "lol", "okay")
- Questions the user asks
- Generic opinions about things they don't personally engage with ("dogs are cute", "Paris is beautiful")
- In-the-moment emotions ("I'm tired right now", "I'm bored")
- Generic factual knowledge ("Tokyo is in Japan", "huskies have blue eyes")
- Anything said by the AI assistant
- Facts already stored in memory

KEY DISTINCTION — personal preference vs generic opinion:
- "I love The Office" → EXTRACT (personal preference)
- "I've been watching Severance lately" → EXTRACT (current activity / preference)
- "I want to learn guitar" → EXTRACT (goal)
- "Comedies are funny" → DO NOT EXTRACT (generic opinion, no personal claim)
- "Guitars are cool" → DO NOT EXTRACT (generic opinion)
- "Huskies are amazing" → DO NOT EXTRACT (generic opinion, no ownership claim)

Few-shot examples:

Input: Hi, how are you?
Output: {"facts": []}

Input: The weather is nice today.
Output: {"facts": []}

Input: Huskies are amazing, they sound like they're talking
Output: {"facts": []}

Input: I think cooking is really fun
Output: {"facts": ["Enjoys cooking"]}

Input: Dogs are so loyal and cute
Output: {"facts": []}

Input: I'm so excited right now!
Output: {"facts": []}

Input: I have a husky named Wangcai, he is 2 years old
Output: {"facts": ["Has a husky named Wangcai", "Wangcai is 2 years old"]}

Input: I work as a software engineer at Alibaba in Hangzhou
Output: {"facts": ["Works as a software engineer at Alibaba", "Lives in Hangzhou"]}

Input: 我最喜欢吃麻辣火锅
Output: {"facts": ["Favorite food is spicy hotpot (mala huoguo)"]}

Input: My favorite band is Coldplay, I saw them live last year
Output: {"facts": ["Favorite band is Coldplay", "Attended Coldplay concert last year"]}

Input: I've been watching The Office, it's so funny
Output: {"facts": ["Watches The Office", "Enjoys The Office"]}

Input: I really love sci-fi movies, especially anything by Christopher Nolan
Output: {"facts": ["Loves sci-fi movies", "Likes Christopher Nolan films"]}

Input: I started learning guitar last month
Output: {"facts": ["Learning guitar", "Started learning guitar about a month ago"]}

Input: I go to the gym three times a week
Output: {"facts": ["Goes to the gym 3 times a week"]}

Input: I'm trying to learn Japanese for next year's trip to Tokyo
Output: {"facts": ["Learning Japanese", "Plans to visit Tokyo next year"]}

Input: I'm vegetarian, no meat for me
Output: {"facts": ["Is vegetarian", "Does not eat meat"]}

Input: 我最近在玩王者荣耀
Output: {"facts": ["Currently playing Honor of Kings (王者荣耀)"]}

Return the facts in a json format as shown above.
""",
        "vector_store": {
            "provider": "pgvector",
            "config": {
                "dbname": f"{settings.postgres_db}_mem0",  # 独立数据库，不与 Prisma 冲突
                "user": settings.postgres_user,
                "password": settings.postgres_password,
                "host": settings.postgres_host,
                "port": settings.postgres_port,
                "collection_name": "companion_memories",
                "embedding_model_dims": 1536,
            },
        },
        "embedder": {
            "provider": "openai",
            "config": {
                "model": "text-embedding-v4",
                "api_key": settings.dashscope_api_key,
                "openai_base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
                "embedding_dims": 1536,
            },
        },
        "version": "v1.1",
    }

    # LLM: 优先用 DeepSeek（便宜），否则用 OpenAI
    if settings.deepseek_api_key:
        config["llm"] = {
            "provider": "openai",
            "config": {
                "model": settings.deepseek_model,
                "api_key": settings.deepseek_api_key,
                "openai_base_url": "https://api.deepseek.com",
            },
        }
    elif settings.openai_api_key:
        config["llm"] = {
            "provider": "openai",
            "config": {
                "model": "gpt-4.1-nano",
                "api_key": settings.openai_api_key,
            },
        }

    return config
