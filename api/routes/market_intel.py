from typing import Optional

from fastapi import APIRouter, Header

from ..market_intel import (
    get_etf_flows_payload,
    get_featured_stock_analysis_payload,
    get_macro_signals_payload,
    get_market_intel_overview,
    get_market_news_payload,
    get_stock_analysis_history_payload,
    get_stock_analysis_latest_payload,
)

router = APIRouter(prefix="/api/market-intel", tags=["market-intel"])


@router.get("/overview")
async def market_intel_overview():
    return get_market_intel_overview()


@router.get("/news")
async def market_intel_news(
    category: Optional[str] = None,
    limit: int = 5,
):
    safe_limit = max(1, min(limit, 12))
    return get_market_news_payload(category=category, limit=safe_limit)


@router.get("/macro-signals")
async def market_intel_macro_signals():
    return get_macro_signals_payload()


@router.get("/etf-flows")
async def market_intel_etf_flows():
    return get_etf_flows_payload()


@router.get("/stocks/featured")
async def market_intel_featured_stocks(limit: int = 6):
    safe_limit = max(1, min(limit, 12))
    return get_featured_stock_analysis_payload(limit=safe_limit)


@router.get("/stocks/{symbol}/latest")
async def market_intel_stock_latest(symbol: str):
    normalized_symbol = (symbol or "").strip().upper()
    return get_stock_analysis_latest_payload(normalized_symbol)


@router.get("/stocks/{symbol}/history")
async def market_intel_stock_history(symbol: str, limit: int = 10):
    safe_limit = max(1, min(limit, 50))
    normalized_symbol = (symbol or "").strip().upper()
    return get_stock_analysis_history_payload(normalized_symbol, limit=safe_limit)
