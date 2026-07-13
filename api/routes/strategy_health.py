from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

SYSTEM_PROMPT = """You are a strategy health analyst. Given a trading strategy's code/config and recent performance data, assess its health. Look for: performance degradation, regime incompatibility, overfitting signs, parameter drift. Return JSON with health_score (0-100), drift_detected (bool), drift_details (string), recommendations (array of strings), win_rate_trend (string), sharpe_trend (string), max_dd_status (string)."""


class StrategyHealthRequest(BaseModel):
    strategy_name: str
    strategy_code: str
    recent_performance: list[dict[str, Any]]
    current_regime: str


@router.post("/strategy-health")
async def strategy_health(req: StrategyHealthRequest):
    if not req.strategy_name.strip():
        raise HTTPException(status_code=400, detail="strategy_name is required")

    prompt = f"""Strategy Name: {req.strategy_name}
Current Market Regime: {req.current_regime}
Recent Performance: {json.dumps(req.recent_performance, default=str)}
Strategy Code/Config: {req.strategy_code[:2000]}

Assess the health of this trading strategy."""

    try:
        from .llm import _call_openai
        content = await _call_openai("gpt-4o-mini", SYSTEM_PROMPT + "\n\n" + prompt, 0.3, 1024)
        result = json.loads(content)
        return {
            "health_score": result.get("health_score", 50),
            "drift_detected": result.get("drift_detected", False),
            "drift_details": result.get("drift_details", ""),
            "recommendations": result.get("recommendations", []),
            "win_rate_trend": result.get("win_rate_trend", ""),
            "sharpe_trend": result.get("sharpe_trend", ""),
            "max_dd_status": result.get("max_dd_status", ""),
        }
    except ImportError:
        raise HTTPException(status_code=503, detail="LLM dependencies not available")
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Invalid JSON response from LLM")
    except Exception as e:
        logger.warning("Strategy health check failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Analysis failed: {e}")
