from __future__ import annotations

import logging
import re
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

STRATEGY_SYSTEM_PROMPT = """You generate FinScript code. FinScript is a PineScript-like DSL for backtesting trading strategies.

Available built-in variables: close, open, high, low, volume, hl2, hlc3, ohlc4
Available functions:
- sma(series, period), ema(series, period), rsi(series, period)
- macd(series), bb(series, period, stddev)
- stoch(high, low, close, k, d)
- atr(high, low, close, period), adx(high, low, close, period)
- crossover(a, b), crossunder(a, b)
- highest(series, period), lowest(series, period)
- buy(size=1), sell(size=1)
- plot(value, title)
- strategy(initial_capital=100000, commission=0.001)
- close_entries(days_held)

Rules:
- Only use the functions listed above
- Do NOT use import, eval, exec, os, sys, or any external modules
- The code should be a complete, runnable strategy
- Return ONLY valid FinScript code in a ```finscript code block
- Include a comment at the top with the strategy name and description"""


class GenerateStrategyRequest(BaseModel):
    description: str
    symbol: str = ""


@router.post("/generate-strategy")
async def generate_strategy(req: GenerateStrategyRequest):
    if not req.description.strip():
        raise HTTPException(status_code=400, detail="description is required")

    prompt = f"""Strategy Description: {req.description}

Generate a complete FinScript strategy for this description."""

    try:
        from .llm import _call_openai
        content = await _call_openai("gpt-4o", STRATEGY_SYSTEM_PROMPT + "\n\n" + prompt, 0.3, 4096)

        code_match = re.search(r"```(?:finscript)?\n?(.*?)```", content, re.DOTALL)
        code = code_match.group(1).strip() if code_match else content.strip()
        explanation = content.replace(code, "") if not code_match else ""

        return {
            "code": code,
            "explanation": explanation.strip()[:500],
            "symbol": req.symbol or "AAPL",
            "warnings": [],
        }
    except ImportError:
        raise HTTPException(status_code=503, detail="LLM dependencies not available")
    except Exception as e:
        logger.warning("Strategy generation failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Generation failed: {e}")


class EvaluateStrategyRequest(BaseModel):
    code: str
    symbol: str = "AAPL"
    start: str = "2024-01-01"
    end: str = "2024-12-31"


@router.post("/evaluate-strategy")
async def evaluate_strategy(req: EvaluateStrategyRequest):
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="code is required")

    try:
        from finscript import execute as finscript_execute
        import yfinance as yf

        ticker = yf.Ticker(req.symbol)
        df = ticker.history(start=req.start, end=req.end)
        if df.empty:
            return {"error": f"No data for {req.symbol}"}

        df.columns = [c.lower() for c in df.columns]
        data = {req.symbol: df}

        result = finscript_execute(req.code, data)
        return {
            "symbol": req.symbol,
            "signals": result.get("signals", []),
            "plots": result.get("plots", {}),
            "trades": result.get("trades", []),
            "metrics": result.get("metrics", {}),
        }
    except ImportError:
        raise HTTPException(status_code=503, detail="FinScript engine not available")
    except Exception as e:
        logger.warning("Strategy evaluation failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Evaluation failed: {e}")
