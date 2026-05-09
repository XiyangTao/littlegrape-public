"""Story Practice — Pydantic schemas"""

from typing import List, Optional
from pydantic import BaseModel, Field


class CorrectionItem(BaseModel):
    original: str
    corrected: str
    explanation: str


class EvaluateRequest(BaseModel):
    goal: str = Field(..., description="What the user should express")
    goal_description: str = Field(default="", description="Deprecated, use goal instead")
    expected_answer: str = Field(..., description="Reference answer from the script")
    user_answer: str = Field(..., description="User's actual response")
    difficulty_level: str = Field(default="cet4", description="Difficulty level")


class TokenUsage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0


class EvaluateResponse(BaseModel):
    achieved: bool = Field(..., description="Whether the goal was achieved")
    feedback: str = Field(..., description="Brief English feedback")
    score: int = Field(..., description="Quality score 1-10")
    corrections: List[CorrectionItem] = Field(default_factory=list)
    highlights: List[str] = Field(default_factory=list)
    summary: str = Field(default="", description="One-line English summary")
    token_usage: Optional[TokenUsage] = None
