from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

SYSTEM_PROMPT = """You are a portfolio commentary analyst. Given portfolio performance data for a period, generate a natural-language P&L explanation. Structure: 1) Overview of period performance 2) Key drivers (top winners/losers with reasoning) 3) Risk factors that materialized 4) Forward outlook. Write in clear, professional English. Return JSON."""


class ExplainPnlRequest(BaseModel):
    period: str
    trades: list[dict[str, Any]]
    portfolio_value_history: list[dict[str, Any]]
    market_regime: str
    top_performers: list[str]
    worst_performers: list[str]


@router.post("/explain-pnl")
async def explain_pnl(req: ExplainPnlRequest):
    if req.period not in ("day", "week", "month"):
        raise HTTPException(status_code=400, detail="period must be 'day', 'week', or 'month'")

    prompt = f"""Period: {req.period}
Market Regime: {req.market_regime}
Top Performers: {', '.join(req.top_performers)}
Worst Performers: {', '.join(req.worst_performers)}
Trades: {json.dumps(req.trades, default=str)[:3000]}
Portfolio Value History: {json.dumps(req.portfolio_value_history, default=str)[:2000]}

Generate a natural-language P&L explanation."""

    try:
        from .llm import _call_openai
        content = await _call_openai("gpt-4o-mini", SYSTEM_PROMPT + "\n\n" + prompt, 0.5, 1024)
        result = json.loads(content)
        return {
            "narrative": result.get("narrative", ""),
            "key_drivers": result.get("key_drivers", []),
            "risk_factors": result.get("risk_factors", []),
            "forward_outlook": result.get("forward_outlook", ""),
        }
    except ImportError:
        raise HTTPException(status_code=503, detail="LLM dependencies not available")
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Invalid JSON response from LLM")
    except Exception as e:
        logger.warning("Explain P&L failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Explanation failed: {e}")
