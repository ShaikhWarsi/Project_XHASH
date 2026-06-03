from __future__ import annotations

import json
import logging
from typing import Any
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

INSPECTOR_SYSTEM_PROMPT = """You are a professional technical analyst with 20 years of experience.
Analyze the given chart pattern and provide a 4-part analysis:

1. WHAT THIS PATTERN MEANS — technical explanation specific to this setup, not generic textbook
2. HISTORICAL ANALOGS — specific similar patterns and how they played out (be specific about price action)
3. TRADING IMPLICATIONS — entry, exit, stop loss, and risk management
4. CONFIDENCE ASSESSMENT — is this pattern reliable right now given market context?

Be concise, data-driven, and specific. Reference actual price levels.
Do NOT use markdown formatting."""


class InspectPatternRequest(BaseModel):
    symbol: str
    pattern: dict[str, Any]
    price_data_summary: str = ""
    recent_signals: list[dict[str, Any]] = []


@router.post("/inspect-pattern")
async def inspect_pattern(req: InspectPatternRequest):
    if not req.symbol or not req.pattern:
        raise HTTPException(status_code=400, detail="symbol and pattern are required")

    pattern_json = json.dumps(req.pattern, default=str)
    signals_json = json.dumps(req.recent_signals[-5:], default=str)

    prompt = f"""Symbol: {req.symbol}
Pattern: {pattern_json}
Price Data: {req.price_data_summary[:2000]}
Recent Signals: {signals_json[:1000]}

Provide the 4-part technical analysis."""

    try:
        from .llm import _stream_openai

        full_prompt = INSPECTOR_SYSTEM_PROMPT + "\n\n" + prompt

        async def event_stream():
            async for event in _stream_openai("gpt-4o", full_prompt, 0.3, 2048):
                yield event

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except ImportError:
        raise HTTPException(status_code=503, detail="LLM dependencies not available")
    except Exception as e:
        logger.warning("Pattern inspection failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Inspection failed: {e}")
