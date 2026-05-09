"""
Companion Mem0 Agent — 基于 Mem0 记忆层的 AI 对话伙伴

Mem0 官方推荐模式：
- 记忆：Mem0 search/add（自动提取+去重+语义搜索）
- 对话：直接用 OpenAI 兼容 API（DeepSeek），自己管理 messages 数组
- 历史：Gateway 从 DB 加载传入，ai-service 完全无状态

不依赖 Agno Agent，完全按 Mem0 官方 chat_with_memories 模式实现。
"""

import asyncio
import json
import random
import time
from datetime import timezone, timedelta
from typing import Dict, Any, List, Optional, Set

from openai import AsyncOpenAI
from mem0 import AsyncMemory

from config.settings import settings
from config.mem0_config import get_mem0_config
from config.companions.companion_config import get_companion_by_id
from config.companions.mia import MIA_PERSONA
from config.companions.alex import ALEX_PERSONA
from config.companions.emma import EMMA_PERSONA
from config.companions.mike import MIKE_PERSONA
from config.companions.sophie import SOPHIE_PERSONA
from config.companions.jack import JACK_PERSONA
from config.companions.oliver import OLIVER_PERSONA
from config.companions.margaret import MARGARET_PERSONA
from utils.ai_helpers import parse_json_response
from utils.datetime_utils import now_utc
from utils.logger import log_info, log_error


# V2 人设注册表
V2_PERSONAS: Dict[str, Dict[str, Any]] = {
    "mia": MIA_PERSONA,
    "alex": ALEX_PERSONA,
    "emma": EMMA_PERSONA,
    "mike": MIKE_PERSONA,
    "sophie": SOPHIE_PERSONA,
    "jack": JACK_PERSONA,
    "oliver": OLIVER_PERSONA,
    "margaret": MARGARET_PERSONA,
}

# 对话历史最大轮数（从 Gateway 传入的 recent_messages 上限）
MAX_HISTORY_MESSAGES = 30
# 历史消息总字符数上限（约 2000 tokens；超过则从最早一端裁剪）
MAX_HISTORY_CHARS = 8000
# 即便字符数超上限，也至少保留最近这么多条以维持基础连贯
MIN_HISTORY_MESSAGES = 6

# Mem0 搜索召回数量
# 用户记忆：覆盖人物、偏好、家庭、工作等持久信息，需要更多容量
USER_MEMORY_LIMIT = 10
# Agent 对该用户的记忆：AI 之前对用户的承诺、互动细节
AGENT_USER_MEMORY_LIMIT = 6

# Mem0 写入重试参数（每次失败指数退避：1s / 3s / 9s）
MEM0_WRITE_MAX_RETRIES = 3
MEM0_WRITE_RETRY_BASE_SECONDS = 1


def _create_llm_client() -> tuple[AsyncOpenAI, str]:
    """创建 LLM 客户端，优先 DeepSeek（beta 端点支持 strict function calling），否则 OpenAI"""
    if settings.deepseek_api_key:
        return AsyncOpenAI(
            api_key=settings.deepseek_api_key,
            base_url="https://api.deepseek.com/beta",
        ), settings.deepseek_model
    elif settings.openai_api_key:
        return AsyncOpenAI(api_key=settings.openai_api_key), "gpt-4.1-nano"
    else:
        raise ValueError("未配置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY")


def _format_behavior_rules(persona: Dict[str, Any]) -> str:
    rules = persona.get("behavior_rules", [])
    return "\n".join(f"{i}. {rule}" for i, rule in enumerate(rules, 1))


def _format_phrases(persona: Dict[str, Any]) -> str:
    phrases = persona["speaking_style"].get("phrases", [])
    return ", ".join(f'"{p}"' for p in phrases)


def _format_forbidden_patterns(persona: Dict[str, Any]) -> str:
    patterns = persona["speaking_style"].get("forbidden_patterns", [])
    return "\n".join(f"- {p}" for p in patterns)


_EMOTIONAL_LABELS = {
    "user_happy": "When the user is happy or excited",
    "user_sad": "When the user is sad or upset",
    "user_angry": "When the user is frustrated or angry",
    "user_busy": "When the user says they are busy",
    "user_bored": "When the user is bored",
    "user_compliments_you": "When the user compliments you",
    "awkward_silence": "When the conversation goes quiet",
}


def _format_emotional_responses(persona: Dict[str, Any]) -> str:
    """格式化角色的情绪反应字典 — 让每个角色有差异化情绪表达。
    persona.emotional_responses 字段缺失时退化为通用一行规则。"""
    responses = persona.get("emotional_responses", {})
    if not responses:
        return "Always respond to feelings before content."
    parts = []
    for k, v in responses.items():
        label = _EMOTIONAL_LABELS.get(k, k.replace("_", " ").capitalize())
        parts.append(f"**{label}:** {v}")
    return "\n\n".join(parts)


# Function Calling 工具定义 — 强制 LLM 返回 {ai_message, translation} 结构
CHAT_RESPONSE_TOOL = {
    "type": "function",
    "function": {
        "name": "send_message",
        "description": "Send your response message to the user with a Chinese translation",
        "strict": True,
        "parameters": {
            "type": "object",
            "properties": {
                "ai_message": {
                    "type": "string",
                    "description": "Your English response (max 4 sentences, max 50 words). Be concise like a friend texting — the user is practicing English and needs space to reply.",
                },
                "translation": {
                    "type": "string",
                    "description": "Natural and fluent Chinese translation of ai_message. Keep the tone consistent with the character.",
                },
            },
            "required": ["ai_message", "translation"],
            "additionalProperties": False,
        },
    },
}


class CompanionMem0Agent:
    """基于 Mem0 + OpenAI API 的对话伙伴，完全无状态"""

    def __init__(self):
        # 保留对后台 task 的强引用 — 防止 asyncio.create_task 返回的 Task 被 GC 提前回收
        # （Python 文档 Caveat: asyncio.create_task）
        self._background_tasks: Set[asyncio.Task] = set()
        try:
            self.memory = AsyncMemory.from_config(get_mem0_config())
            self.llm_client, self.llm_model = _create_llm_client()
            log_info(f"CompanionMem0Agent initialized: Mem0 + {self.llm_model}")
        except Exception as e:
            log_error(f"Failed to init CompanionMem0Agent: {e}", e)
            self.memory = None
            self.llm_client = None
            self.llm_model = ""

    def _spawn_background(self, coro, label: str) -> None:
        """启动后台 task 并保留引用，避免 GC 吞任务；任务完成时记录未捕获异常。"""
        task = asyncio.create_task(coro)
        self._background_tasks.add(task)

        def _on_done(t: asyncio.Task) -> None:
            self._background_tasks.discard(t)
            if t.cancelled():
                return
            exc = t.exception()
            if exc is not None:
                log_error(f"[BackgroundTask] uncaught exception in {label}: {exc}", exc)

        task.add_done_callback(_on_done)

    def _get_mem0_user_id(self, user_id: str, character_id: str) -> str:
        return f"{user_id}_{character_id}"

    # ==================== LLM 调用 ====================

    async def _call_llm(self, messages: List[Dict[str, str]], temperature: float = None) -> Dict[str, Any]:
        """
        用 Function Calling 强制 LLM 返回 {ai_message, translation} 结构。
        一次调用，LLM 同时生成英文回复和中文翻译。
        """
        kwargs: Dict[str, Any] = {
            "model": self.llm_model,
            "messages": messages,
            "tools": [CHAT_RESPONSE_TOOL],
            "tool_choice": {"type": "function", "function": {"name": "send_message"}},
        }
        if temperature is not None:
            kwargs["temperature"] = temperature
        response = await self.llm_client.chat.completions.create(**kwargs)
        choice = response.choices[0]
        usage = response.usage

        token_usage = {
            "input_tokens": usage.prompt_tokens if usage else 0,
            "output_tokens": usage.completion_tokens if usage else 0,
            "total_tokens": usage.total_tokens if usage else 0,
        }

        # 从 tool_calls 中提取结构化结果
        ai_message = ""
        translation = ""
        if choice.message.tool_calls:
            try:
                args = json.loads(choice.message.tool_calls[0].function.arguments)
                ai_message = args.get("ai_message", "")
                translation = args.get("translation", "")
            except (json.JSONDecodeError, IndexError, AttributeError) as e:
                log_error(f"Failed to parse tool_calls: {e}")

        # 兜底：如果 tool_calls 为空，尝试从 content 解析
        if not ai_message and choice.message.content:
            parsed = parse_json_response(choice.message.content)
            ai_message = parsed.get("ai_message", choice.message.content.strip())
            translation = parsed.get("translation", "")

        return {
            "ai_message": ai_message,
            "translation": translation,
            "token_usage": token_usage,
        }

    # ==================== 初始化 ====================

    async def init_thread(self, user_id: str, character_id: str) -> Dict[str, Any]:
        """初始化对话，生成 AI 开场白"""
        try:
            companion = get_companion_by_id(character_id)
            if not companion:
                raise ValueError(f"Character not found: {character_id}")

            mem0_user = self._get_mem0_user_id(user_id, character_id)

            # 1. Search — 双路并行搜索（agent_persona 已停用，无 seed 数据）
            init_query = "user personal information preferences habits pets family work hobbies"
            user_memories, agent_user_memories = await asyncio.gather(
                self._search_memories(mem0_user, query=init_query, limit=USER_MEMORY_LIMIT, search_type="init_user"),
                self._search_agent_user_memories(mem0_user, character_id, query=init_query, limit=AGENT_USER_MEMORY_LIMIT),
            )

            # 2. 构建 system prompt（记忆直接注入，提高注意力权重）
            system_prompt = self._build_system_prompt(
                companion,
                user_memories=user_memories,
                agent_user_memories=agent_user_memories,
            )

            # 3. 生成开场白
            openers = [
                # === 日常问候 ===
                "Start with a casual greeting and ask how their day is going.",
                "Start by asking what the user has been up to lately.",
                "Start by asking if the user slept well last night.",
                "Start by asking if the user had a good weekend.",
                "Start by asking what the user had for lunch or dinner today.",
                "Start by asking how the user's week has been so far.",
                # === 分享自己的事 ===
                "Start by sharing something funny that just happened to you.",
                "Start by complaining about something minor in a funny way.",
                "Start by mentioning something you are excited or nervous about.",
                "Start by telling the user about a weird dream you had.",
                "Start by sharing a small win or achievement you're proud of.",
                "Start by telling the user about something embarrassing you did.",
                "Start by sharing something new you tried and your reaction to it.",
                "Start by telling the user about a funny thing you saw online.",
                "Start by sharing a random thought that just popped into your head.",
                "Start by telling the user about something that made you laugh today.",
                # === 请求帮助 / 互动 ===
                "Start by asking the user for help with something small.",
                "Start by asking the user for their opinion on something trivial.",
                "Start by asking the user to recommend a movie or TV show.",
                "Start by asking the user to recommend something to eat.",
                "Start by asking the user to settle a debate for you.",
                "Start by asking the user to help you decide between two options.",
                # === 趣味问题 ===
                "Start by asking the user a random fun question.",
                "Start by asking a fun would-you-rather question.",
                "Start by asking the user what superpower they would want.",
                "Start by asking the user what they would do with a million dollars.",
                "Start by asking the user about their most unpopular opinion.",
                "Start by asking the user what skill they wish they had.",
                "Start by asking the user what their guilty pleasure is.",
                "Start by asking what the user's favorite comfort food is.",
                # === 生活话题 ===
                "Start by bringing up something about the current weather or season.",
                "Start by asking the user if they have any plans for the evening.",
                "Start by asking the user if they've tried anything new recently.",
                "Start by asking what the user is looking forward to this week.",
                "Start by asking the user about their current mood or energy level.",
                "Start by asking the user if they've been watching anything good lately.",
                "Start by asking the user if they've been listening to any good music.",
                "Start by asking the user if they've cooked anything interesting recently.",
                "Start by asking the user about a hobby they enjoy.",
                # === 好奇 / 观察 ===
                "Start by telling the user about something you just saw or heard.",
                "Start by wondering out loud about something random and silly.",
                "Start by sharing a fun fact you just learned.",
                "Start by asking the user if they noticed something interesting today.",
                "Start by asking the user what the best part of their day was.",
                "Start by asking the user what they're currently obsessed with.",
                # === 引用记忆 ===
                "Start by bringing up something from your shared history and asking a follow-up.",
                "Start by referencing something the user told you before and checking in on it.",
                "Start by asking an update about something the user mentioned previously.",
                "Start by recalling a past conversation topic and sharing a new thought about it.",
            ]
            opener_hint = random.choice(openers)

            if user_memories:
                memory_hints = ", ".join(m.get("memory", "") for m in user_memories[:3] if m.get("memory"))
                user_prompt = (
                    f"Generate your opening message. You already know this person — "
                    f"things you remember: {memory_hints}. {opener_hint} "
                    f"You can optionally reference something from your shared history. "
                    f"Keep it very short — 1 to 2 sentences, under 25 words total."
                )
            else:
                user_prompt = (
                    f"Generate your opening message. You are starting a brand new conversation — "
                    f"greet the user naturally as you would in real life. {opener_hint} "
                    f"Keep it very short — 1 to 2 sentences, under 25 words total."
                )

            try:
                # 记忆已注入 system_prompt
                result = await self._call_llm([
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ], temperature=1.0)
                greeting = result["ai_message"]
                greeting_translation = result["translation"]
                if not greeting:
                    greeting = companion.get("greeting", f"Hey! What's up?")
                token_usage = result["token_usage"]
            except Exception as e:
                log_error(f"AI greeting failed, using fallback: {e}", e)
                greeting = companion.get("greeting", f"Hey! I am {companion['name']}. What's up?")
                greeting_translation = companion.get("greeting_translation", "")
                token_usage = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}

            timestamp = now_utc()
            log_info(f"Mem0 companion init done: user={user_id}, character={character_id}")

            return {
                "message_id": f"mem0_greeting_{character_id}_{int(timestamp.timestamp())}",
                "role": "assistant",
                "content": greeting,
                "translation": greeting_translation,
                "timestamp": timestamp.isoformat(),
                "token_usage": token_usage,
            }

        except Exception as e:
            log_error(f"Failed to init mem0 companion: {e}", e)
            raise

    # ==================== 聊天 ====================

    async def chat(
        self,
        user_id: str,
        character_id: str,
        message: str,
        recent_messages: List[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Mem0 官方推荐的 chat_with_memories 模式:
        1. search — 用用户消息语义搜索相关记忆
        2. generate — 拼 messages 数组（system + history + user），调 LLM
        3. learn — 把这轮对话交给 Mem0 自动提取记忆

        Args:
            recent_messages: Gateway 从 DB 加载的最近对话历史，格式 [{"role":"user","content":"..."},...]
        """
        try:
            log_info(f"Mem0 chat: user={user_id}, character={character_id}")
            start_time = now_utc()

            companion = get_companion_by_id(character_id)
            if not companion:
                raise ValueError(f"Character not found: {character_id}")

            mem0_user = self._get_mem0_user_id(user_id, character_id)

            # 1. Search — 双路并行搜索（agent_persona 已停用，无 seed 数据）
            user_memories, agent_user_memories = await asyncio.gather(
                self._search_memories(mem0_user, query=message, limit=USER_MEMORY_LIMIT, search_type="chat_user"),
                self._search_agent_user_memories(mem0_user, character_id, query=message, limit=AGENT_USER_MEMORY_LIMIT),
            )

            # 2. Generate — 记忆注入 system prompt，messages 顺序：system(含记忆) → 历史 → 当前用户
            system_prompt = self._build_system_prompt(
                companion,
                user_memories=user_memories,
                agent_user_memories=agent_user_memories,
            )

            # 对话历史由 Gateway 从 DB 传入，按条数 + 字符数双上限截断
            history = self._truncate_history(recent_messages or [])

            messages = [{"role": "system", "content": system_prompt}]
            messages.extend(history)
            messages.append({"role": "user", "content": message})

            result = await self._call_llm(messages)

            ai_message = result["ai_message"]
            translation = result["translation"]
            token_usage = result["token_usage"]

            if not ai_message:
                ai_message = "Sorry, I got a bit distracted. What were you saying?"

            # 3. Learn — 异步让 Mem0 从这轮对话中提取记忆（保留 task 引用防 GC）
            if self.memory:
                self._spawn_background(
                    self._learn_memory(mem0_user, character_id, message, ai_message),
                    label=f"learn_memory mem0_user={mem0_user}",
                )

            timestamp = now_utc()
            response_time = (timestamp - start_time).total_seconds()

            total_memories = len(user_memories) + len(agent_user_memories)
            log_info(
                f"[Mem0Chat] done mem0_user={mem0_user} elapsed={response_time:.2f}s "
                f"tokens={token_usage['total_tokens']} mems={total_memories} "
                f"user_hits={len(user_memories)} agent_user_hits={len(agent_user_memories)} "
                f"history={len(history)}"
            )

            return {
                "message_id": f"mem0_msg_{int(timestamp.timestamp())}",
                "role": "assistant",
                "content": ai_message,
                "translation": translation,
                "tips": "",
                "timestamp": timestamp.isoformat(),
                "response_time": response_time,
                "token_usage": token_usage,
                "memories_used": total_memories,
            }

        except Exception as e:
            log_error(f"Mem0 chat failed: {e}", e)
            raise

    # ==================== Mem0 记忆操作 ====================

    async def _search_memories(self, mem0_user: str, query: str, limit: int = USER_MEMORY_LIMIT, search_type: str = "user") -> list:
        """搜索用户记忆（user_id 维度）"""
        if not self.memory or not query.strip():
            return []
        start = time.monotonic()
        try:
            result = await self.memory.search(query=query, user_id=mem0_user, limit=limit)
            items = result.get("results", []) if isinstance(result, dict) else result
            elapsed_ms = (time.monotonic() - start) * 1000
            scores = [round(m.get("score"), 3) for m in items if isinstance(m, dict) and m.get("score") is not None]
            log_info(
                f"[Mem0Search] type={search_type} mem0_user={mem0_user} "
                f"hits={len(items)} elapsed_ms={elapsed_ms:.0f} scores={scores}"
            )
            return items
        except Exception as e:
            elapsed_ms = (time.monotonic() - start) * 1000
            log_error(f"[Mem0Search] type={search_type} mem0_user={mem0_user} FAILED elapsed_ms={elapsed_ms:.0f} err={e}", e)
            return []

    async def _search_agent_user_memories(self, mem0_user: str, character_id: str, query: str, limit: int = AGENT_USER_MEMORY_LIMIT) -> list:
        """搜索 AI 对该用户的记忆（user_id + agent_id 维度）— 按用户隔离的 AI 承诺、互动记忆"""
        if not self.memory or not query.strip():
            return []
        start = time.monotonic()
        try:
            result = await self.memory.search(query=query, user_id=mem0_user, agent_id=character_id, limit=limit)
            items = result.get("results", []) if isinstance(result, dict) else result
            elapsed_ms = (time.monotonic() - start) * 1000
            scores = [round(m.get("score"), 3) for m in items if isinstance(m, dict) and m.get("score") is not None]
            log_info(
                f"[Mem0Search] type=agent_user mem0_user={mem0_user} agent={character_id} "
                f"hits={len(items)} elapsed_ms={elapsed_ms:.0f} scores={scores}"
            )
            return items
        except Exception as e:
            elapsed_ms = (time.monotonic() - start) * 1000
            log_error(
                f"[Mem0Search] type=agent_user mem0_user={mem0_user} agent={character_id} "
                f"FAILED elapsed_ms={elapsed_ms:.0f} err={e}", e
            )
            return []

    @staticmethod
    def _sanitize_text(text: str) -> str:
        """清理文本中可能导致 JSON 解析失败的特殊字符"""
        if not text:
            return text
        # 替换可能破坏 JSON 的控制字符
        import re
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
        return text.strip()

    @staticmethod
    def _truncate_history(messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """
        从最新一端往前累积，受两个上限约束：
        - 条数 ≤ MAX_HISTORY_MESSAGES
        - 总字符数 ≤ MAX_HISTORY_CHARS（约等于 2000 tokens）

        优先级：MIN_HISTORY_MESSAGES > MAX_HISTORY_CHARS > MAX_HISTORY_MESSAGES
        即：如果尚未达到最少条数，会突破字符上限继续累加，以保障基础对话连贯
        （防止单条超长消息把所有上下文挤掉）。

        发生"为保最少条数而突破字符上限"时记 WARN 日志，便于事后定位长消息源头。
        """
        if not messages:
            return []

        selected: List[Dict[str, str]] = []
        total_chars = 0
        chars_overflow = False
        for msg in reversed(messages):
            if len(selected) >= MAX_HISTORY_MESSAGES:
                break
            content = msg.get("content", "") or ""
            msg_chars = len(content)
            would_exceed_chars = total_chars + msg_chars > MAX_HISTORY_CHARS
            if would_exceed_chars:
                if len(selected) >= MIN_HISTORY_MESSAGES:
                    break
                chars_overflow = True  # 会突破字符上限，但仍要保最少条数
            selected.append(msg)
            total_chars += msg_chars

        if chars_overflow:
            log_info(
                f"[History] truncate kept {len(selected)} msgs at {total_chars} chars "
                f"(exceeded MAX_HISTORY_CHARS={MAX_HISTORY_CHARS} to maintain "
                f"MIN_HISTORY_MESSAGES={MIN_HISTORY_MESSAGES})"
            )
        return list(reversed(selected))

    async def _learn_memory(self, mem0_user: str, character_id: str, user_message: str, ai_message: str):
        """
        Mem0 官方模式 + 用户隔离：
        - 用户消息 → user_id（用户的事实、偏好）
        - AI 回复 → user_id + agent_id（AI 对该用户的承诺、互动记忆，按用户隔离）

        每条消息独立写入并各自重试，避免一条失败拖垮另一条。
        """
        user_msg = self._sanitize_text(user_message)
        ai_msg = self._sanitize_text(ai_message)

        if not user_msg and not ai_msg:
            return

        if user_msg:
            await self._add_memory_with_retry(
                messages=[{"role": "user", "content": user_msg}],
                user_id=mem0_user,
                agent_id=None,
                content_preview=user_msg[:120],
                label=f"user_msg mem0_user={mem0_user}",
            )

        if ai_msg:
            await self._add_memory_with_retry(
                messages=[{"role": "assistant", "content": ai_msg}],
                user_id=mem0_user,
                agent_id=character_id,
                content_preview=ai_msg[:120],
                label=f"ai_msg mem0_user={mem0_user} agent={character_id}",
            )

    async def _add_memory_with_retry(
        self,
        *,
        messages: List[Dict[str, str]],
        user_id: str,
        agent_id: Optional[str],
        content_preview: str,
        label: str,
    ) -> bool:
        """
        指数退避重试写入 Mem0：1s → 3s → 9s。
        中间失败用 WARN 记录（不带 stacktrace），最终全失败用 DEAD + 异常对象详细记录。
        """
        if not self.memory:
            log_error(f"[Mem0Write] SKIP label={label} reason=memory_uninitialized")
            return False

        last_err: Optional[Exception] = None
        for attempt in range(1, MEM0_WRITE_MAX_RETRIES + 1):
            start = time.monotonic()
            try:
                kwargs: Dict[str, Any] = {"messages": messages, "user_id": user_id}
                if agent_id:
                    kwargs["agent_id"] = agent_id
                await self.memory.add(**kwargs)
                elapsed_ms = (time.monotonic() - start) * 1000
                log_info(
                    f"[Mem0Write] OK label={label} attempt={attempt} elapsed_ms={elapsed_ms:.0f}"
                )
                return True
            except Exception as e:
                last_err = e
                elapsed_ms = (time.monotonic() - start) * 1000
                # 中间失败仅简要记录，避免和最终 DEAD 重复
                log_info(
                    f"[Mem0Write] retry label={label} attempt={attempt}/{MEM0_WRITE_MAX_RETRIES} "
                    f"elapsed_ms={elapsed_ms:.0f} err={type(e).__name__}: {e}"
                )
                if attempt < MEM0_WRITE_MAX_RETRIES:
                    await asyncio.sleep(MEM0_WRITE_RETRY_BASE_SECONDS * (3 ** (attempt - 1)))

        # 全部重试失败 — 详细日志（含 stacktrace），运维可据此手动补
        log_error(
            f"[Mem0Write] DEAD label={label} content={content_preview!r} "
            f"after {MEM0_WRITE_MAX_RETRIES} attempts err={last_err}",
            last_err,
        )
        return False

    async def get_memories(self, user_id: str, character_id: str) -> List[Dict[str, Any]]:
        """查看 Mem0 中存储的所有记忆"""
        if not self.memory:
            return []
        try:
            mem0_user = self._get_mem0_user_id(user_id, character_id)
            result = await self.memory.get_all(user_id=mem0_user)
            memories = result.get("results", []) if isinstance(result, dict) else result
            return [
                {
                    "id": m.get("id", ""),
                    "memory": m.get("memory", ""),
                    "created_at": str(m.get("created_at", "")),
                    "updated_at": str(m.get("updated_at", "")),
                }
                for m in memories
            ]
        except Exception as e:
            log_error(f"Get memories failed: {e}", e)
            return []

    # ==================== Prompt 构建 ====================

    def _build_system_prompt(
        self,
        companion: Dict[str, Any],
        user_memories: Optional[list] = None,
        agent_user_memories: Optional[list] = None,
    ) -> str:
        """
        构建 Mem0 版专用 system prompt。

        不复用 V2 prompt 模板（里面有 JSON 格式要求等和 Mem0 架构冲突的内容），
        而是直接从人设数据构建一个干净的 prompt：
        - 角色定义 + 行为规则 + 说话风格
        - 记忆使用指令（告诉 LLM 如何用记忆）
        - 用户记忆 + AI 对该用户的记忆（直接注入主 prompt，提高 LLM 注意力权重）
        - 不包含 JSON 格式要求（通过 Function Calling 保证结构）
        """
        # 当前时间
        beijing_tz = timezone(timedelta(hours=8))
        beijing_now = now_utc().astimezone(beijing_tz)
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        day_name = day_names[beijing_now.weekday()]
        hour = beijing_now.hour
        if 5 <= hour < 12:
            time_of_day = "morning"
        elif 12 <= hour < 14:
            time_of_day = "around lunchtime"
        elif 14 <= hour < 18:
            time_of_day = "afternoon"
        elif 18 <= hour < 22:
            time_of_day = "evening"
        else:
            time_of_day = "late at night"

        character_id = companion.get("id") or companion.get("name", "").lower()
        v2_persona = V2_PERSONAS.get(character_id)

        if v2_persona:
            return self._build_mem0_persona_prompt(
                v2_persona, day_name, time_of_day, beijing_now,
                user_memories=user_memories,
                agent_user_memories=agent_user_memories,
            )

        # V1 人设 fallback — 简化版
        name = companion["name"]
        return (
            f"You are {name}, {companion.get('personality', '')}. "
            f"You speak in a {companion.get('speaking_style', 'casual')} way.\n\n"
            f"It's {day_name} {time_of_day} for the user right now.\n\n"
            + self._get_memory_usage_instruction()
            + "\n\n"
            + self._format_memories_section(user_memories, agent_user_memories)
        )

    def _build_mem0_persona_prompt(
        self,
        persona: Dict[str, Any],
        day_name: str,
        time_of_day: str,
        beijing_now,
        user_memories: Optional[list] = None,
        agent_user_memories: Optional[list] = None,
    ) -> str:
        """
        Mem0 专用精简 prompt。
        必须常驻注入的核心字段：identity / behavior_rules / speaking_style / forbidden_patterns /
        emotional_responses / example_dialogues / safety。
        relationship_behaviors / boundaries 等次要细节仍走 Mem0 召回。
        daily_life 字段已下线 —— 静态"近况"会让长期用户感受到时间停滞。
        """
        name = persona["name"]
        style = persona["speaking_style"]
        safety = persona["safety"]
        teaching = persona["teaching"]

        # 精选 2 组最典型的示例对话
        examples = persona.get("example_dialogues", [])[:2]
        example_str = "\n".join(
            f"User: {d['user']}\n{name}: {d['character']}" for d in examples
        ) if examples else ""

        # 安全禁止类别（保留规则，去掉详细示例）
        prohibited = "\n".join(f"- {c}" for c in safety.get("prohibited_categories", []))

        forbidden_section = _format_forbidden_patterns(persona)
        emotional_section = _format_emotional_responses(persona)

        memories_section = self._format_memories_section(user_memories, agent_user_memories)

        return f"""{self._get_memory_usage_instruction()}

---

# You Are {name}

{persona["identity"]}

It's {day_name} {time_of_day} ({beijing_now.strftime('%I:%M %p')}) for the user right now.

## Core Behavior Rules — HIGHEST PRIORITY
{_format_behavior_rules(persona)}

## How You Talk
{style["voice"]}
Phrases: {_format_phrases(persona)}
Length: {style["message_length"]}
Always respond in English. Match the user's language complexity naturally.

### Language Red Lines — NEVER BREAK
{forbidden_section}

## Emotional Responses
{emotional_section}

## Example Conversations
{example_str}

## CRITICAL LENGTH RULE — Overrides Examples Above
The example dialogues above may look longer than the actual cap — ignore their length, follow only their tone and word choice.

HARD CAP: max 4 sentences AND max 50 words per reply. Even if your character's "How You Talk" rule allows more, prefer fewer.

WHY: The user is practicing English, not reading essays. Short replies invite back-and-forth — that's how learners actually improve.

{memories_section}

## English Teaching (Invisible)
{teaching["recast_style"]}
{teaching["vocabulary_modeling"]}

## Safety — Handle In Character
**You will not engage with these topics:**
{prohibited}

{safety["deflection_style"]}

**If pushed repeatedly, say something like:**
"{safety["hard_boundary"]}"

NEVER say you are an AI. NEVER break character."""

    @classmethod
    def _get_memory_usage_instruction(cls) -> str:
        """记忆使用指令 — 与 _format_memories_section 的小标题严格对齐"""
        user_h = cls.MEMORIES_SECTION_USER_HEADING
        history_h = cls.MEMORIES_SECTION_HISTORY_HEADING
        return (
            "## Memory Usage\n"
            "You have access to two kinds of memories from previous interactions with this user. "
            "Use them to personalize your responses, show empathy, and stay consistent with what you already know.\n\n"
            f"The '{user_h}' section contains durable facts about them — "
            "name, family, pets, preferences, hobbies, life events. "
            "Treat these as things you already know. NEVER act surprised. NEVER ask for information already listed there.\n\n"
            f"The '{history_h}' section contains things YOU previously said, "
            "promised, or experienced together with this specific user. "
            "Use it to stay consistent with your past statements and follow through on commitments you made.\n\n"
            "Pull memories in only when contextually relevant — do not dump everything you know at once. "
            "If a memory contradicts what the user just said, gently ask for clarification rather than assert the old fact."
        )

    def _format_mem0_memories(self, memories: list) -> str:
        """将 Mem0 搜索结果格式化为 prompt 文本（防御性处理：跳过非 dict / 非 str 项）"""
        if not memories:
            return "No memories yet — this is a new friendship."
        lines: List[str] = []
        for m in memories:
            if not isinstance(m, dict):
                continue
            text = m.get("memory")
            if not isinstance(text, str):
                continue
            text = text.strip()
            if text:
                lines.append(f"- {text}")
        return "\n".join(lines) if lines else "No memories yet — this is a new friendship."

    # 小标题常量 — 同时被 _format_memories_section 和 _get_memory_usage_instruction 引用，
    # 修改时务必两端同步以维持 prompt 内引号引用的精确匹配
    MEMORIES_SECTION_USER_HEADING = "What you remember about the user"
    MEMORIES_SECTION_HISTORY_HEADING = "Your shared history with this user"

    def _format_memories_section(
        self,
        user_memories: Optional[list],
        agent_user_memories: Optional[list],
    ) -> str:
        """
        将记忆格式化为 system prompt 的一个段落。

        放入主 system prompt（而非独立 system message），让 LLM 把
        "记得用户" 视为人设的一部分，而不是后置补充信息。
        """
        user_str = self._format_mem0_memories(user_memories or [])
        companion_str = self._format_mem0_memories(agent_user_memories or [])
        return (
            "## Memories\n"
            f"### {self.MEMORIES_SECTION_USER_HEADING}\n"
            f"{user_str}\n\n"
            f"### {self.MEMORIES_SECTION_HISTORY_HEADING}\n"
            "(things you said, promised, or experienced together with this specific user)\n"
            f"{companion_str}"
        )


# 单例
companion_mem0_agent = CompanionMem0Agent()
