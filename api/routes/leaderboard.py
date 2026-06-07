from __future__ import annotations

import json
import logging
import math
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

SYSTEM_PROMPT = """You are a performance analyst comparing AI agent trading against human trading. Given two sets of trade data, compute comparison metrics and provide insights on who is outperforming and why. Return JSON with comparison object and insights array."""


class LeaderboardCompareRequest(BaseModel):
    ai_trades: list[dict[str, Any]]
    human_trades: list[dict[str, Any]]
    period: str


def _compute_metrics(trades: list[dict[str, Any]]) -> dict[str, Any]:
    if not trades:
        return {"total_trades": 0, "win_rate": 0.0, "avg_pnl": 0.0, "total_pnl": 0.0, "sharpe_ratio": 0.0, "max_drawdown": 0.0}

    total = len(trades)
    pnls = [float(t.get("pnl", 0)) for t in trades]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p < 0]

    win_rate = len(wins) / total if total else 0.0
    avg_pnl = sum(pnls) / total if total else 0.0
    total_pnl = sum(pnls)

    if len(pnls) > 1:
        mean_pnl = sum(pnls) / len(pnls)
        variance = sum((p - mean_pnl) ** 2 for p in pnls) / (len(pnls) - 1)
        std = math.sqrt(variance) if variance > 0 else 1e-10
        sharpe_ratio = (mean_pnl / std) * math.sqrt(252) if std > 0 else 0.0
    else:
        sharpe_ratio = 0.0

    cumulative = 0
    peak = 0
    max_dd = 0.0
    for p in pnls:
        cumulative += p
        if cumulative > peak:
            peak = cumulative
        dd = (peak - cumulative) / (peak if peak != 0 else 1)
        if dd > max_dd:
            max_dd = dd

    return {
        "total_trades": total,
        "win_rate": round(win_rate, 4),
        "avg_pnl": round(avg_pnl, 4),
        "total_pnl": round(total_pnl, 4),
        "sharpe_ratio": round(sharpe_ratio, 4),
        "max_drawdown": round(max_dd, 4),
    }


@router.post("/leaderboard/compare")
async def leaderboard_compare(req: LeaderboardCompareRequest):
    ai_metrics = _compute_metrics(req.ai_trades)
    human_metrics = _compute_metrics(req.human_trades)

    comparison = {
        "total_trades_ai": ai_metrics["total_trades"],
        "total_trades_human": human_metrics["total_trades"],
        "win_rate_ai": ai_metrics["win_rate"],
        "win_rate_human": human_metrics["win_rate"],
        "avg_pnl_ai": ai_metrics["avg_pnl"],
        "avg_pnl_human": human_metrics["avg_pnl"],
        "total_pnl_ai": ai_metrics["total_pnl"],
        "total_pnl_human": human_metrics["total_pnl"],
        "sharpe_ratio_ai": ai_metrics["sharpe_ratio"],
        "sharpe_ratio_human": human_metrics["sharpe_ratio"],
        "max_drawdown_ai": ai_metrics["max_drawdown"],
        "max_drawdown_human": human_metrics["max_drawdown"],
    }

    prompt = f"""Period: {req.period}

AI Trades: {json.dumps(req.ai_trades, default=str)[:3000]}
Human Trades: {json.dumps(req.human_trades, default=str)[:3000]}

Computed Metrics:
AI: {json.dumps(ai_metrics)}
Human: {json.dumps(human_metrics)}

Compare performance and provide insights."""

    try:
        from .llm import _call_openai
        content = await _call_openai("gpt-4o-mini", SYSTEM_PROMPT + "\n\n" + prompt, 0.3, 1024)
        result = json.loads(content)

        ai_wr = comparison["win_rate_ai"]
        human_wr = comparison["win_rate_human"]
        ai_pnl = comparison["total_pnl_ai"]
        human_pnl = comparison["total_pnl_human"]
        if ai_wr > human_wr and ai_pnl > human_pnl:
            leader = "ai"
        elif human_wr > ai_wr and human_pnl > ai_pnl:
            leader = "human"
        else:
            leader = "tie"

        return {
            "comparison": comparison,
            "leader": result.get("leader", leader),
            "insights": result.get("insights", []),
        }
    except ImportError:
        raise HTTPException(status_code=503, detail="LLM dependencies not available")
    except json.JSONDecodeError:
        return {"comparison": comparison, "leader": "tie", "insights": []}
    except Exception as e:
        logger.warning("Leaderboard comparison failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Comparison failed: {e}")
