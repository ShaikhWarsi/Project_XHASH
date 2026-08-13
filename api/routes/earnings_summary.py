from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

EARNINGS_SYSTEM_PROMPT = """You are an equity research analyst specializing in earnings call analysis.
Given earnings transcript data, produce a structured summary with:
1. BULL CASE (3-5 bullet points) — positive takeaways
2. BEAR CASE (3-5 bullet points) — risks and concerns
3. ONE-LINE RISK — the single biggest risk in plain English
4. OVERALL SENTIMENT — bullish/bearish/neutral

Be data-driven and specific. Reference actual numbers from the transcript.
No markdown formatting."""


class EarningsSummaryRequest(BaseModel):
    symbol: str
    transcript_text: str


@router.post("/earnings-summary")
async def earnings_summary(req: EarningsSummaryRequest):
    if not req.symbol or not req.transcript_text:
        raise HTTPException(status_code=400, detail="symbol and transcript_text required")

    truncated = req.transcript_text[:8000]
    prompt = f"""Symbol: {req.symbol}

Transcript excerpt:
{truncated}

Produce the structured earnings summary."""

    try:
        from .llm import _call_openai
        content = await _call_openai("gpt-4o-mini", EARNINGS_SYSTEM_PROMPT + "\n\n" + prompt, 0.3, 1536)
        return {
            "symbol": req.symbol,
            "summary": content,
            "generated_at": __import__("datetime").datetime.now().isoformat(),
        }
    except ImportError:
        raise HTTPException(status_code=503, detail="LLM dependencies not available")
    except Exception as e:
        logger.warning("Earnings summary failed for %s: %s", req.symbol, e)
        raise HTTPException(status_code=500, detail="Earnings summary generation failed. Please try again.")
