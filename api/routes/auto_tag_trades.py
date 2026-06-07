from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

SYSTEM_PROMPT = """You are a trade classification analyst. Given a list of trades with market context, classify each trade into a category. Categories: trend_following, mean_reversion, breakout, scalping, momentum, reversal, news_reaction, earnings_play, hedge, rebalance, other. Also assign a short tag (1-3 words) explaining the trade reason. Return JSON array of objects with original trade fields plus: tag (string), category (string), reasoning (string), market_context (string)."""


class AutoTagTradesRequest(BaseModel):
    trades: list[dict[str, Any]]


@router.post("/auto-tag-trades")
async def auto_tag_trades(req: AutoTagTradesRequest):
    if not req.trades:
        raise HTTPException(status_code=400, detail="trades list is required and must not be empty")

    prompt = f"""Trades to classify:
{json.dumps(req.trades, default=str)}

Classify each trade and return JSON array."""

    try:
        from .llm import _call_openai
        content = await _call_openai("gpt-4o-mini", SYSTEM_PROMPT + "\n\n" + prompt, 0.3, 2048)
        tagged = json.loads(content)
        if isinstance(tagged, dict):
            tagged = tagged.get("tagged_trades", [tagged])
        return {"tagged_trades": tagged}
    except ImportError:
        raise HTTPException(status_code=503, detail="LLM dependencies not available")
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Invalid JSON response from LLM")
    except Exception as e:
        logger.warning("Auto-tag trades failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Classification failed: {e}")
