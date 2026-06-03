from __future__ import annotations
import asyncio
import logging
import os

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from api.state import app_state
from api.services.motd_service import get_motd

DEV_MODE = os.getenv("DEV_MODE", "true").lower() in ("true", "1", "yes")

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["websocket"])

POPULAR_SYMBOLS = [
    "SPY","QQQ","DIA","IWM","AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA",
    "BTC-USD","ETH-USD","BRK-B","JPM","V","JNJ","WMT","PG","MA","UNH","HD",
    "DIS","NFLX","ADBE","CRM","INTC","AMD","IBM","CSCO","ORCL","QCOM","TXN",
    "AVGO","MU","ABNB","UBER","PYPL","SNAP","SQQQ","TQQQ","SOXL","LABU","XBI",
    "IYR","XLF","XLE","XLK","XLV","XLI","XLP","XLU","XLB","XLRE",
    "ARKK","PLTR","COIN","MSTR","HOOD","RBLX","UPST","AFRM","SOFI","DASH",
    "LULU","NKE","SBUX","MCD","BA","GE","CAT","F","GM","AAL","DAL","UAL",
    "CCL","NCLH","RCL","AMC","GME","BB","BBBY","GS","MS","C","BAC","WFC",
]

_price_cache: dict[str, float] = {}
_price_cache_lock = asyncio.Lock()
_cache_last_refresh = 0.0
_is_refreshing = False
_CACHE_TTL = 30.0
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
        df = await asyncio.to_thread(
            lambda: yf.download(" ".join(symbols), period="1d", group_by="ticker", progress=False)
        )
        if df.empty:
            return
        for sym in symbols:
            try:
                if isinstance(df.columns, pd.MultiIndex) and sym in df.columns.levels[0]:
                    price = float(df[sym]["Close"].iloc[-1])
                elif sym in df.columns:
                    price = float(df[sym].iloc[-1]) if hasattr(df[sym], "iloc") else float(df[sym])
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
    await manager.connect("prices", websocket)
    tracked = [s.upper().strip() for s in symbols.split(",") if s.strip()] or POPULAR_SYMBOLS
    try:
        _ws_max_iter = 1000000
        for _ in range(_ws_max_iter):
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=5.0)
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
        logger.warning("ws_prices hit max iterations")
    except WebSocketDisconnect:
        await manager.disconnect("prices", websocket)
    except Exception as e:
        logger.warning("ws_prices error: %s", e)
        await manager.disconnect("prices", websocket)


@router.websocket("/portfolio")
async def ws_portfolio(websocket: WebSocket):
    await manager.connect("portfolio", websocket)
    try:
        _ws_max_iter = 1000000
        for _ in range(_ws_max_iter):
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=5.0)
            except asyncio.TimeoutError:
                pass
            snapshot = await app_state.async_snapshot()
            await websocket.send_json({
                "type": "portfolio",
                "data": snapshot,
                "timestamp": time.time()
            })
        logger.warning("ws_portfolio hit max iterations")
    except WebSocketDisconnect:
        await manager.disconnect("portfolio", websocket)
    except Exception as e:
        logger.warning("ws_portfolio error: %s", e)
        await manager.disconnect("portfolio", websocket)


@router.websocket("/orders")
async def ws_orders(websocket: WebSocket):
    await manager.connect("orders", websocket)
    try:
        _ws_max_iter = 1000000
        for _ in range(_ws_max_iter):
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
            except asyncio.TimeoutError:
                pass
            orders = await app_state.async_get_open_orders() if app_state and hasattr(app_state, 'async_get_open_orders') else []
            await websocket.send_json({
                "type": "orders",
                "data": orders,
                "timestamp": time.time()
            })
        logger.warning("ws_orders hit max iterations")
    except WebSocketDisconnect:
        await manager.disconnect("orders", websocket)
    except Exception as e:
        logger.warning("ws_orders error: %s", e)
        await manager.disconnect("orders", websocket)


@router.websocket("/orderbook/{symbol}")
async def ws_orderbook(websocket: WebSocket, symbol: str):
    await manager.connect(f"orderbook:{symbol}", websocket)
    try:
        _ws_max_iter = 1000000
        for _ in range(_ws_max_iter):
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=0.5)
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
                for i in range(12):
                    bid_size = random.uniform(200, 5000)
                    ask_size = random.uniform(200, 5000)
                    bid_total += bid_size
                    ask_total += ask_size
                    bids.append([round(base_price - (i + 1) * spread, 2), round(bid_size, 1)])
                    asks.append([round(base_price + (i + 1) * spread, 2), round(ask_size, 1)])
                await websocket.send_json({
                    "type": "orderbook",
                    "data": {"symbol": symbol, "bids": bids, "asks": asks, "basePrice": base_price, "_simulated": True},
                    "timestamp": time.time()
                })
            else:
                await websocket.send_json({
                    "type": "orderbook",
                    "data": {"symbol": symbol, "bids": [], "asks": [], "basePrice": 0, "_simulated": False},
                    "timestamp": time.time()
                })
        logger.warning("ws_orderbook hit max iterations")
    except WebSocketDisconnect:
        await manager.disconnect(f"orderbook:{symbol}", websocket)
    except Exception as e:
        logger.warning("ws_orderbook error: %s", e)
        await manager.disconnect(f"orderbook:{symbol}", websocket)


@router.websocket("/trades/{symbol}")
async def ws_trades(websocket: WebSocket, symbol: str):
    await manager.connect(f"trades:{symbol}", websocket)
    try:
        _ws_max_iter = 1000000
        for _ in range(_ws_max_iter):
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=1.5)
            except asyncio.TimeoutError:
                pass
            if DEV_MODE:
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
                        "_simulated": True,
                    })
                await websocket.send_json({
                    "type": "trades",
                    "data": trades,
                    "timestamp": time.time()
                })
            else:
                await websocket.send_json({
                    "type": "trades",
                    "data": [],
                    "timestamp": time.time(),
                    "_simulated": False,
                })
        logger.warning("ws_trades hit max iterations")
    except WebSocketDisconnect:
        await manager.disconnect(f"trades:{symbol}", websocket)
    except Exception as e:
        logger.warning("ws_trades error: %s", e)
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
                    except Exception as e:
                        logger.warning("ws_social_signals broadcast error: %s", e)
        logger.warning("ws_social_signals hit max iterations")
    except (WebSocketDisconnect, asyncio.TimeoutError):
        await manager.disconnect("signals", websocket)
    except Exception as e:
        logger.warning("ws_social_signals error: %s", e)
        await manager.disconnect("signals", websocket)


@router.websocket("/motd")
async def ws_motd(websocket: WebSocket):
    await manager.connect("motd", websocket)
    try:
        _ws_max_iter = 1000000
        for _ in range(_ws_max_iter):
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
            except asyncio.TimeoutError:
                pass
            motd = get_motd()
            await websocket.send_json({
                "type": "motd",
                "data": motd,
                "timestamp": time.time(),
            })
        logger.warning("ws_motd hit max iterations")
    except WebSocketDisconnect:
        await manager.disconnect("motd", websocket)
    except Exception as e:
        logger.warning("ws_motd error: %s", e)
        await manager.disconnect("motd", websocket)


@router.websocket("/news")
async def ws_news(websocket: WebSocket):
    await manager.connect("news", websocket)
    try:
        _ws_max_iter = 1000000
        for _ in range(_ws_max_iter):
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
            except asyncio.TimeoutError:
                pass
            await manager.broadcast("news", {
                "type": "news",
                "data": {"items": []},
                "timestamp": time.time(),
            })
        logger.warning("ws_news hit max iterations")
    except WebSocketDisconnect:
        await manager.disconnect("news", websocket)
    except Exception as e:
        logger.warning("ws_news error: %s", e)
        await manager.disconnect("news", websocket)


@router.websocket("/calendar")
async def ws_calendar(websocket: WebSocket):
    await manager.connect("calendar", websocket)
    try:
        _ws_max_iter = 1000000
        for _ in range(_ws_max_iter):
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
            except asyncio.TimeoutError:
                pass
            await manager.broadcast("calendar", {
                "type": "calendar",
                "data": {},
                "timestamp": time.time(),
            })
        logger.warning("ws_calendar hit max iterations")
    except WebSocketDisconnect:
        await manager.disconnect("calendar", websocket)
    except Exception as e:
        logger.warning("ws_calendar error: %s", e)
        await manager.disconnect("calendar", websocket)
