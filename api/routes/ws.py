from __future__ import annotations
import asyncio
import json
import time
import random
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from api.websocket_manager import manager
from api.state import app_state
from data.providers.yfinance import YFinanceDataSource
from core.types import PortfolioState

router = APIRouter(prefix="/ws", tags=["websocket"])

_yf = YFinanceDataSource()

POPULAR_SYMBOLS = ["SPY","QQQ","DIA","IWM","AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA","BTC-USD","ETH-USD"]

_price_cache: dict[str, float] = {}
_price_cache_lock = asyncio.Lock()


async def _refresh_price_cache():
    prices = {}
    for sym in POPULAR_SYMBOLS:
        try:
            ticker = await asyncio.to_thread(_yf.fetch_ticker, sym)
            if ticker and ticker.get("price"):
                prices[sym] = ticker["price"]
        except Exception:
            pass
    async with _price_cache_lock:
        _price_cache.update(prices)


@router.websocket("/prices")
async def ws_prices(websocket: WebSocket):
    await manager.connect("prices", websocket)
    try:
        _ws_max_iter = 1000000
        for _ in range(_ws_max_iter):
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
            except asyncio.TimeoutError:
                pass
            await _refresh_price_cache()
            async with _price_cache_lock:
                prices = dict(_price_cache)
            data = {}
            for sym in POPULAR_SYMBOLS:
                price = prices.get(sym)
                if price:
                    data[sym] = {"price": price}
            if data:
                await websocket.send_json({
                    "type": "prices",
                    "data": data,
                    "timestamp": time.time()
                })
            await asyncio.sleep(2)
        logger.warning("ws_prices hit max iterations")
    except WebSocketDisconnect:
        await manager.disconnect("prices", websocket)
    except Exception:
        await manager.disconnect("prices", websocket)


@router.websocket("/portfolio")
async def ws_portfolio(websocket: WebSocket):
    await manager.connect("portfolio", websocket)
    try:
        _ws_max_iter = 1000000
        for _ in range(_ws_max_iter):
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
            except asyncio.TimeoutError:
                pass
            snapshot = await app_state.async_snapshot()
            await websocket.send_json({
                "type": "portfolio",
                "data": snapshot,
                "timestamp": time.time()
            })
            await asyncio.sleep(5)
        logger.warning("ws_portfolio hit max iterations")
    except WebSocketDisconnect:
        await manager.disconnect("portfolio", websocket)
    except Exception:
        await manager.disconnect("portfolio", websocket)


@router.websocket("/orders")
async def ws_orders(websocket: WebSocket):
    await manager.connect("orders", websocket)
    try:
        _ws_max_iter = 1000000
        for _ in range(_ws_max_iter):
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
            except asyncio.TimeoutError:
                pass
            orders = await app_state.async_get_open_orders() if hasattr(app_state, 'async_get_open_orders') else []
            await websocket.send_json({
                "type": "orders",
                "data": orders,
                "timestamp": time.time()
            })
            await asyncio.sleep(1)
        logger.warning("ws_orders hit max iterations")
    except WebSocketDisconnect:
        await manager.disconnect("orders", websocket)
    except Exception:
        await manager.disconnect("orders", websocket)


@router.websocket("/orderbook/{symbol}")
async def ws_orderbook(websocket: WebSocket, symbol: str):
    await manager.connect(f"orderbook:{symbol}", websocket)
    try:
        _ws_max_iter = 1000000
        for _ in range(_ws_max_iter):
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
            except asyncio.TimeoutError:
                pass
            await _refresh_price_cache()
            async with _price_cache_lock:
                base_price = _price_cache.get(symbol.upper(), 100)
            spread = round(base_price * 0.0005, 2) or 0.01
            bids = []
            asks = []
            bid_total = 0
            ask_total = 0
            for i in range(12):
                bid_size = random.uniform(200, 5000)
                ask_size = random.uniform(200, 5000)
                bid_total += bid_size
                ask_total += ask_size
                bids.append([round(base_price - (i + 1) * spread, 2), round(bid_size, 1)])
                asks.append([round(base_price + (i + 1) * spread, 2), round(ask_size, 1)])
            await websocket.send_json({
                "type": "orderbook",
                "data": {"symbol": symbol, "bids": bids, "asks": asks, "basePrice": base_price},
                "timestamp": time.time()
            })
            await asyncio.sleep(0.5)
        logger.warning("ws_orderbook hit max iterations")
    except WebSocketDisconnect:
        await manager.disconnect(f"orderbook:{symbol}", websocket)
    except Exception:
        await manager.disconnect(f"orderbook:{symbol}", websocket)


@router.websocket("/trades/{symbol}")
async def ws_trades(websocket: WebSocket, symbol: str):
    await manager.connect(f"trades:{symbol}", websocket)
    try:
        _ws_max_iter = 1000000
        for _ in range(_ws_max_iter):
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
            except asyncio.TimeoutError:
                pass
            await _refresh_price_cache()
            async with _price_cache_lock:
                base_price = _price_cache.get(symbol.upper(), 100)
            trade_count = random.randint(1, 5)
            trades = []
            for _ in range(trade_count):
                side = random.choice(["buy", "sell"])
                offset = base_price * random.uniform(-0.002, 0.002)
                trades.append({
                    "price": round(base_price + offset, 2),
                    "size": round(random.uniform(100, 2000), 1),
                    "time": time.strftime("%H:%M:%S"),
                    "side": side,
                })
            await websocket.send_json({
                "type": "trades",
                "data": trades,
                "timestamp": time.time()
            })
            await asyncio.sleep(random.uniform(0.3, 1.5))
        logger.warning("ws_trades hit max iterations")
    except WebSocketDisconnect:
        await manager.disconnect(f"trades:{symbol}", websocket)
    except Exception:
        await manager.disconnect(f"trades:{symbol}", websocket)


@router.websocket("/signals")
async def ws_social_signals(websocket: WebSocket):
    await manager.connect("signals", websocket)
    try:
        _ws_max_iter = 1000000
        for _ in range(_ws_max_iter):
            data = await asyncio.wait_for(websocket.receive_json(), timeout=60)
            if data.get("type") == "signal":
                broadcast = {
                    "type": "signal",
                    "data": data.get("data", {}),
                }
                for conn in manager.connections.get("signals", []):
                    try:
                        await conn.send_json(broadcast)
                    except Exception:
                        pass
        logger.warning("ws_social_signals hit max iterations")
    except (WebSocketDisconnect, asyncio.TimeoutError):
        await manager.disconnect("signals", websocket)
    except Exception:
        await manager.disconnect("signals", websocket)
