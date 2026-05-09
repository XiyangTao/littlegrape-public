"""
Word Explanation Agent - 单词 AI 解说生成
"""

from typing import Dict, Any, List, Optional

from agno.agent import Agent

from config.prompts.word_explanation_prompts import (
    WORD_EXPLANATION_SYSTEM_PROMPT,
    build_word_explanation_request
)
from utils.ai_helpers import get_ai_model
from utils.logger import log_info, log_error


class WordExplanationAgent:
    """Word Explanation Agent - 生成单词解说文稿"""

    def __init__(self):
        log_info("Word Explanation Agent 初始化完成")

    async def generate_explanation(
        self,
        word: str,
        phonetic: str = "",
        meanings: List[Dict] = None,
        examples: List[Dict] = None,
        collocations: List[str] = None,
        etymology: Dict = None
    ) -> Dict[str, Any]:
        """
        生成单词解说文稿

        Args:
            word: 单词
            phonetic: 音标
            meanings: 义项列表
            examples: 例句列表
            collocations: 搭配列表
            etymology: 词源信息

        Returns:
            {
                "explanation": str,  # 解说文稿
                "token_usage": {...} # token 使用情况
            }
        """
        try:
            log_info(f"Word Explanation Agent 开始生成解说: word={word}")

            # 构建请求
            explanation_request = build_word_explanation_request(
                word=word,
                phonetic=phonetic,
                meanings=meanings or [],
                examples=examples,
                collocations=collocations,
                etymology=etymology
            )

            # 创建 Agent
            agent = Agent(
                model=get_ai_model(),
                instructions=WORD_EXPLANATION_SYSTEM_PROMPT,
                markdown=False
            )

            # 执行生成
            response = await agent.arun(explanation_request, stream=False)
            explanation = response.content if hasattr(response, 'content') else str(response)

            # 清理响应文本
            explanation = explanation.strip()

            # 提取 token 使用信息
            metrics = getattr(response, 'metrics', None)
            token_usage = {
                "input_tokens": getattr(metrics, 'input_tokens', 0) if metrics else 0,
                "output_tokens": getattr(metrics, 'output_tokens', 0) if metrics else 0,
                "total_tokens": getattr(metrics, 'total_tokens', 0) if metrics else 0
            }

            log_info(f"Word Explanation Agent 生成完成: explanation_length={len(explanation)}, tokens={token_usage['total_tokens']}")
            return {"explanation": explanation, "token_usage": token_usage}

        except Exception as e:
            log_error(f"Word Explanation Agent 生成失败: {e}", e)
            return {
                "explanation": "",
                "token_usage": {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
            }


# 全局实例
word_explanation_agent = WordExplanationAgent()
