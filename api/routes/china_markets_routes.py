from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/china", tags=["china markets"])

_CHINA_STOCK_LIST = [
    {"symbol": "600519.SS", "name": "Kweichow Moutai", "exchange": "SH", "yf_symbol": "600519.SS"},
    {"symbol": "000858.SZ", "name": "Wuliangye Yibin", "exchange": "SZ", "yf_symbol": "000858.SZ"},
    {"symbol": "601318.SS", "name": "Ping An Insurance", "exchange": "SH", "yf_symbol": "601318.SS"},
    {"symbol": "600036.SS", "name": "China Merchants Bank", "exchange": "SH", "yf_symbol": "600036.SS"},
    {"symbol": "000333.SZ", "name": "Midea Group", "exchange": "SZ", "yf_symbol": "000333.SZ"},
    {"symbol": "601166.SS", "name": "Industrial Bank", "exchange": "SH", "yf_symbol": "601166.SS"},
    {"symbol": "002415.SZ", "name": "Hikvision", "exchange": "SZ", "yf_symbol": "002415.SZ"},
    {"symbol": "600887.SS", "name": "Inner Mongolia Yili", "exchange": "SH", "yf_symbol": "600887.SS"},
    {"symbol": "601012.SS", "name": "LONGi Green Energy", "exchange": "SH", "yf_symbol": "601012.SS"},
    {"symbol": "002594.SZ", "name": "BYD Company", "exchange": "SZ", "yf_symbol": "002594.SZ"},
]

_CHINA_INDEX_LIST = [
    {"symbol": "000001.SS", "name": "Shanghai Composite", "exchange": "SH", "yf_symbol": "000001.SS"},
    {"symbol": "399001.SZ", "name": "SZSE Component", "exchange": "SZ", "yf_symbol": "399001.SZ"},
    {"symbol": "399006.SZ", "name": "ChiNext", "exchange": "SZ", "yf_symbol": "399006.SZ"},
    {"symbol": "^HSI", "name": "Hang Seng Index", "exchange": "HK", "yf_symbol": "^HSI"},
    {"symbol": "^HSCE", "name": "Hang Seng China Enterprises", "exchange": "HK", "yf_symbol": "^HSCE"},
]

_price_cache: dict[str, dict[str, Any]] = {}
_CACHE_TTL = 120


async def _fetch_yf_quote(yf_symbol: str) -> dict[str, Any] | None:
    now = time.time()
    cached = _price_cache.get(yf_symbol)
    if cached and now - cached.get("_ts", 0) < _CACHE_TTL:
        return cached

    try:
        import yfinance as yf

        def _fetch():
            ticker = yf.Ticker(yf_symbol)
            hist = ticker.history(period="5d")
            info = ticker.info or {}
            return hist, info

        hist, info = await asyncio.to_thread(_fetch)
        if hist is None or hist.empty:
            return None

        current = float(hist["Close"].iloc[-1])
        prev = float(hist["Close"].iloc[-2]) if len(hist) > 1 else current
        change = current - prev
        change_pct = (change / prev * 100) if prev else 0
        volume = int(hist["Volume"].iloc[-1]) if "Volume" in hist.columns else 0

        result = {
            "price": round(current, 2),
            "change": round(change, 2),
            "changePct": round(change_pct, 2),
            "volume": volume,
            "high": round(float(hist["High"].iloc[-1]), 2),
            "low": round(float(hist["Low"].iloc[-1]), 2),
            "open": round(float(hist["Open"].iloc[-1]), 2),
            "marketCap": info.get("marketCap"),
            "pe": info.get("trailingPE"),
            "name": info.get("shortName", ""),
            "_ts": now,
        }
        _price_cache[yf_symbol] = result
        return result
    except Exception as e:
        logger.warning("yfinance fetch failed for %s: %s", yf_symbol, e)
        return None


class STScreenRequest(BaseModel):
    symbols: list[str]


@router.get("/bars/{symbol}")
async def china_bars(symbol: str, interval: str = "1d", count: int = 500, provider: str = "yfinance"):
    try:
        import yfinance as yf

        yf_interval = {"1d": "1d", "1wk": "1wk", "1mo": "1mo", "5m": "5m", "15m": "15m", "60m": "60m"}.get(interval, "1d")
        period = "1y" if interval == "1d" else "60d" if interval in ("5m", "15m", "60m") else "2y"

        def _fetch():
            ticker = yf.Ticker(symbol)
            return ticker.history(period=period, interval=yf_interval)

        df = await asyncio.to_thread(_fetch)
        if df is None or df.empty:
            return {"symbol": symbol, "interval": interval, "bars": []}

        bars = []
        for idx, row in df.iterrows():
            ts = int(idx.timestamp()) if hasattr(idx, "timestamp") else int(idx)
            bars.append({
                "time": ts,
                "open": round(float(row["Open"]), 4),
                "high": round(float(row["High"]), 4),
                "low": round(float(float(row["Low"])), 4),
                "close": round(float(row["Close"]), 4),
                "volume": int(row.get("Volume", 0)),
            })
        return {"symbol": symbol, "interval": interval, "bars": bars[-count:]}
    except ImportError:
        raise HTTPException(503, "yfinance not installed. Run: pip install yfinance")
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch bars: {str(e)[:200]}")


@router.get("/fundamentals/{symbol}")
async def china_fundamentals(symbol: str):
    try:
        import yfinance as yf

        def _fetch():
            ticker = yf.Ticker(symbol)
            info = ticker.info or {}
            return info

        info = await asyncio.to_thread(_fetch)
        fundamentals = {
            "symbol": symbol,
            "name": info.get("shortName", info.get("longName", symbol)),
            "sector": info.get("sector", "N/A"),
            "industry": info.get("industry", "N/A"),
            "marketCap": info.get("marketCap"),
            "enterpriseValue": info.get("enterpriseValue"),
            "trailingPE": info.get("trailingPE"),
            "forwardPE": info.get("forwardPE"),
            "pegRatio": info.get("pegRatio"),
            "priceToBook": info.get("priceToBook"),
            "priceToSales": info.get("priceToSalesTrailing12Months"),
            "dividendYield": info.get("dividendYield"),
            "returnOnEquity": info.get("returnOnEquity"),
            "revenueGrowth": info.get("revenueGrowth"),
            "earningsGrowth": info.get("earningsGrowth"),
            "debtToEquity": info.get("debtToEquity"),
            "freeCashflow": info.get("freeCashflow"),
            "totalRevenue": info.get("totalRevenue"),
            "targetMeanPrice": info.get("targetMeanPrice"),
            "recommendationMean": info.get("recommendationMean"),
        }
        return {"symbol": symbol, "fundamentals": fundamentals}
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch fundamentals: {str(e)[:200]}")


@router.get("/financials/{symbol}")
async def china_financials(symbol: str, statement_type: str = "income"):
    try:
        import yfinance as yf

        def _fetch():
            ticker = yf.Ticker(symbol)
            if statement_type == "income":
                df = ticker.income_stmt
            elif statement_type == "balance":
                df = ticker.balance_sheet
            elif statement_type == "cashflow":
                df = ticker.cashflow
            else:
                df = ticker.income_stmt
            return df

        df = await asyncio.to_thread(_fetch)
        if df is None or df.empty:
            return {"symbol": symbol, "financials": [], "statement_type": statement_type}

        columns = [str(c.date()) for c in df.columns[:4]]
        rows = []
        for idx_name in df.index[:20]:
            values = []
            for col in df.columns[:4]:
                val = df.loc[idx_name, col]
                values.append(None if val != val else float(val))
            rows.append({"item": str(idx_name), "values": dict(zip(columns, values))})

        return {"symbol": symbol, "statement_type": statement_type, "columns": columns, "rows": rows}
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch financials: {str(e)[:200]}")


@router.get("/penalties")
async def china_penalties(symbol: str = ""):
    return {"penalties": [], "note": "Penalty data requires CNINFO or Wind API integration"}


@router.get("/st-risk/{symbol}")
async def st_risk(symbol: str):
    try:
        import yfinance as yf

        def _fetch():
            ticker = yf.Ticker(symbol)
            info = ticker.info or {}
            hist = ticker.history(period="1y")
            return info, hist

        info, hist = await asyncio.to_thread(_fetch)
        if hist is None or hist.empty:
            return {"symbol": symbol, "st_risk": "unknown", "details": "No data available"}

        current_price = float(hist["Close"].iloc[-1])
        high_52w = float(hist["High"].max())
        low_52w = float(hist["Low"].min())
        drawdown = (current_price - high_52w) / high_52w * 100 if high_52w else 0

        risk_score = 0
        if drawdown < -50:
            risk_score += 3
        elif drawdown < -30:
            risk_score += 2
        elif drawdown < -20:
            risk_score += 1

        if current_price < 2:
            risk_score += 2
        elif current_price < 5:
            risk_score += 1

        if risk_score >= 4:
            risk_level = "critical"
        elif risk_score >= 2:
            risk_level = "high"
        elif risk_score >= 1:
            risk_level = "medium"
        else:
            risk_level = "low"

        return {
            "symbol": symbol,
            "st_risk": risk_level,
            "risk_score": risk_score,
            "current_price": round(current_price, 2),
            "high_52w": round(high_52w, 2),
            "low_52w": round(low_52w, 2),
            "drawdown_from_high": round(drawdown, 2),
            "pe": info.get("trailingPE"),
            "market_cap": info.get("marketCap"),
        }
    except Exception as e:
        return {"symbol": symbol, "st_risk": "unknown", "error": str(e)[:200]}


@router.post("/st-screen")
async def st_screen(req: STScreenRequest):
    results = []
    for symbol in req.symbols:
        risk = await st_risk(symbol)
        results.append(risk)
    return {"results": results}


@router.get("/convert/{symbol}")
async def convert_china_symbol(symbol: str):
    clean = symbol.replace(".SS", "").replace(".SZ", "").replace(".HK", "")
    suffix = ".SS" if symbol.endswith(".SS") else ".SZ" if symbol.endswith(".SZ") else ".HK"
    return {"original": symbol, "yfinance": f"{clean}{suffix}", "clean": clean}


@router.get("/stocks")
async def china_stocks():
    results = []
    tasks = []
    for stock in _CHINA_STOCK_LIST:
        tasks.append((stock, _fetch_yf_quote(stock["yf_symbol"])))

    fetched = await asyncio.gather(*[t[1] for t in tasks], return_exceptions=True)
    for (stock, _), data in zip(tasks, fetched):
        if isinstance(data, Exception) or data is None:
            results.append({
                **stock,
                "price": 0, "change": 0, "changePct": 0, "volume": 0,
                "status": "unavailable",
            })
        else:
            results.append({
                "symbol": stock["symbol"],
                "name": stock["name"] or data.get("name", stock["symbol"]),
                "exchange": stock["exchange"],
                "price": data["price"],
                "change": data["change"],
                "changePct": data["changePct"],
                "volume": data["volume"],
                "high": data["high"],
                "low": data["low"],
                "open": data["open"],
                "marketCap": data.get("marketCap"),
                "pe": data.get("pe"),
                "status": "live",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
    return {"stocks": results}


@router.get("/indices")
async def china_indices():
    results = []
    tasks = []
    for idx in _CHINA_INDEX_LIST:
        tasks.append((idx, _fetch_yf_quote(idx["yf_symbol"])))

    fetched = await asyncio.gather(*[t[1] for t in tasks], return_exceptions=True)
    for (idx, _), data in zip(tasks, fetched):
        if isinstance(data, Exception) or data is None:
            results.append({
                **idx,
                "price": 0, "change": 0, "changePct": 0, "volume": 0,
                "status": "unavailable",
            })
        else:
            results.append({
                "symbol": idx["symbol"],
                "name": idx["name"],
                "exchange": idx["exchange"],
                "price": data["price"],
                "change": data["change"],
                "changePct": data["changePct"],
                "volume": data["volume"],
                "status": "live",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
    return {"indices": results}
