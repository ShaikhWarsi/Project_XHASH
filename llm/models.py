from __future__ import annotations

from pydantic import BaseModel, Field


class AnalystOutput(BaseModel):
    signal: str = Field(..., pattern="^(bullish|bearish|neutral)$")
    confidence: float = Field(..., ge=0.0, le=1.0)
    reasoning: str = ""
    suggested_action: str | None = None
    risk_factors: list[str] = Field(default_factory=list)


class PortfolioDecision(BaseModel):
    ticker: str
    action: str = Field(..., pattern="^(buy|sell|short|cover|hold)$")
    quantity: int | None = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    reasoning: str = ""
