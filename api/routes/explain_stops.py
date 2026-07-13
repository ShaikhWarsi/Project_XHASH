from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

SYSTEM_PROMPT = """You are a risk analyst explaining stop loss placement. Given position data, ATR, volatility, and market regime, explain why the stop is set at a specific level. Consider: ATR-based volatility, support/resistance levels, percentage risk, market regime. Return JSON."""


class ExplainStopRequest(BaseModel):
    symbol: str
    entry_price: float
    current_price: float
    stop_price: float
    position_size: float
    side: str
    atr_value: float | None = None
    volatility_percent: float | None = None
    market_regime: str | None = None


@router.post("/explain-stop")
async def explain_stop(req: ExplainStopRequest):
    if not req.symbol.strip():
        raise HTTPException(status_code=400, detail="symbol is required")

    risk_amount = abs(req.entry_price - req.stop_price) * req.position_size
    risk_pct = abs(req.entry_price - req.stop_price) / req.entry_price if req.entry_price else 0

    prompt = f"""Symbol: {req.symbol}
Entry Price: {req.entry_price}
Current Price: {req.current_price}
Stop Price: {req.stop_price}
Position Size: {req.position_size}
Side: {req.side}
ATR Value: {req.atr_value or 'N/A'}
Volatility %: {req.volatility_percent or 'N/A'}
Market Regime: {req.market_regime or 'N/A'}
Risk Amount: {risk_amount:.2f}
Risk %: {risk_pct:.4f}

Explain the stop loss placement for this position."""

    try:
        from .llm import _call_openai
        content = await _call_openai("gpt-4o-mini", SYSTEM_PROMPT + "\n\n" + prompt, 0.3, 1024)
        result = json.loads(content)
        return {
            "explanation": result.get("explanation", ""),
            "method_used": result.get("method_used", "combined"),
            "key_factors": result.get("key_factors", []),
            "risk_amount": round(risk_amount, 2),
            "risk_pct": round(risk_pct * 100, 2),
            "confidence": result.get("confidence", 0.5),
        }
    except ImportError:
        raise HTTPException(status_code=503, detail="LLM dependencies not available")
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Invalid JSON response from LLM")
    except Exception as e:
        logger.warning("Explain stop failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Explanation failed: {e}")
