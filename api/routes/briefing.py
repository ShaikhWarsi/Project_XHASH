from __future__ import annotations

import json
import logging
import os
from datetime import date
from typing import Any

from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

BRIEFING_SYSTEM_PROMPT = """You are a professional trading desk analyst. Write a market briefing with these sections:
1. PORTFOLIO OVERVIEW — total value, best/worst positions, unrealized P&L
2. MARKET REGIME — trend direction, volatility level, key macro context
3. TOP RISKS & ACTIONS — concentration risk, drawdown, VaR exposure

Keep it concise, professional, and actionable. Use bullet points. Max 300 words.
No markdown formatting except bold for numbers."""


def _gather_portfolio_summary() -> dict[str, Any]:
    try:
        from api.state import _demo_portfolio  # internal demo state
        if _demo_portfolio:
            total = _demo_portfolio.get("total_value", 0)
            cash = _demo_portfolio.get("cash", 0)
            positions = _demo_portfolio.get("positions", {})
            best = None
            worst = None
            for sym, pos in positions.items():
                pnl = pos.get("unrealized_pnl", 0)
                if best is None or pnl > best["pnl"]:
                    best = {"symbol": sym, "pnl": pnl}
                if worst is None or pnl < worst["pnl"]:
                    worst = {"symbol": sym, "pnl": pnl}
            return {
                "total_value": total,
                "cash": cash,
                "position_count": len(positions),
                "best_position": best,
                "worst_position": worst,
            }
    except Exception:
        logger.debug("Failed to gather portfolio summary")
    return {"total_value": 0, "cash": 0, "position_count": 0}


def _gather_market_regime() -> dict[str, Any]:
    try:
        import yfinance as yf
        spy = yf.Ticker("SPY")
        hist = spy.history(period="3mo")
        if not hist.empty:
            start_price = hist["Close"].iloc[0]
            end_price = hist["Close"].iloc[-1]
            change_pct = ((end_price - start_price) / start_price) * 100
            high = hist["Close"].max()
            low = hist["Close"].min()
            return {
                "trend": "bullish" if change_pct > 3 else "bearish" if change_pct < -3 else "neutral",
                "spy_change_pct": round(change_pct, 1),
                "spy_range": f"${low:.0f}–${high:.0f}",
                "spy_current": round(end_price, 2),
            }
    except Exception as e:
        logger.debug("Failed to gather market regime: %s", e)
    return {"trend": "unknown", "spy_change_pct": 0}


def _gather_top_movers() -> list[dict[str, Any]]:
    try:
        import yfinance as yf
        popular = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM", "V", "SPY", "QQQ"]
        tickers = yf.Tickers(" ".join(popular))
        movers = []
        for sym in popular:
            try:
                t = tickers.tickers[sym]
                info = t.info or {}
                prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose")
                price = info.get("currentPrice") or info.get("regularMarketPrice")
                if prev_close and price and prev_close > 0:
                    pct = ((price - prev_close) / prev_close) * 100
                    if abs(pct) > 0.5:
                        movers.append({"symbol": sym, "change_pct": round(pct, 1), "price": round(price, 2)})
            except Exception:
                logger.debug("Failed to fetch mover data for %s", sym)
                continue
        movers.sort(key=lambda x: abs(x["change_pct"]), reverse=True)
        return movers[:5]
    except Exception as e:
        logger.debug("Failed to gather top movers: %s", e)
    return []


def _gather_risk_metrics() -> dict[str, Any]:
    try:
        from api.state import _demo_portfolio
        if _demo_portfolio:
            positions = _demo_portfolio.get("positions", {})
            total_value = _demo_portfolio.get("total_value", 0) or 1
            if positions:
                weights = [abs(pos.get("value", 0)) / total_value for pos in positions.values()]
                hhi = sum(w * w for w in weights)
                max_dd = max((pos.get("cost_basis", 0) - pos.get("value", 0)) / (pos.get("cost_basis", 1) or 1) for pos in positions.values()) if positions else 0
                daily_returns = [pos.get("change_pct", 0) for pos in positions.values() if pos.get("change_pct") is not None]
                if len(daily_returns) > 2:
                    daily_returns.sort()
                    var_95 = daily_returns[int(len(daily_returns) * 0.05)]
                else:
                    var_95 = 0
                return {
                    "var_95": f"{var_95:.1f}%",
                    "max_drawdown": f"{max(max_dd, 0):.1f}%",
                    "concentration": f"{hhi:.3f}",
                }
    except Exception:
        logger.debug("Failed to gather risk metrics")
    return {"var_95": "\u2014", "max_drawdown": "\u2014", "concentration": "\u2014"}


@router.get("/briefing")
async def ai_briefing():
    portfolio = _gather_portfolio_summary()
    regime = _gather_market_regime()
    movers = _gather_top_movers()
    risk = _gather_risk_metrics()

    context = json.dumps({
        "portfolio": portfolio,
        "market_regime": regime,
        "top_movers": movers,
        "risk_metrics": risk,
        "date": str(date.today()),
    }, default=str)

    try:
        from .llm import _call_openai, _get_model_config

        model = "gpt-4o-mini"
        try:
            _get_model_config(model)
        except Exception:
            model = "gpt-4o"

        system_prompt = BRIEFING_SYSTEM_PROMPT + f"\n\nCurrent context:\n{context}"
        content = await _call_openai(model, system_prompt, 0.5, 1024) if "openai" in model else ""

        return {
            "briefing": content,
            "generated_at": str(date.today()),
            "data_summary": {"portfolio": portfolio, "regime": regime, "movers": movers, "risk": risk},
        }
    except Exception as e:
        logger.warning("Briefing generation failed: %s", e)
        return {
            "briefing": f"⚠️ AI briefing failed: {e}\n\nPortfolio: ${portfolio.get('total_value', 0):,.0f} | Positions: {portfolio.get('position_count', 0)} | SPY: {regime.get('spy_current', '—')} ({regime.get('spy_change_pct', '—')}%) | Trend: {regime.get('trend', 'unknown').title()}",
            "generated_at": str(date.today()),
            "data_summary": {"portfolio": portfolio, "regime": regime, "movers": movers, "risk": risk},
            "error": str(e),
            "status": "degraded",
        }
