from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)

from data.heatmap import generate_heatmap_data
from data.swr_cache import cached_or_compute, invalidate, clear_cache

router = APIRouter(prefix="/global-market", tags=["global_market"])


@router.get("/overview")
async def market_overview():
    def _compute():
        heatmap = generate_heatmap_data()
        return {
            "crypto_count": len(heatmap.get("crypto", {})),
            "sectors_count": len(heatmap.get("sectors", {})),
            "forex_count": len(heatmap.get("forex", {})),
            "commodities_count": len(heatmap.get("commodities", {})),
            "indices_count": len(heatmap.get("indices", {})),
        }

    data = cached_or_compute("market_overview", _compute, ttl=120)
    return data


@router.get("/heatmap")
async def market_heatmap(
    category: Optional[str] = Query(None, description="crypto, sectors, forex, commodities, indices"),
):
    data = generate_heatmap_data(category=category)
    return data


@router.get("/news")
async def market_news(limit: int = Query(20, le=50)):
    def _compute():
        try:
            import yfinance as yf
            indices = ["^GSPC", "^DJI", "^IXIC"]
            news_items = []
            seen = set()
            for idx in indices:
                try:
                    tk = yf.Ticker(idx)
                    raw = tk.news or []
                    for item in raw:
                        title = item.get("title", "")
                        if title not in seen:
                            seen.add(title)
                            news_items.append({
                                "title": title,
                                "publisher": item.get("publisher", ""),
                                "link": item.get("link", ""),
                                "summary": item.get("summary", ""),
                                "timestamp": item.get("providerPublishTime"),
                            })
                except Exception as e:
                    logger.debug("Failed to parse news item: %s", e)
                    continue
            news_items.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
            return news_items[:limit]
        except Exception as e:
            return {"error": str(e)}

    data = cached_or_compute("market_news", _compute, ttl=180)
    return data


@router.get("/sentiment")
async def market_sentiment():
    def _compute():
        result = {}
        try:
            import yfinance as yf
            vix_data = yf.Ticker("^VIX").history(period="5d")
            if not vix_data.empty:
                result["vix"] = round(float(vix_data["Close"].iloc[-1]), 2)
                result["vix_change_pct"] = round(
                    float(((vix_data["Close"].iloc[-1] / vix_data["Close"].iloc[-2]) - 1) * 100), 2
                ) if len(vix_data) >= 2 else 0

            dxy_data = yf.Ticker("DX-Y.NYB").history(period="5d")
            if not dxy_data.empty:
                result["dxy"] = round(float(dxy_data["Close"].iloc[-1]), 2)
        except Exception as e:
            result["error"] = str(e)
        return result

    data = cached_or_compute("market_sentiment", _compute, ttl=21600)
    return data


@router.post("/refresh")
async def refresh_cache():
    clear_cache()
    return {"status": "ok", "message": "Global market cache cleared"}
