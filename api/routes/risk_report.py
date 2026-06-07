from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

SYSTEM_PROMPT = """You are a risk reporting analyst. Generate a comprehensive risk report in HTML format. Include sections: 1) Executive Summary 2) Portfolio Overview 3) Risk Metrics 4) Exposure Analysis 5) Performance Attribution 6) Recommendations. Also provide a plain text version. Return JSON with report_html and report_text."""


class RiskReportRequest(BaseModel):
    email: str | None = None
    period: str
    portfolio_data: dict[str, Any]
    trades: list[dict[str, Any]]
    market_regime: str


@router.post("/risk-report")
async def risk_report(req: RiskReportRequest):
    if req.period not in ("weekly", "monthly"):
        raise HTTPException(status_code=400, detail="period must be 'weekly' or 'monthly'")
    if not req.portfolio_data:
        raise HTTPException(status_code=400, detail="portfolio_data is required")

    prompt = f"""Period: {req.period}
Market Regime: {req.market_regime}
Portfolio Data: {json.dumps(req.portfolio_data, default=str)[:3000]}
Recent Trades: {json.dumps(req.trades, default=str)[:3000]}

Generate a comprehensive risk report."""

    try:
        from .llm import _call_openai
        content = await _call_openai("gpt-4o-mini", SYSTEM_PROMPT + "\n\n" + prompt, 0.3, 3072)
        result = json.loads(content)

        generated_at = datetime.now(timezone.utc).isoformat()

        emailed_to = None
        if req.email:
            logger.info("Risk report would be emailed to %s (email sending not yet implemented)", req.email)
            emailed_to = req.email

        return {
            "report_html": result.get("report_html", "<html><body>Report generation failed</body></html>"),
            "report_text": result.get("report_text", "Report generation failed"),
            "generated_at": generated_at,
            "emailed_to": emailed_to,
        }
    except ImportError:
        raise HTTPException(status_code=503, detail="LLM dependencies not available")
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Invalid JSON response from LLM")
    except Exception as e:
        logger.warning("Risk report generation failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Report generation failed: {e}")
