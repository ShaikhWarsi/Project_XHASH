from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/llm", tags=["llm"])

QUERY_SYSTEM_PROMPT = """You are an AI trading assistant with access to the user's portfolio and market data.
Answer questions based ONLY on the provided data. If you don't know, say so.

Available context:
- Portfolio: total_value, cash, positions with unrealized P&L, entry price, quantity, side
- Risk: VaR, max_drawdown, sharpe_ratio, exposures by sector
- Market regime: trend, volatility, macro context
- Recent trades: symbol, side, quantity, price, pnl

Example queries you can answer:
- "What's my biggest unrealized gain?" → sort positions by unrealized_pnl
- "How much exposure do I have to tech?" → check positions, classify by sector
- "What's my total portfolio value?" → check total_value
- "Show me my worst performing position" → sort by P&L ascending

Keep answers concise, data-driven, and specific."""


class QueryRequest(BaseModel):
    query: str
    message_history: list[dict[str, str]] = []


def _gather_portfolio_context() -> dict[str, Any]:
    try:
        from api.state import _demo_portfolio
        if _demo_portfolio:
            positions = _demo_portfolio.get("positions", {})
            pos_list = []
            for sym, p in positions.items():
                pos_list.append({
                    "symbol": sym,
                    "quantity": p.get("quantity", 0),
                    "entry_price": p.get("entry_price", 0),
                    "current_price": p.get("current_price", 0),
                    "unrealized_pnl": p.get("unrealized_pnl", 0),
                    "side": p.get("side", "long"),
                    "market_value": p.get("market_value", 0),
                })
            return {
                "total_value": _demo_portfolio.get("total_value", 0),
                "cash": _demo_portfolio.get("cash", 0),
                "positions": pos_list,
            }
    except Exception:
        pass
    return {"total_value": 0, "cash": 0, "positions": []}


def _gather_risk_context() -> dict[str, Any]:
    try:
        from api.state import _demo_portfolio
        if _demo_portfolio:
            return {
                "var_95": _demo_portfolio.get("var_95", "—"),
                "max_drawdown": _demo_portfolio.get("max_drawdown", "—"),
                "sharpe_ratio": _demo_portfolio.get("sharpe_ratio", "—"),
            }
    except Exception:
        pass
    return {}


def _gather_trade_context() -> list[dict[str, Any]]:
    try:
        from api.state import _demo_portfolio
        if _demo_portfolio:
            return _demo_portfolio.get("recent_trades", [])
    except Exception:
        pass
    return []


@router.post("/query")
async def llm_query(req: QueryRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="query is required")

    portfolio = _gather_portfolio_context()
    risk = _gather_risk_context()
    trades = _gather_trade_context()

    context = json.dumps({
        "portfolio": portfolio,
        "risk": risk,
        "recent_trades": trades[-10:],
    }, default=str)

    history_text = ""
    for msg in req.message_history[-6:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        history_text += f"{role.upper()}: {content}\n"

    prompt = f"""Current Data Context:
{context}

Conversation History:
{history_text}

User Query: {req.query}

Answer based ONLY on the provided data."""

    try:
        from .llm import _call_openai
        content = await _call_openai("gpt-4o-mini", QUERY_SYSTEM_PROMPT + "\n\n" + prompt, 0.3, 1024)
        return {
            "response": content,
            "context_used": ["portfolio", "risk", "trades"] if portfolio["total_value"] > 0 else [],
        }
    except ImportError:
        raise HTTPException(status_code=503, detail="LLM dependencies not available")
    except Exception as e:
        logger.warning("LLM query failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Query failed: {e}")
