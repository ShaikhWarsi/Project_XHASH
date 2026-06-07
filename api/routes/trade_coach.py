from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

SYSTEM_PROMPT = """You are a trading coach. Given a completed trade and recent trade history, provide a post-trade review. Grade the trade (A-F), identify strengths and weaknesses, find similar historical trades, and extract lessons. Return JSON."""


class TradeCoachRequest(BaseModel):
    trade: dict[str, Any]
    recent_trades: list[dict[str, Any]] = []


@router.post("/trade-coach")
async def trade_coach(req: TradeCoachRequest):
    if not req.trade:
        raise HTTPException(status_code=400, detail="trade is required")

    prompt = f"""Trade to Review:
{json.dumps(req.trade, default=str)}

Recent Trade History:
{json.dumps(req.recent_trades, default=str)[:3000]}

Provide a post-trade review with grade, strengths, weaknesses, similar trades, and lessons."""

    try:
        from .llm import _call_openai
        content = await _call_openai("gpt-4o-mini", SYSTEM_PROMPT + "\n\n" + prompt, 0.3, 1536)
        result = json.loads(content)
        return {
            "review": result.get("review", ""),
            "grade": result.get("grade", "C"),
            "strengths": result.get("strengths", []),
            "weaknesses": result.get("weaknesses", []),
            "similar_trades": result.get("similar_trades", []),
            "lessons": result.get("lessons", []),
            "score": result.get("score", 50),
        }
    except ImportError:
        raise HTTPException(status_code=503, detail="LLM dependencies not available")
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Invalid JSON response from LLM")
    except Exception as e:
        logger.warning("Trade coach failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Review failed: {e}")
