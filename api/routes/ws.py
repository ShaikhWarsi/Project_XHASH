from __future__ import annotations
import asyncio
import logging
import os
import time

import pandas as pd
import yfinance as yf
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from api.state import app_state
from api.services.motd_service import get_motd
from api.websocket_manager import manager

DEV_MODE = os.getenv("DEV_MODE", "true").lower() in ("true", "1", "yes")

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["websocket"])

from .market_data_constants import POPULAR_SYMBOLS as _POPULAR_SYMBOL_DICT
POPULAR_SYMBOLS = [s["symbol"] for s in _POPULAR_SYMBOL_DICT]

_price_cache: dict[str, float] = {}
_price_cache_lock = asyncio.Lock()
_cache_last_refresh = 0.0
_is_refreshing = False
_CACHE_TTL = float(os.environ.get("WS_PRICE_CACHE_TTL", "60.0"))
_price_history: dict[str, list[float]] = {}
_volume_cache: dict[str, int] = {}


async def _refresh_price_cache(symbols: list[str] | None = None):
    global _cache_last_refresh, _is_refreshing
    async with _price_cache_lock:
        now = time.time()
        if now - _cache_last_refresh < _CACHE_TTL or _is_refreshing:
            return
        _is_refreshing = True
    symbols = symbols or POPULAR_SYMBOLS
    prices = {}
    try:
        _CHUNK_SIZE = 30
        for i in range(0, len(symbols), _CHUNK_SIZE):
            chunk = symbols[i:i + _CHUNK_SIZE]
            df = await asyncio.to_thread(
                lambda s=chunk: yf.download(s, period="1d", group_by="ticker", progress=False)
            )
            if df.empty:
                continue
            for sym in chunk:
                try:
                    if isinstance(df.columns, pd.MultiIndex) and sym in df.columns.levels[0]:
                        price = float(df[sym]["Close"].iloc[-1])
                    elif sym in df.columns:
                        price_val = df[sym].iloc[-1] if hasattr(df[sym], "iloc") else float(df[sym])
                        price = float(price_val) if not isinstance(price_val, float) else price_val
                    else:
                        continue
                    prices[sym] = price
                except Exception:
                    pass
    except Exception as e:
        logger.warning("Batch price refresh failed: %s", e)
    finally:
        async with _price_cache_lock:
            if prices:
                _price_cache.update(prices)
            _cache_last_refresh = time.time()
            _is_refreshing = False


@router.websocket("/prices")
async def ws_prices(websocket: WebSocket, symbols: str = ""):
    mc = await manager.connect("prices", websocket)
    tracked = [s.upper().strip() for s in symbols.split(",") if s.strip()] or POPULAR_SYMBOLS
    try:
        while True:
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=5.0)
                if msg == '{"type":"pong"}': mc.last_pong = time.time(); continue
            except asyncio.TimeoutError:
                pass
            await _refresh_price_cache(tracked)
            async with _price_cache_lock:
                prices = dict(_price_cache)
            data = {}
            for sym in tracked:
                price = prices.get(sym)
                if price:
                    prev = _price_history.get(sym)
                    openPrice = prev[0] if prev and len(prev) > 0 else price
                    change = price - openPrice
                    change_pct = (change / openPrice * 100) if openPrice else 0.0
                    if sym not in _price_history:
                        _price_history[sym] = []
                    _price_history[sym].append(price)
                    if len(_price_history[sym]) > 20:
                        _price_history[sym].pop(0)
                    data[sym] = {
                        "price": price,
                        "change": round(change, 2),
                        "changePercent": round(change_pct, 2),
                        "volume": _volume_cache.get(sym, 0),
                        "marketCap": 0,
                    }
            if data:
                await websocket.send_json({
                    "type": "prices",
                    "data": data,
                    "timestamp": time.time()
                })
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning("ws_prices error: %s", e)
    finally:
        await manager.disconnect(mc)


@router.websocket("/portfolio")
async def ws_portfolio(websocket: WebSocket):
    mc = await manager.connect("portfolio", websocket)
    try:
        while True:
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=5.0)
                if msg == '{"type":"pong"}': mc.last_pong = time.time(); continue
            except asyncio.TimeoutError:
                pass
            snapshot = await app_state.async_snapshot()
            await websocket.send_json({
                "type": "portfolio",
                "data": snapshot,
                "timestamp": time.time()
            })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning("ws_portfolio error: %s", e)
    finally:
        await manager.disconnect(mc)


@router.websocket("/orders")
async def ws_orders(websocket: WebSocket):
    mc = await manager.connect("orders", websocket)
    try:
        while True:
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                if msg == '{"type":"pong"}': mc.last_pong = time.time(); continue
            except asyncio.TimeoutError:
                pass
            orders = await app_state.async_get_open_orders() if app_state and hasattr(app_state, 'async_get_open_orders') else []
            await websocket.send_json({
                "type": "orders",
                "data": orders,
                "timestamp": time.time()
            })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning("ws_orders error: %s", e)
    finally:
        await manager.disconnect(mc)


@router.websocket("/orderbook/{symbol}")
async def ws_orderbook(websocket: WebSocket, symbol: str):
    mc = await manager.connect(f"orderbook:{symbol}", websocket)
    try:
        while True:
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.5)
                if msg == '{"type":"pong"}': mc.last_pong = time.time(); continue
            except asyncio.TimeoutError:
                pass
            if DEV_MODE:
                await _refresh_price_cache()
                async with _price_cache_lock:
                    base_price = _price_cache.get(symbol.upper(), 100)
                spread = round(base_price * 0.0005, 2) or 0.01
                bids = []
                asks = []
                bid_total = 0
                ask_total = 0
                level_size = max(200, int(base_price * 0.8))
                for i in range(12):
                    decay = 1.0 - (i * 0.06)
                    bid_size = level_size * max(0.2, decay)
                    ask_size = level_size * max(0.2, decay)
                    bid_total += bid_size
                    ask_total += ask_size
                    bids.append([round(base_price - (i + 1) * spread, 2), round(bid_size, 1)])
                    asks.append([round(base_price + (i + 1) * spread, 2), round(ask_size, 1)])
                await websocket.send_json({
                    "type": "orderbook",
                    "data": {"symbol": symbol, "bids": bids, "asks": asks, "basePrice": base_price, "_source": "simulated"},
                    "timestamp": time.time()
                })
            else:
                await websocket.send_json({
                    "type": "orderbook",
                    "data": {"symbol": symbol, "bids": [], "asks": [], "basePrice": 0, "_source": "production"},
                    "timestamp": time.time()
                })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning("ws_orderbook error: %s", e)
    finally:
        await manager.disconnect(mc)


@router.websocket("/trades/{symbol}")
async def ws_trades(websocket: WebSocket, symbol: str):
    mc = await manager.connect(f"trades:{symbol}", websocket)
    try:
        while True:
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=1.5)
                if msg == '{"type":"pong"}': mc.last_pong = time.time(); continue
            except asyncio.TimeoutError:
                pass
            if DEV_MODE:
                await _refresh_price_cache()
                async with _price_cache_lock:
                    base_price = _price_cache.get(symbol.upper(), 100)
                trade = {
                    "price": round(base_price, 2),
                    "size": round(base_price * 0.5, 1),
                    "time": time.strftime("%H:%M:%S"),
                    "side": "buy" if time.time() % 2 < 1 else "sell",
                    "_source": "simulated",
                }
                await websocket.send_json({
                    "type": "trades",
                    "data": [trade],
                    "timestamp": time.time()
                })
            else:
                await websocket.send_json({
                    "type": "trades",
                    "data": [],
                    "timestamp": time.time(),
                    "_source": "production",
                })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning("ws_trades error: %s", e)
    finally:
        await manager.disconnect(mc)


@router.websocket("/signals")
async def ws_social_signals(websocket: WebSocket):
    mc = await manager.connect("signals", websocket)
    try:
        while True:
            data = await asyncio.wait_for(websocket.receive_json(), timeout=60)
            if data.get("type") == "signal":
                broadcast = {
                    "type": "signal",
                    "data": data.get("data", {}),
                }
                for conn in manager.get_connections("signals"):
                    try:
                        await conn.ws.send_json(broadcast)
                    except Exception as e:
                        logger.warning("ws_social_signals broadcast error: %s", e)

    except (WebSocketDisconnect, asyncio.TimeoutError):
        pass
    except Exception as e:
        logger.warning("ws_social_signals error: %s", e)
    finally:
        await manager.disconnect(mc)


@router.websocket("/motd")
async def ws_motd(websocket: WebSocket):
    mc = await manager.connect("motd", websocket)
    try:
        while True:
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                if msg == '{"type":"pong"}': mc.last_pong = time.time(); continue
            except asyncio.TimeoutError:
                pass
            motd = get_motd()
            await websocket.send_json({
                "type": "motd",
                "data": motd,
                "timestamp": time.time(),
            })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning("ws_motd error: %s", e)
    finally:
        await manager.disconnect(mc)


@router.websocket("/news")
async def ws_news(websocket: WebSocket):
    mc = await manager.connect("news", websocket)
    try:
        while True:
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
                if msg == '{"type":"pong"}': mc.last_pong = time.time(); continue
            except asyncio.TimeoutError:
                pass
            await manager.broadcast("news", {
                "type": "news",
                "data": {"items": []},
                "timestamp": time.time(),
            })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning("ws_news error: %s", e)
    finally:
        await manager.disconnect(mc)


@router.websocket("/calendar")
async def ws_calendar(websocket: WebSocket):
    mc = await manager.connect("calendar", websocket)
    try:
        while True:
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
                if msg == '{"type":"pong"}': mc.last_pong = time.time(); continue
            except asyncio.TimeoutError:
                pass
            await manager.broadcast("calendar", {
                "type": "calendar",
                "data": {},
                "timestamp": time.time(),
            })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning("ws_calendar error: %s", e)
    finally:
        await manager.disconnect(mc)
