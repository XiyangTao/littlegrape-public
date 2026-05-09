"""
English Coach AI Agent
Based on Agno framework

Architecture:
- Chat Agent: Handles roleplay dialogue, outputs ai_message only
- Evaluation Agent: Evaluates user's English input, outputs tips and score
- Both agents run in parallel for better performance
"""

import asyncio
from typing import Dict, Any, List
from utils.datetime_utils import now_utc, format_timestamp

from agno.agent import Agent
from agno.db.postgres import PostgresDb
from agno.db.base import SessionType
from sqlalchemy import text

from config.settings import settings
from config.scenarios import format_system_prompt
from config.scenarios.custom_scenario_generator import custom_scenario_generator
from common.enums import DifficultyLevel, EnglishVariant, ConversationStyle
from services.evaluation_agent import evaluation_agent
from utils.ai_helpers import get_ai_model, extract_ai_message, parse_enum_value
from utils.logger import log_info, log_error, log_warn


# Database table name
SESSION_TABLE = "english_coach_sessions"


class EnglishCoachAgent:
    """English Coach AI Agent"""

    def __init__(self):
        self.db = PostgresDb(
            db_url=settings.get_database_url(),
            session_table=SESSION_TABLE
        )
        log_info("English Coach Agent initialized")

    async def prepare_system_prompt(
        self,
        difficulty_level: DifficultyLevel = DifficultyLevel.CET4,
        english_variant: EnglishVariant = EnglishVariant.AMERICAN,
        conversation_style: ConversationStyle = ConversationStyle.CASUAL,
        enable_tips: bool = True,
        scenario: str = "general",
        ai_role: str = "english_coach",
        predefined_scenario_id: str = None,
        voice_name: str = None,
        voice_gender: str = None,
        learned_words: list = None
    ) -> Dict[str, Any]:
        """
        Pre-generate system prompt (without creating session)
        Used to avoid timeout when creating session
        """
        try:
            log_info(f"Preparing system prompt: role={ai_role}, scenario_id={predefined_scenario_id}")

            # Use predefined scenario (no AI call, no token usage)
            if predefined_scenario_id:
                try:
                    system_prompt = format_system_prompt(
                        scenario_id=predefined_scenario_id,
                        difficulty_level=difficulty_level,
                        english_variant=english_variant,
                        conversation_style=conversation_style,
                        enable_tips=enable_tips,
                        voice_name=voice_name,
                        voice_gender=voice_gender,
                        learned_words=learned_words
                    )
                    return {"success": True, "system_prompt": system_prompt, "token_usage": None}
                except ValueError as e:
                    log_error(f"Predefined scenario not found: {e}")
                    return {
                        "success": False,
                        "error": f"Scenario not found: {predefined_scenario_id}",
                        "error_type": "invalid_scenario",
                        "token_usage": None
                    }

            # Use custom scenario generator (consumes tokens)
            log_info("Using custom scenario generator")
            result = await custom_scenario_generator.generate(
                ai_role=ai_role,
                scenario_description=scenario,
                difficulty_level=difficulty_level,
                english_variant=english_variant,
                conversation_style=conversation_style,
                enable_tips=enable_tips,
                voice_name=voice_name,
                voice_gender=voice_gender
            )

            token_usage = result.get("token_usage")

            if result["success"]:
                system_prompt = result["system_prompt"]
                # Append vocabulary reinforcement for custom scenarios
                if learned_words:
                    words_str = ", ".join(learned_words[:30])
                    system_prompt += f"""

## Vocabulary Reinforcement
The user has recently learned these English words: {words_str}.
Naturally incorporate 1-2 of these words into your responses when contextually appropriate.
Do NOT force them — only use them when they fit the conversation naturally.
Do NOT explicitly mention that you are using their learned words."""
                return {"success": True, "system_prompt": system_prompt, "token_usage": token_usage}
            else:
                return {
                    "success": False,
                    "error": result.get('error', 'Unknown error'),
                    "error_type": result.get('error_type', 'unknown'),
                    "token_usage": token_usage
                }

        except Exception as e:
            log_error(f"Failed to prepare system prompt: {e}", e)
            return {"success": False, "error": str(e), "error_type": "system_error", "token_usage": None}

    async def create_session_with_welcome(
        self,
        session_id: str,
        user_id: str,
        difficulty_level: DifficultyLevel = DifficultyLevel.CET4,
        english_variant: EnglishVariant = EnglishVariant.AMERICAN,
        conversation_style: ConversationStyle = ConversationStyle.CASUAL,
        enable_tips: bool = True,
        scenario: str = "general",
        ai_role: str = "english_coach",
        predefined_scenario_id: str = None,
        prepared_system_prompt: str = None,
        voice_id: str = None,
        voice_name: str = None
    ) -> Dict[str, Any]:
        """Create session and generate welcome message"""
        try:
            log_info(f"Creating session: session_id={session_id}, user_id={user_id}")

            # Build metadata
            extra_metadata = {}
            if voice_id:
                extra_metadata["voice_id"] = voice_id
            if voice_name:
                extra_metadata["voice_name"] = voice_name

            # Create agent
            agent = await self._create_agent(
                session_id=session_id,
                user_id=user_id,
                difficulty_level=difficulty_level,
                english_variant=english_variant,
                conversation_style=conversation_style,
                enable_tips=enable_tips,
                scenario=scenario,
                ai_role=ai_role,
                predefined_scenario_id=predefined_scenario_id,
                prepared_system_prompt=prepared_system_prompt,
                extra_metadata=extra_metadata if extra_metadata else None
            )

            # Generate welcome message
            welcome_prompt = f"""You are now a {ai_role} in the scenario: {scenario}.
Generate a natural opening message that immediately puts the user into this roleplay situation.
Start the conversation as if we just met in this scenario.
Be authentic to your role and the setting.
Ask a relevant question or make a comment that would naturally happen in this situation.
Remember to respond in the required JSON format and keep it appropriate for {difficulty_level.value} level English."""

            response = await agent.arun(welcome_prompt, stream=False)
            raw_response = response.content if hasattr(response, 'content') else str(response)
            ai_message = extract_ai_message(raw_response)

            # 提取 token 使用信息
            metrics = getattr(response, 'metrics', None)
            token_usage = {
                "input_tokens": getattr(metrics, 'input_tokens', 0) if metrics else 0,
                "output_tokens": getattr(metrics, 'output_tokens', 0) if metrics else 0,
                "total_tokens": getattr(metrics, 'total_tokens', 0) if metrics else 0
            }

            run_id = getattr(response, 'run_id', None)
            timestamp = now_utc()

            result = {
                "message_id": f"{run_id}_assistant" if run_id else f"welcome_{int(timestamp.timestamp())}",
                "role": "assistant",
                "content": ai_message,
                "tips": None,
                "timestamp": timestamp.isoformat(),
                "token_usage": token_usage
            }

            log_info(f"Session created successfully: session_id={session_id}, tokens={token_usage['total_tokens']}")
            return result

        except Exception as e:
            log_error(f"Failed to create session: {e}", e)
            raise

    async def chat(self, session_id: str, user_id: str, message: str) -> Dict[str, Any]:
        """
        Process chat message - runs Chat Agent and Evaluation Agent in parallel
        """
        try:
            log_info(f"Processing chat: session_id={session_id}")
            start_time = now_utc()

            # Get session info
            session = self.db.get_session(
                session_id=session_id,
                session_type=SessionType.AGENT,
                user_id=user_id
            )
            if not session:
                raise ValueError(f"Session not found: {session_id}")

            # Extract config from metadata
            metadata = getattr(session, 'metadata', None) or {}
            difficulty_level = parse_enum_value(
                metadata.get('difficulty_level', 'cet4'),
                DifficultyLevel, DifficultyLevel.CET4
            )
            english_variant = parse_enum_value(
                metadata.get('english_variant', 'american'),
                EnglishVariant, EnglishVariant.AMERICAN
            )
            scenario = metadata.get('scenario', '')
            ai_role = metadata.get('ai_role', '')
            enable_tips = metadata.get('enable_tips', True)

            # Get recent context for Evaluation Agent
            recent_context = self._get_recent_context(session, limit=6)

            # Create Chat Agent
            agent = await self._create_agent(session_id, user_id)

            # Run both agents in parallel
            async def run_chat_agent():
                try:
                    response = await agent.arun(message, stream=False)
                    raw = response.content if hasattr(response, 'content') else str(response)
                    # 提取 token 使用信息
                    metrics = getattr(response, 'metrics', None)
                    token_usage = {
                        "input_tokens": getattr(metrics, 'input_tokens', 0) if metrics else 0,
                        "output_tokens": getattr(metrics, 'output_tokens', 0) if metrics else 0,
                        "total_tokens": getattr(metrics, 'total_tokens', 0) if metrics else 0
                    }
                    return extract_ai_message(raw), getattr(response, 'run_id', None), token_usage
                except Exception as e:
                    log_error(f"Chat Agent 调用失败: {e}", e)
                    return "Sorry, I'm having trouble responding right now. Please try again.", None, {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}

            async def run_evaluation_agent():
                # enable_tips=False 时，Score 和 Tips 都不要
                if not enable_tips:
                    return {"score": None, "tips": None, "token_usage": None}
                return await evaluation_agent.evaluate(
                    user_message=message,
                    recent_context=recent_context,
                    difficulty_level=difficulty_level,
                    english_variant=english_variant,
                    scenario=scenario,
                    ai_role=ai_role
                )

            log_info("Running Chat Agent and Evaluation Agent in parallel")
            chat_result, eval_result = await asyncio.gather(
                run_chat_agent(),
                run_evaluation_agent()
            )

            ai_message, run_id, chat_token_usage = chat_result
            tips = eval_result.get("tips")
            score = eval_result.get("score")
            eval_token_usage = eval_result.get("token_usage") or {}

            # 汇总 token 使用量
            total_token_usage = {
                "input_tokens": chat_token_usage.get("input_tokens", 0) + eval_token_usage.get("input_tokens", 0),
                "output_tokens": chat_token_usage.get("output_tokens", 0) + eval_token_usage.get("output_tokens", 0),
                "total_tokens": chat_token_usage.get("total_tokens", 0) + eval_token_usage.get("total_tokens", 0)
            }

            end_time = now_utc()
            response_time = (end_time - start_time).total_seconds()
            timestamp_unix = int(end_time.timestamp())

            # Build response
            messages = [
                {
                    "message_id": f"{run_id}_user" if run_id else f"user_{timestamp_unix}",
                    "role": "user",
                    "content": message,
                    "tips": tips,
                    "score": score,
                    "timestamp": end_time.isoformat()
                },
                {
                    "message_id": f"{run_id}_assistant" if run_id else f"assistant_{timestamp_unix}",
                    "role": "assistant",
                    "content": ai_message,
                    "tips": None,
                    "score": None,
                    "timestamp": end_time.isoformat()
                }
            ]

            result = {
                "ai_message": ai_message,
                "tips": tips,
                "score": score,
                "session_id": session_id,
                "user_id": user_id,
                "timestamp": end_time.isoformat(),
                "response_time": response_time,
                "messages": messages,
                "token_usage": total_token_usage
            }

            log_info(f"Chat completed: session_id={session_id}, time={response_time:.2f}s, score={score}, tokens={total_token_usage['total_tokens']}")
            return result

        except Exception as e:
            log_error(f"Chat failed: {e}", e)
            raise

    async def get_chat_history(
        self,
        session_id: str,
        user_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get chat history for a session"""
        try:
            log_info(f"Getting chat history: session_id={session_id}")

            session = self.db.get_session(
                session_id=session_id,
                session_type=SessionType.AGENT,
                user_id=user_id
            )

            if not session:
                log_warn(f"Session not found: {session_id}")
                return {"messages": [], "total": 0, "has_more": False}

            agno_messages = session.get_messages_for_session()
            messages = []
            first_user_msg_skipped = False

            for agno_msg in agno_messages:
                if agno_msg.role == "user":
                    if not first_user_msg_skipped:
                        first_user_msg_skipped = True
                        continue
                    messages.append({
                        "message_id": f"{agno_msg.id}_user",
                        "role": "user",
                        "content": agno_msg.get_content_string(),
                        "tips": None,
                        "score": None,
                        "timestamp": agno_msg.created_at
                    })
                elif agno_msg.role == "assistant":
                    ai_message = extract_ai_message(agno_msg.get_content_string())
                    messages.append({
                        "message_id": f"{agno_msg.id}_assistant",
                        "role": "assistant",
                        "content": ai_message,
                        "tips": None,
                        "score": None,
                        "timestamp": agno_msg.created_at
                    })

            # Pagination
            total = len(messages)
            paginated = messages[offset:offset + limit]
            has_more = (offset + limit) < total

            # Format timestamps
            for msg in paginated:
                if isinstance(msg["timestamp"], (int, float)):
                    msg["timestamp"] = format_timestamp(msg["timestamp"])

            log_info(f"Chat history retrieved: {len(paginated)} messages")
            return {"messages": paginated, "total": total, "has_more": has_more}

        except Exception as e:
            log_error(f"Failed to get chat history: {e}", e)
            raise

    async def get_user_sessions(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get all sessions for a user"""
        try:
            log_info(f"Getting user sessions: user_id={user_id}")

            with self.db.Session() as db_session:
                # Get total count
                count_query = text(f"""
                    SELECT COUNT(*) as total
                    FROM ai.{SESSION_TABLE}
                    WHERE user_id = :user_id AND metadata IS NOT NULL
                """)
                total = db_session.execute(count_query, {"user_id": user_id}).scalar() or 0

                # Get sessions
                query = text(f"""
                    SELECT session_id, user_id, metadata, created_at, updated_at
                    FROM ai.{SESSION_TABLE}
                    WHERE user_id = :user_id AND metadata IS NOT NULL
                    ORDER BY updated_at DESC NULLS LAST, created_at DESC
                    LIMIT :limit OFFSET :offset
                """)
                result = db_session.execute(query, {
                    "user_id": user_id,
                    "limit": limit,
                    "offset": offset
                })

                sessions = []
                for row in result:
                    metadata = row.metadata or {}

                    # Get message count
                    runs_query = text(f"""
                        SELECT runs FROM ai.{SESSION_TABLE} WHERE session_id = :session_id
                    """)
                    runs_row = db_session.execute(
                        runs_query, {"session_id": row.session_id}
                    ).fetchone()
                    message_count = 0
                    if runs_row and runs_row.runs:
                        message_count = len(runs_row.runs) if isinstance(runs_row.runs, list) else 0

                    sessions.append({
                        "session_id": row.session_id,
                        "user_id": row.user_id,
                        "scenario": metadata.get("scenario", ""),
                        "ai_role": metadata.get("ai_role", ""),
                        "difficulty_level": metadata.get("difficulty_level", ""),
                        "english_variant": metadata.get("english_variant", ""),
                        "conversation_style": metadata.get("conversation_style", ""),
                        "enable_tips": metadata.get("enable_tips", True),
                        "predefined_scenario_id": metadata.get("predefined_scenario_id"),
                        "voice_id": metadata.get("voice_id"),
                        "voice_name": metadata.get("voice_name"),
                        "message_count": message_count,
                        "created_at": format_timestamp(row.created_at) if row.created_at else None,
                        "updated_at": format_timestamp(row.updated_at) if row.updated_at else None
                    })

                has_more = (offset + limit) < total
                log_info(f"User sessions retrieved: {len(sessions)} sessions")
                return {"sessions": sessions, "total": total, "has_more": has_more}

        except Exception as e:
            log_error(f"Failed to get user sessions: {e}", e)
            raise

    async def delete_session(self, session_id: str, user_id: str) -> Dict[str, Any]:
        """Delete a session"""
        try:
            log_info(f"Deleting session: session_id={session_id}")

            session = self.db.get_session(session_id, session_type=SessionType.AGENT, user_id=user_id)
            if not session:
                return {"success": False, "message": "Session not found or access denied"}

            deleted = self.db.delete_session(session_id)
            if deleted:
                log_info(f"Session deleted: {session_id}")
                return {"success": True, "message": "Session deleted successfully"}
            else:
                return {"success": False, "message": "Failed to delete session"}

        except Exception as e:
            log_error(f"Failed to delete session: {e}", e)
            raise

    async def batch_delete_sessions(self, session_ids: list, user_id: str) -> Dict[str, Any]:
        """Delete multiple sessions"""
        try:
            log_info(f"Batch deleting sessions: {len(session_ids)} sessions")

            if not session_ids:
                return {"success": True, "deleted_count": 0, "message": "No sessions to delete"}

            # Filter valid sessions
            valid_ids = []
            for sid in session_ids:
                session = self.db.get_session(sid, session_type=SessionType.AGENT, user_id=user_id)
                if session:
                    valid_ids.append(sid)

            if not valid_ids:
                return {"success": True, "deleted_count": 0, "message": "No valid sessions to delete"}

            self.db.delete_sessions(valid_ids)
            log_info(f"Batch delete completed: {len(valid_ids)} sessions")
            return {
                "success": True,
                "deleted_count": len(valid_ids),
                "message": f"Successfully deleted {len(valid_ids)} sessions"
            }

        except Exception as e:
            log_error(f"Batch delete failed: {e}", e)
            raise

    # ==================== Private Methods ====================

    async def _create_agent(
        self,
        session_id: str,
        user_id: str,
        difficulty_level: DifficultyLevel = DifficultyLevel.CET4,
        english_variant: EnglishVariant = EnglishVariant.AMERICAN,
        conversation_style: ConversationStyle = ConversationStyle.CASUAL,
        enable_tips: bool = True,
        scenario: str = "general",
        ai_role: str = "english_coach",
        predefined_scenario_id: str = None,
        prepared_system_prompt: str = None,
        extra_metadata: Dict[str, Any] = None
    ) -> Agent:
        """Create or restore an Agent instance"""
        model = get_ai_model()

        # Check if session exists
        existing = self.db.get_session(
            session_id=session_id,
            session_type=SessionType.AGENT,
            user_id=user_id
        )

        if existing:
            log_info(f"Restoring existing session: {session_id}")
            metadata = getattr(existing, 'metadata', None)
            system_prompt = metadata.get('instructions') if metadata else None
            if not system_prompt:
                raise ValueError(f"Session {session_id} is missing system prompt")
        else:
            log_info(f"Creating new session: {session_id}")
            if not prepared_system_prompt:
                raise ValueError("prepared_system_prompt is required for new session")
            system_prompt = prepared_system_prompt

            # 只有创建新会话时才构建 metadata
            metadata = {
                "instructions": system_prompt,
                "difficulty_level": difficulty_level.value if hasattr(difficulty_level, 'value') else str(difficulty_level),
                "english_variant": english_variant.value if hasattr(english_variant, 'value') else str(english_variant),
                "conversation_style": conversation_style.value if hasattr(conversation_style, 'value') else str(conversation_style),
                "enable_tips": enable_tips,
                "scenario": scenario,
                "ai_role": ai_role,
                "predefined_scenario_id": predefined_scenario_id,
            }
            if extra_metadata:
                metadata.update(extra_metadata)

        return Agent(
            model=model,
            db=self.db,
            session_id=session_id,
            user_id=user_id,
            add_history_to_context=True,
            num_history_runs=10,
            enable_user_memories=False,
            markdown=False,
            instructions=system_prompt,
            metadata=metadata
        )

    def _get_recent_context(self, session, limit: int = 6) -> List[Dict[str, str]]:
        """Get recent conversation context for Evaluation Agent"""
        try:
            agno_messages = session.get_messages_for_session()
            context = []
            first_user_skipped = False

            for msg in agno_messages:
                if msg.role == "user" and not first_user_skipped:
                    first_user_skipped = True
                    continue

                if msg.role in ["user", "assistant"]:
                    content = msg.get_content_string()
                    if msg.role == "assistant":
                        content = extract_ai_message(content)
                    context.append({"role": msg.role, "content": content})

            return context[-limit:] if len(context) > limit else context

        except Exception as e:
            log_error(f"Failed to get recent context: {e}", e)
            return []


# Global instance
english_coach = EnglishCoachAgent()
