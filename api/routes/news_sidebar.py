from __future__ import annotations
import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/news", tags=["news"])


class TickerRequest(BaseModel):
    symbols: list[str]


@router.post("/for-tickers")
async def news_for_tickers(body: TickerRequest):
    symbols = [s.upper().strip() for s in body.symbols if s.strip()]
    if not symbols:
        return {"news": []}

    news_items: list[dict[str, Any]] = []

    for sym in symbols[:10]:
        try:
            import yfinance as yf
            ticker = yf.Ticker(sym)
            raw = ticker.news
            if raw:
                for article in raw[:3]:
                    news_items.append({
                        "ticker": sym,
                        "headline": article.get("title", ""),
                        "source": article.get("publisher", "Yahoo Finance"),
                        "url": article.get("link", ""),
                        "time": int(article.get("providerPublishTime", 0)),
                        "sentiment": 0,
                    })
        except Exception as e:
            logger.debug("Failed to fetch news for %s: %s", sym, e)

    try:
        from api.market_intel import get_news_snapshot
        snapshot = get_news_snapshot("equities")
        if snapshot and "items" in snapshot:
            for item in snapshot["items"][:20]:
                ticker_match = ""
                for sym in symbols:
                    if sym.upper() in (item.get("symbol", "") or item.get("ticker", "") or "").upper():
                        ticker_match = sym
                        break
                if ticker_match:
                    news_items.append({
                        "ticker": ticker_match,
                        "headline": item.get("title", item.get("headline", "")),
                        "source": item.get("source", "Market Intel"),
                        "url": item.get("url", ""),
                        "time": int(item.get("time_published", 0)),
                        "sentiment": _parse_sentiment(item.get("overall_sentiment_score", 0)),
                    })
    except ImportError:
        pass
    except Exception as e:
        logger.debug("Market intel news error: %s", e)

    seen = set()
    deduped = []
    for item in news_items:
        key = (item["ticker"], item["headline"][:60])
        if key not in seen:
            seen.add(key)
            deduped.append(item)

    deduped.sort(key=lambda x: x["time"], reverse=True)

    return {"news": deduped[:50]}


def _parse_sentiment(score: float | str | None) -> int:
    if score is None:
        return 0
    try:
        s = float(score)
        if s > 0.15:
            return 1
        if s < -0.15:
            return -1
        return 0
    except (ValueError, TypeError):
        return 0
