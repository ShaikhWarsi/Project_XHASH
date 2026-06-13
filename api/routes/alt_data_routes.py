from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/alt-data", tags=["alternative-data"])

_cache: dict[str, dict[str, Any]] = {}
_CACHE_TTL = 300


async def _cached_fetch(key: str, fetcher, ttl: int = _CACHE_TTL) -> Any:
    now = time.time()
    cached = _cache.get(key)
    if cached and now - cached.get("_ts", 0) < ttl:
        return cached.get("data")
    data = await fetcher()
    _cache[key] = {"data": data, "_ts": now}
    return data


# ── Dark Pool / Off-Exchange Data ──
@router.get("/dark-pool")
async def dark_pool_data(symbol: str = "SPY"):
    async def _fetch():
        try:
            import yfinance as yf

            def _get():
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="1mo")
                info = ticker.info or {}
                return hist, info

            hist, info = await asyncio.to_thread(_get)
            if hist is None or hist.empty:
                return {"symbol": symbol, "data": [], "note": "No data available"}

            data = []
            total_vol = 0
            for idx, row in hist.iterrows():
                vol = int(row.get("Volume", 0))
                total_vol += vol
                avg_vol = vol
                dark_pool_est = int(vol * 0.42)
                lit_vol = vol - dark_pool_est
                data.append({
                    "date": idx.strftime("%Y-%m-%d"),
                    "totalVolume": vol,
                    "darkPoolVolume": dark_pool_est,
                    "litVolume": lit_vol,
                    "darkPoolPct": round(dark_pool_est / vol * 100, 1) if vol else 0,
                    "close": round(float(row["Close"]), 2),
                })
            avg_dark_pct = sum(d["darkPoolPct"] for d in data) / len(data) if data else 0
            return {
                "symbol": symbol,
                "averageDarkPoolPct": round(avg_dark_pct, 1),
                "recentData": data[-20:],
                "note": "Dark pool volume estimated at ~42% of total volume (industry average)",
                "source": "yfinance (estimated)",
            }
        except Exception as e:
            return {"symbol": symbol, "data": [], "error": str(e)[:200]}

    return await _cached_fetch(f"dark_pool_{symbol}", _fetch)


# ── ETF Flow Data ──
@router.get("/etf-flow")
async def etf_flow_data():
    ETF_LIST = ["SPY", "QQQ", "IWM", "DIA", "VOO", "VTI", "ARKK", "XLF", "XLE", "XLK", "GLD", "SLV", "TLT", "HYG", "EEM"]

    async def _fetch():
        try:
            import yfinance as yf

            results = []

            def _get_etf(sym):
                ticker = yf.Ticker(sym)
                hist = ticker.history(period="5d")
                info = ticker.info or {}
                return sym, hist, info

            fetched = await asyncio.to_thread(lambda: [_get_etf(s) for s in ETF_LIST])
            for sym, hist, info in fetched:
                if hist is None or hist.empty:
                    continue
                current = float(hist["Close"].iloc[-1])
                prev = float(hist["Close"].iloc[-2]) if len(hist) > 1 else current
                change = current - prev
                change_pct = (change / prev * 100) if prev else 0
                volume = int(hist["Volume"].iloc[-1]) if "Volume" in hist.columns else 0
                avg_vol = int(hist["Volume"].mean()) if "Volume" in hist.columns and len(hist) > 1 else volume
                volume_ratio = round(volume / avg_vol, 2) if avg_vol else 0
                flow_est = volume * current * (1 if change >= 0 else -1) * 0.1

                results.append({
                    "symbol": sym,
                    "name": info.get("shortName", sym),
                    "price": round(current, 2),
                    "change": round(change, 2),
                    "changePct": round(change_pct, 2),
                    "volume": volume,
                    "avgVolume": avg_vol,
                    "volumeRatio": volume_ratio,
                    "estimatedFlow": round(flow_est, 0),
                    "aum": info.get("totalAssets"),
                    "flowDirection": "inflow" if change >= 0 else "outflow",
                })
            results.sort(key=lambda x: abs(x.get("estimatedFlow", 0)), reverse=True)
            return {"etfs": results, "timestamp": datetime.now(timezone.utc).isoformat()}
        except Exception as e:
            return {"etfs": [], "error": str(e)[:200]}

    return await _cached_fetch("etf_flow", _fetch)


# ── Insider Transactions ──
@router.get("/insider-transactions")
async def insider_transactions(symbol: str = "AAPL"):
    async def _fetch():
        try:
            import yfinance as yf

            def _get():
                ticker = yf.Ticker(symbol)
                insiders = ticker.insider_transactions
                info = ticker.info or {}
                return insiders, info

            insiders_df, info = await asyncio.to_thread(_get)
            if insiders_df is None or insiders_df.empty:
                return {"symbol": symbol, "transactions": [], "summary": {}}

            transactions = []
            for idx, row in insiders_df.head(30).iterrows():
                trans = {
                    "date": str(row.get("Start Date", idx)),
                    "insider": str(row.get("Insider", "")),
                    "title": str(row.get("Title", "")),
                    "transaction": str(row.get("Transaction", "")),
                    "shares": int(row.get("Value", 0)) if row.get("Value") else 0,
                    "ownership": str(row.get("Owns", "")),
                    "type": str(row.get("Text", "")),
                }
                transactions.append(trans)

            buys = sum(1 for t in transactions if "Buy" in t.get("transaction", "").upper() or "Purchase" in t.get("transaction", "").upper())
            sells = len(transactions) - buys

            return {
                "symbol": symbol,
                "name": info.get("shortName", symbol),
                "transactions": transactions,
                "summary": {
                    "totalTransactions": len(transactions),
                    "buys": buys,
                    "sells": sells,
                    "buyRatio": round(buys / len(transactions) * 100, 1) if transactions else 0,
                    "sentiment": "bullish" if buys > sells else "bearish" if sells > buys else "neutral",
                },
                "source": "yfinance",
            }
        except Exception as e:
            return {"symbol": symbol, "transactions": [], "error": str(e)[:200]}

    return await _cached_fetch(f"insider_{symbol}", _fetch, ttl=600)


# ── Short Interest ──
@router.get("/short-interest")
async def short_interest(symbol: str = "GME"):
    async def _fetch():
        try:
            import yfinance as yf

            def _get():
                ticker = yf.Ticker(symbol)
                info = ticker.info or {}
                hist = ticker.history(period="3mo")
                return info, hist

            info, hist = await asyncio.to_thread(_get)
            short_pct = info.get("shortPercentOfFloat", 0) or 0
            short_ratio = info.get("shortRatio", 0) or 0
            short_prev = info.get("sharesShortPriorMonth", 0) or 0
            short_curr = info.get("sharesShort", 0) or 0
            float_shares = info.get("floatShares", 1) or 1

            change = short_curr - short_prev
            change_pct = (change / short_prev * 100) if short_prev else 0

            price_history = []
            if hist is not None and not hist.empty:
                for idx, row in hist.iterrows():
                    price_history.append({
                        "date": idx.strftime("%Y-%m-%d"),
                        "close": round(float(row["Close"]), 2),
                        "volume": int(row.get("Volume", 0)),
                    })

            days_to_cover = round(short_ratio, 1) if short_ratio else None

            return {
                "symbol": symbol,
                "name": info.get("shortName", symbol),
                "shortPercentOfFloat": round(short_pct * 100, 2),
                "sharesShort": short_curr,
                "sharesShortPriorMonth": short_prev,
                "changeShares": change,
                "changePct": round(change_pct, 1),
                "shortRatio": short_ratio,
                "daysToCover": days_to_cover,
                "floatShares": float_shares,
                "priceHistory": price_history[-30:],
                "sentiment": "squeeze_risk" if short_pct > 0.2 else "high_short" if short_pct > 0.1 else "moderate" if short_pct > 0.05 else "low",
                "source": "yfinance",
            }
        except Exception as e:
            return {"symbol": symbol, "error": str(e)[:200]}

    return await _cached_fetch(f"short_{symbol}", _fetch, ttl=600)


# ── 13F Institutional Holdings ──
@router.get("/13f")
async def thirteen_f_data(symbol: str = "AAPL"):
    async def _fetch():
        try:
            import yfinance as yf

            def _get():
                ticker = yf.Ticker(symbol)
                holders = ticker.institutional_holders
                info = ticker.info or {}
                mutual = ticker.mutualfund_holders
                return holders, mutual, info

            holders, mutual, info = await asyncio.to_thread(_get)
            institutions = []
            if holders is not None and not holders.empty:
                for _, row in holders.head(15).iterrows():
                    institutions.append({
                        "holder": str(row.get("Holder", "")),
                        "shares": int(row.get("Shares", 0)),
                        "pctOut": round(float(row.get("% Out", 0)) * 100, 2),
                        "value": float(row.get("Value", 0)),
                        "dateReported": str(row.get("Date Reported", "")),
                        "type": "institution",
                    })

            funds = []
            if mutual is not None and not mutual.empty:
                for _, row in mutual.head(10).iterrows():
                    funds.append({
                        "holder": str(row.get("Holder", "")),
                        "shares": int(row.get("Shares", 0)),
                        "pctOut": round(float(row.get("% Out", 0)) * 100, 2),
                        "value": float(row.get("Value", 0)),
                        "dateReported": str(row.get("Date Reported", "")),
                        "type": "mutual_fund",
                    })

            total_inst_shares = sum(i["shares"] for i in institutions)
            total_inst_value = sum(i["value"] for i in institutions)

            return {
                "symbol": symbol,
                "name": info.get("shortName", symbol),
                "institutions": institutions,
                "mutualFunds": funds,
                "summary": {
                    "totalInstitutions": len(institutions),
                    "totalSharesHeld": total_inst_shares,
                    "totalValueHeld": round(total_inst_value, 0),
                    "topHolder": institutions[0]["holder"] if institutions else None,
                    "topHolderPct": institutions[0]["pctOut"] if institutions else 0,
                },
                "source": "yfinance",
            }
        except Exception as e:
            return {"symbol": symbol, "institutions": [], "mutualFunds": [], "error": str(e)[:200]}

    return await _cached_fetch(f"13f_{symbol}", _fetch, ttl=3600)


# ── Crypto Funding Rates ──
@router.get("/funding-rates")
async def funding_rates():
    async def _fetch():
        try:
            import ccxt
            exchanges_to_try = ["binance", "bybit", "okx"]
            results = []

            symbols = ["BTC/USDT:USDT", "ETH/USDT:USDT", "SOL/USDT:USDT", "DOGE/USDT:USDT", "XRP/USDT:USDT",
                        "BNB/USDT:USDT", "ADA/USDT:USDT", "AVAX/USDT:USDT", "LINK/USDT:USDT", "DOT/USDT:USDT"]

            for ex_name in exchanges_to_try:
                try:
                    exchange_class = getattr(ccxt, ex_name)
                    exchange = exchange_class({"enableRateLimit": True})
                    await asyncio.to_thread(lambda: exchange.load_markets())
                    funding_data = []
                    for sym in symbols:
                        try:
                            info = await asyncio.to_thread(lambda s=sym: exchange.fetch_funding_rate(s))
                            if info and info.get("fundingRate") is not None:
                                funding_data.append({
                                    "symbol": sym.replace(":USDT", ""),
                                    "fundingRate": round(info["fundingRate"] * 100, 4),
                                    "annualized": round(info["fundingRate"] * 365 * 100, 2),
                                    "nextFundingTime": info.get("fundingTimestamp"),
                                    "markPrice": info.get("markPrice"),
                                    "indexPrice": info.get("indexPrice"),
                                })
                        except Exception:
                            logger.debug("Failed to fetch funding rate for %s", sym)
                            continue
                    if funding_data:
                        results.append({
                            "exchange": ex_name,
                            "fundingRates": sorted(funding_data, key=lambda x: abs(x["fundingRate"]), reverse=True),
                        })
                        break
                except Exception as e:
                    logger.warning("Failed to fetch funding rates from %s: %s", ex_name, e)
                    continue

            if not results:
                return {"exchanges": [], "note": "Could not fetch funding rates. Ensure ccxt is installed and exchanges are reachable."}
            return {"exchanges": results, "timestamp": datetime.now(timezone.utc).isoformat()}
        except ImportError:
            return {"exchanges": [], "note": "ccxt not installed. Run: pip install ccxt"}
        except Exception as e:
            return {"exchanges": [], "error": str(e)[:200]}

    return await _cached_fetch("funding_rates", _fetch, ttl=120)


# ── Stablecoin Depeg Monitor ──
@router.get("/stablecoin-depeg")
async def stablecoin_depeg():
    STABLECOINS = [
        {"symbol": "USDT", "peg": 1.0, "name": "Tether"},
        {"symbol": "USDC", "peg": 1.0, "name": "USD Coin"},
        {"symbol": "BUSD", "peg": 1.0, "name": "Binance USD"},
        {"symbol": "DAI", "peg": 1.0, "name": "Dai"},
        {"symbol": "TUSD", "peg": 1.0, "name": "TrueUSD"},
        {"symbol": "FDUSD", "peg": 1.0, "name": "First Digital USD"},
        {"symbol": "PYUSD", "peg": 1.0, "name": "PayPal USD"},
    ]

    async def _fetch():
        try:
            import ccxt
            exchange = ccxt.binance({"enableRateLimit": True})
            await asyncio.to_thread(lambda: exchange.load_markets())

            results = []
            for coin in STABLECOINS:
                try:
                    pair = f"{coin['symbol']}/USDT"
                    ticker = await asyncio.to_thread(lambda p=pair: exchange.fetch_ticker(p))
                    price = ticker.get("last", 1.0)
                    high_24h = ticker.get("high", price)
                    low_24h = ticker.get("low", price)
                    volume = ticker.get("quoteVolume", 0)

                    depeg = abs(price - coin["peg"])
                    depeg_pct = depeg / coin["peg"] * 100

                    if depeg_pct > 5:
                        severity = "critical"
                    elif depeg_pct > 1:
                        severity = "warning"
                    elif depeg_pct > 0.1:
                        severity = "watch"
                    else:
                        severity = "normal"

                    results.append({
                        **coin,
                        "price": round(price, 6),
                        "depegAmount": round(depeg, 6),
                        "depegPct": round(depeg_pct, 4),
                        "high24h": round(high_24h, 6),
                        "low24h": round(low_24h, 6),
                        "volume24h": round(volume, 0),
                        "severity": severity,
                        "status": "live",
                    })
                except Exception:
                    logger.debug("Failed to fetch stablecoin data for %s", coin['symbol'])
                    results.append({
                        **coin,
                        "price": coin["peg"],
                        "depegAmount": 0,
                        "depegPct": 0,
                        "severity": "unknown",
                        "status": "unavailable",
                    })
            return {"stablecoins": results, "timestamp": datetime.now(timezone.utc).isoformat()}
        except ImportError:
            return {"stablecoins": [], "note": "ccxt not installed. Run: pip install ccxt"}
        except Exception as e:
            return {"stablecoins": [], "error": str(e)[:200]}

    return await _cached_fetch("stablecoin_depeg", _fetch, ttl=60)


# ── Crypto Dominance ──
@router.get("/crypto-dominance")
async def crypto_dominance():
    MAJOR_COINS = [
        {"symbol": "BTC", "name": "Bitcoin"},
        {"symbol": "ETH", "name": "Ethereum"},
        {"symbol": "USDT", "name": "Tether"},
        {"symbol": "BNB", "name": "BNB"},
        {"symbol": "SOL", "name": "Solana"},
        {"symbol": "XRP", "name": "XRP"},
        {"symbol": "USDC", "name": "USD Coin"},
        {"symbol": "ADA", "name": "Cardano"},
        {"symbol": "DOGE", "name": "Dogecoin"},
        {"symbol": "TRX", "name": "TRON"},
    ]

    async def _fetch():
        try:
            import ccxt
            exchange = ccxt.binance({"enableRateLimit": True})
            await asyncio.to_thread(lambda: exchange.load_markets())

            results = []
            total_market_cap = 0
            coin_data = []

            for coin in MAJOR_COINS:
                try:
                    pair = f"{coin['symbol']}/USDT"
                    ticker = await asyncio.to_thread(lambda p=pair: exchange.fetch_ticker(p))
                    price = ticker.get("last", 0)
                    volume = ticker.get("quoteVolume", 0)
                    change_pct = ticker.get("percentage", 0) or 0

                    if coin["symbol"] == "BTC":
                        btc_price = price
                    coin_data.append({
                        **coin,
                        "price": round(price, 2 if price > 1 else 6),
                        "volume24h": round(volume, 0),
                        "change24h": round(change_pct, 2),
                    })
                except Exception:
                    logger.debug("Failed to fetch ticker for %s", coin['symbol'])

            if not coin_data:
                return {"coins": [], "totalMarketCap": 0}

            btc_data = next((c for c in coin_data if c["symbol"] == "BTC"), None)
            if btc_data:
                btc_price = btc_data["price"]
                estimated_btc_mcap = btc_price * 19_700_000
                total_market_cap = estimated_btc_mcap / 0.55

                for coin in coin_data:
                    vol_ratio = coin["volume24h"] / btc_data["volume24h"] if btc_data["volume24h"] else 0
                    coin["dominanceEstimate"] = round(vol_ratio * 55, 2) if coin["symbol"] != "BTC" else 55.0
            else:
                for coin in coin_data:
                    coin["dominanceEstimate"] = 0

            return {
                "coins": sorted(coin_data, key=lambda x: x.get("dominanceEstimate", 0), reverse=True),
                "totalMarketCap": round(total_market_cap, 0),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "note": "Market dominance estimated from trading volume ratios",
            }
        except ImportError:
            return {"coins": [], "note": "ccxt not installed. Run: pip install ccxt"}
        except Exception as e:
            return {"coins": [], "error": str(e)[:200]}

    return await _cached_fetch("crypto_dominance", _fetch, ttl=120)


# ── Order Flow / Volume Profile ──
@router.get("/order-flow")
async def order_flow(symbol: str = "SPY", period: str = "1d"):
    async def _fetch():
        try:
            import yfinance as yf

            def _get():
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="5d", interval="1m")
                info = ticker.info or {}
                return hist, info

            hist, info = await asyncio.to_thread(_get)
            if hist is None or hist.empty:
                return {"symbol": symbol, "orderFlow": [], "volumeProfile": []}

            trades = []
            for idx, row in hist.iterrows():
                trades.append({
                    "time": idx.strftime("%H:%M"),
                    "price": round(float(row["Close"]), 2),
                    "volume": int(row.get("Volume", 0)),
                    "high": round(float(row["High"]), 2),
                    "low": round(float(row["Low"]), 2),
                    "delta": int(row.get("Volume", 0)) * (1 if row["Close"] >= row["Open"] else -1),
                })

            price_levels: dict[float, dict] = {}
            for t in trades:
                level = round(t["price"], 2)
                if level not in price_levels:
                    price_levels[level] = {"price": level, "bidVolume": 0, "askVolume": 0, "trades": 0}
                if t["delta"] > 0:
                    price_levels[level]["askVolume"] += t["volume"]
                else:
                    price_levels[level]["bidVolume"] += t["volume"]
                price_levels[level]["trades"] += 1

            volume_profile = sorted(price_levels.values(), key=lambda x: x["bidVolume"] + x["askVolume"], reverse=True)[:20]

            total_bid = sum(v["bidVolume"] for v in volume_profile)
            total_ask = sum(v["askVolume"] for v in volume_profile)

            return {
                "symbol": symbol,
                "recentTrades": trades[-100:],
                "volumeProfile": volume_profile,
                "summary": {
                    "totalBidVolume": total_bid,
                    "totalAskVolume": total_ask,
                    "bidAskRatio": round(total_bid / total_ask, 2) if total_ask else 0,
                    "vwap": round(sum(t["price"] * t["volume"] for t in trades) / sum(t["volume"] for t in trades), 2) if trades else 0,
                    "totalVolume": sum(t["volume"] for t in trades),
                },
                "source": "yfinance",
            }
        except Exception as e:
            return {"symbol": symbol, "error": str(e)[:200]}

    return await _cached_fetch(f"order_flow_{symbol}", _fetch, ttl=60)


# ── Commodities ──
@router.get("/commodities")
async def commodities_data():
    COMMODITIES = [
        {"symbol": "GC=F", "name": "Gold", "unit": "oz"},
        {"symbol": "SI=F", "name": "Silver", "unit": "oz"},
        {"symbol": "PL=F", "name": "Platinum", "unit": "oz"},
        {"symbol": "CL=F", "name": "Crude Oil WTI", "unit": "bbl"},
        {"symbol": "BZ=F", "name": "Brent Crude", "unit": "bbl"},
        {"symbol": "NG=F", "name": "Natural Gas", "unit": "MMBtu"},
        {"symbol": "HG=F", "name": "Copper", "unit": "lb"},
        {"symbol": "ZW=F", "name": "Wheat", "unit": "bu"},
        {"symbol": "ZC=F", "name": "Corn", "unit": "bu"},
        {"symbol": "ZS=F", "name": "Soybeans", "unit": "bu"},
    ]

    async def _fetch():
        try:
            import yfinance as yf

            results = []

            def _get(sym):
                ticker = yf.Ticker(sym)
                hist = ticker.history(period="5d")
                info = ticker.info or {}
                return sym, hist, info

            fetched = await asyncio.to_thread(lambda: [_get(c["symbol"]) for c in COMMODITIES])
            for (sym, hist, info), comm in zip(fetched, COMMODITIES):
                if hist is None or hist.empty:
                    results.append({**comm, "price": 0, "status": "unavailable"})
                    continue
                current = float(hist["Close"].iloc[-1])
                prev = float(hist["Close"].iloc[-2]) if len(hist) > 1 else current
                change = current - prev
                change_pct = (change / prev * 100) if prev else 0
                results.append({
                    **comm,
                    "price": round(current, 2),
                    "change": round(change, 2),
                    "changePct": round(change_pct, 2),
                    "high": round(float(hist["High"].iloc[-1]), 2),
                    "low": round(float(hist["Low"].iloc[-1]), 2),
                    "volume": int(hist["Volume"].iloc[-1]) if "Volume" in hist.columns else 0,
                    "status": "live",
                })
            return {"commodities": results, "timestamp": datetime.now(timezone.utc).isoformat()}
        except Exception as e:
            return {"commodities": [], "error": str(e)[:200]}

    return await _cached_fetch("commodities", _fetch, ttl=120)


# ── Options Greeks ──
@router.get("/greeks")
async def options_greeks(symbol: str = "AAPL"):
    async def _fetch():
        try:
            import yfinance as yf
            import math

            def _get():
                ticker = yf.Ticker(symbol)
                exps = ticker.options
                if not exps:
                    return symbol, exps, {}, ticker.info or {}
                chain = ticker.option_chain(exps[0])
                return exps, chain.calls, chain.puts, ticker.info or {}

            exps, calls_df, puts_df, info = await asyncio.to_thread(_get)
            if calls_df is None or calls_df.empty:
                return {"symbol": symbol, "options": [], "expirations": list(exps) if exps else []}

            S = float(info.get("currentPrice", info.get("regularMarketPrice", 100)))
            r = 0.05
            T = 30 / 365

            def _bs_delta(S, K, T, r, sigma, option_type="call"):
                if sigma <= 0 or T <= 0:
                    return 1.0 if option_type == "call" and S > K else 0.0
                d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
                from scipy.stats import norm
                return norm.cdf(d1) if option_type == "call" else norm.cdf(d1) - 1

            def _bs_gamma(S, K, T, r, sigma):
                if sigma <= 0 or T <= 0:
                    return 0
                d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
                from scipy.stats import norm
                return norm.pdf(d1) / (S * sigma * math.sqrt(T))

            def _bs_theta(S, K, T, r, sigma, option_type="call"):
                if sigma <= 0 or T <= 0:
                    return 0
                d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
                d2 = d1 - sigma * math.sqrt(T)
                from scipy.stats import norm
                term1 = -(S * norm.pdf(d1) * sigma) / (2 * math.sqrt(T))
                if option_type == "call":
                    term2 = -r * K * math.exp(-r * T) * norm.cdf(d2)
                else:
                    term2 = r * K * math.exp(-r * T) * norm.cdf(-d2)
                return (term1 + term2) / 365

            options = []
            for _, row in calls_df.head(20).iterrows():
                K = float(row.get("strike", 0))
                iv = float(row.get("impliedVolatility", 0.3))
                try:
                    delta = _bs_delta(S, K, T, r, iv, "call")
                    gamma = _bs_gamma(S, K, T, r, iv)
                    theta = _bs_theta(S, K, T, r, iv, "call")
                except Exception:
                    logger.debug("Failed to compute greeks for strike %s", K)
                    delta = gamma = theta = 0
                options.append({
                    "strike": K, "type": "call",
                    "bid": float(row.get("bid", 0)), "ask": float(row.get("ask", 0)),
                    "last": float(row.get("lastPrice", 0)),
                    "volume": int(row.get("volume", 0) or 0),
                    "openInterest": int(row.get("openInterest", 0) or 0),
                    "impliedVol": round(iv, 4),
                    "delta": round(delta, 4), "gamma": round(gamma, 4), "theta": round(theta, 4),
                    "inTheMoney": bool(row.get("inTheMoney", False)),
                })

            return {
                "symbol": symbol,
                "underlyingPrice": S,
                "expiration": exps[0] if exps else None,
                "expirations": list(exps) if exps else [],
                "options": options,
                "source": "yfinance (greeks calculated via Black-Scholes)",
            }
        except ImportError:
            return {"symbol": symbol, "options": [], "note": "scipy not installed. Run: pip install scipy"}
        except Exception as e:
            return {"symbol": symbol, "options": [], "error": str(e)[:200]}

    return await _cached_fetch(f"greeks_{symbol}", _fetch, ttl=300)


# ── Liquidation Map (Crypto) ──
@router.get("/liquidation-map")
async def liquidation_map(symbol: str = "BTC"):
    async def _fetch():
        try:
            import ccxt
            exchange = ccxt.binance({"enableRateLimit": True})
            await asyncio.to_thread(lambda: exchange.load_markets())

            ticker = await asyncio.to_thread(lambda: exchange.fetch_ticker(f"{symbol}/USDT:USDT"))
            current_price = ticker.get("last", 50000)

            orderbook = await asyncio.to_thread(lambda: exchange.fetch_order_book(f"{symbol}/USDT:USDT", limit=100))

            bid_liquidations = []
            for price, vol in orderbook.get("bids", [])[:50]:
                est_liquidation = vol * current_price * 0.8
                bid_liquidations.append({
                    "price": round(price, 2),
                    "estimatedLiquidations": round(est_liquidation, 0),
                    "side": "long",
                    "leverage": "10x",
                })

            ask_liquidations = []
            for price, vol in orderbook.get("asks", [])[:50]:
                est_liquidation = vol * current_price * 0.8
                ask_liquidations.append({
                    "price": round(price, 2),
                    "estimatedLiquidations": round(est_liquidation, 0),
                    "side": "short",
                    "leverage": "10x",
                })

            total_long_liq = sum(l["estimatedLiquidations"] for l in bid_liquidations)
            total_short_liq = sum(l["estimatedLiquidations"] for l in ask_liquidations)

            return {
                "symbol": f"{symbol}/USDT",
                "currentPrice": current_price,
                "longLiquidations": bid_liquidations,
                "shortLiquidations": ask_liquidations,
                "summary": {
                    "totalLongExposure": round(total_long_liq, 0),
                    "totalShortExposure": round(total_short_liq, 0),
                    "longShortRatio": round(total_long_liq / total_short_liq, 2) if total_short_liq else 0,
                    "nearestLongLevel": bid_liquidations[0]["price"] if bid_liquidations else None,
                    "nearestShortLevel": ask_liquidations[0]["price"] if ask_liquidations else None,
                },
                "note": "Liquidation estimates based on order book depth at 10x leverage",
                "source": "ccxt (order book)",
            }
        except ImportError:
            return {"symbol": symbol, "note": "ccxt not installed. Run: pip install ccxt"}
        except Exception as e:
            return {"symbol": symbol, "error": str(e)[:200]}

    return await _cached_fetch(f"liquidation_{symbol}", _fetch, ttl=60)


# ── Live Tape (Recent Trades) ──
@router.get("/live-tape")
async def live_tape(symbol: str = "SPY"):
    async def _fetch():
        try:
            import yfinance as yf

            def _get():
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="1d", interval="1m")
                info = ticker.info or {}
                return hist, info

            hist, info = await asyncio.to_thread(_get)
            if hist is None or hist.empty:
                return {"symbol": symbol, "trades": [], "note": "Market may be closed. Showing most recent available data."}

            trades = []
            for idx, row in hist.iterrows():
                vol = int(row.get("Volume", 0))
                if vol == 0:
                    continue
                trades.append({
                    "time": idx.strftime("%H:%M:%S"),
                    "price": round(float(row["Close"]), 2),
                    "volume": vol,
                    "side": "buy" if row["Close"] >= row["Open"] else "sell",
                    "value": round(float(row["Close"]) * vol, 2),
                    "vwap": round(float(row["Close"]), 2),
                })

            return {
                "symbol": symbol,
                "name": info.get("shortName", symbol),
                "trades": trades[-200:],
                "summary": {
                    "totalTrades": len(trades),
                    "totalVolume": sum(t["volume"] for t in trades),
                    "buyVolume": sum(t["volume"] for t in trades if t["side"] == "buy"),
                    "sellVolume": sum(t["volume"] for t in trades if t["side"] == "sell"),
                    "avgTradeSize": round(sum(t["volume"] for t in trades) / len(trades)) if trades else 0,
                    "largestTrade": max((t["volume"] for t in trades), default=0),
                },
                "source": "yfinance",
                "note": "1-minute aggregated trades from yfinance. For real-time tick data, use exchange WebSocket.",
            }
        except Exception as e:
            return {"symbol": symbol, "trades": [], "error": str(e)[:200]}

    return await _cached_fetch(f"live_tape_{symbol}", _fetch, ttl=60)
