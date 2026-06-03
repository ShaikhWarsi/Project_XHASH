from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

CO_MOVEMENT_SYSTEM_PROMPT = """You are a quantitative analyst specializing in cross-asset correlation and news-driven co-movement analysis.
Given a news headline and a list of related tickers with their price changes, identify which tickers are most likely moving in reaction to the headline.

For each correlated ticker, provide:
- ticker: symbol
- co_move_direction: "up" or "down"
- confidence: 0.0 to 1.0
- reasoning: one-sentence explanation

Return your analysis as a JSON array. Max 5 tickers."""


class CoMovementRequest(BaseModel):
    headline: str
    tickers: list[str]
    price_changes: dict[str, float]


@router.post("/co-movement")
async def news_co_movement(req: CoMovementRequest):
    sorted_tickers = sorted(req.tickers, key=lambda t: abs(req.price_changes.get(t, 0)), reverse=True)
    top = sorted_tickers[:10]

    prompt = f"""News Headline: "{req.headline}"

Ticker price changes (sorted by absolute movement):
{chr(10).join(f"  {t}: {req.price_changes.get(t, 0):+.2f}%" for t in top)}

Identify which tickers are most likely co-moving in response to this headline. Return JSON array."""

    try:
        from .llm import _call_openai
        content = await _call_openai("gpt-4o-mini", CO_MOVEMENT_SYSTEM_PROMPT + "\n\n" + prompt, 0.3, 1024)
        import json
        try:
            parsed = json.loads(content)
            if isinstance(parsed, list):
                return {"co_movements": parsed, "source": "llm"}
        except json.JSONDecodeError:
            pass
    except Exception as e:
        logger.debug("Co-movement LLM failed: %s", e)

    fallback = []
    for t in top[:5]:
        change = req.price_changes.get(t, 0)
        if abs(change) > 0.5:
            fallback.append({
                "ticker": t,
                "co_move_direction": "up" if change > 0 else "down",
                "confidence": round(min(abs(change) / 5, 1), 2),
                "reasoning": f"Moved {change:+.2f}% on the news",
            })
    return {"co_movements": fallback, "source": "fallback"}
