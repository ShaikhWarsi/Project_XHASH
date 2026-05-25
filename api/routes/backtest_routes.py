from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from persistence import get_session
from persistence.repositories import BacktestRepository

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/backtest", tags=["backtest"])


@router.get("/engines")
async def list_backtest_engines():
    from backtesting.engine_factory import list_engines
    return {
        "market_engines": list_engines(),
        "signal_engines": _list_signal_engines(),
    }


def _list_signal_engines() -> dict:
    from signals.engine_registry import ENGINE_REGISTRY, ENGINE_CATEGORIES
    return {
        "categories": {k: v for k, v in ENGINE_CATEGORIES.items()},
        "engines": {k: v.__name__ for k, v in ENGINE_REGISTRY.items()},
    }


@router.post("/run")
async def run_backtest(config: dict, session: AsyncSession = Depends(get_session)):
    tickers = config.get("tickers", ["AAPL"])
    start = config.get("start", "2024-01-01")
    end = config.get("end", "2024-12-31")
    capital = config.get("capital", 100_000.0)
    strategy = config.get("strategy", "sma_cross")
    agents = config.get("agents", [])

    try:
        from datetime import datetime as dt

        import numpy as np
        import pandas as pd

        from backtesting.engine import BacktestEngine
        from backtesting.engine_factory import get_engine_params, list_engines
        from core.enums import OrderSide, OrderType, Timeframe
        from core.types import Order, PortfolioState
        from data.providers.yfinance import YFinanceDataSource

        engine_type = config.get("engine_type", "default")
        overrides = {}
        if "leverage" in config:
            overrides["leverage"] = config["leverage"]
        engine_params = get_engine_params(engine_type, overrides)

        source = YFinanceDataSource()
        data = {}

        def _fetch_data():
            result = {}
            for ticker in tickers:
                df = source.fetch_bars(ticker, Timeframe.D1, dt.strptime(start, "%Y-%m-%d"), dt.strptime(end, "%Y-%m-%d"))
                if df is not None and len(df) > 0:
                    result[ticker] = df
            return result

        data = await asyncio.to_thread(_fetch_data)

        if not data:
            raise HTTPException(status_code=400, detail="No data fetched for the given tickers and date range")

        def sma_cross_strategy(bars, portfolio):
            orders = []
            for symbol, df in bars.items():
                if len(df) < 50:
                    continue
                close = df["close"]
                sma_20 = close.tail(20).mean()
                sma_50 = close.tail(50).mean()
                last_close = close.iloc[-1]
                pos = portfolio.positions.get(symbol)
                if last_close > sma_20 and sma_20 > sma_50 and (pos is None or pos.quantity == 0):
                    orders.append(Order(symbol=symbol, side=OrderSide.BUY, quantity=10, order_type=OrderType.MARKET, price=last_close))
                elif last_close < sma_20 and pos is not None and pos.quantity > 0:
                    orders.append(Order(symbol=symbol, side=OrderSide.SELL, quantity=pos.quantity, order_type=OrderType.MARKET, price=last_close))
            return orders

        def momentum_strategy(bars, portfolio):
            orders = []
            for symbol, df in bars.items():
                if len(df) < 20:
                    continue
                close = df["close"]
                returns = close.pct_change(5).iloc[-1] if len(close) > 5 else 0
                last_close = close.iloc[-1]
                pos = portfolio.positions.get(symbol)
                if returns > 0.02 and (pos is None or pos.quantity == 0):
                    orders.append(Order(symbol=symbol, side=OrderSide.BUY, quantity=10, order_type=OrderType.MARKET, price=last_close))
                elif returns < -0.02 and pos is not None and pos.quantity > 0:
                    orders.append(Order(symbol=symbol, side=OrderSide.SELL, quantity=pos.quantity, order_type=OrderType.MARKET, price=last_close))
            return orders

        def mean_reversion_strategy(bars, portfolio):
            orders = []
            for symbol, df in bars.items():
                if len(df) < 20:
                    continue
                close = df["close"]
                sma = close.tail(20).mean()
                std = close.tail(20).std()
                last_close = close.iloc[-1]
                pos = portfolio.positions.get(symbol)
                if last_close < sma - 1.5 * std and (pos is None or pos.quantity == 0):
                    orders.append(Order(symbol=symbol, side=OrderSide.BUY, quantity=10, order_type=OrderType.MARKET, price=last_close))
                elif last_close > sma + 1.5 * std and pos is not None and pos.quantity > 0:
                    orders.append(Order(symbol=symbol, side=OrderSide.SELL, quantity=pos.quantity, order_type=OrderType.MARKET, price=last_close))
            return orders

        def signal_engine_strategy(bars, portfolio):
            orders = []
            engine_name = config.get("signal_engine", "order_block")
            engine_cls = ENGINE_REGISTRY.get(engine_name)
            if engine_cls is None:
                return orders
            for symbol, df in bars.items():
                if len(df) < 50:
                    continue
                try:
                    engine = engine_cls()
                    signals = engine.compute(df)
                    last_close = df["close"].iloc[-1]
                    pos = portfolio.positions.get(symbol)
                    for sig in signals:
                        if sig.direction.value > 0 and (pos is None or pos.quantity == 0):
                            orders.append(Order(symbol=symbol, side=OrderSide.BUY, quantity=10, order_type=OrderType.MARKET, price=last_close))
                        elif sig.direction.value < 0 and pos is not None and pos.quantity > 0:
                            orders.append(Order(symbol=symbol, side=OrderSide.SELL, quantity=pos.quantity, order_type=OrderType.MARKET, price=last_close))
                except Exception as e:
                    logger.warning("Failed to process signal for %s: %s", getattr(sig, 'symbol', '?'), e)
                    continue
            return orders

        from signals.engine_registry import ENGINE_REGISTRY
        strategies = {"sma_cross": sma_cross_strategy, "momentum": momentum_strategy, "mean_reversion": mean_reversion_strategy}
        strategies.update({name: signal_engine_strategy for name in ENGINE_REGISTRY})
        strategy_fn = strategies.get(strategy, sma_cross_strategy)

        def _run_engine():
            engine = BacktestEngine(
                initial_capital=capital,
                market_rules=engine_params,
                commission=engine_params["commission"],
                slippage=engine_params["slippage"],
            )
            return engine.run(strategy_fn, data)

        result = await asyncio.to_thread(_run_engine)

        from analytics.metrics import PerformanceMetrics
        metrics = PerformanceMetrics.compute(result.equity_curve)

        run_metrics = {
            "total_return": result.total_return,
            "annualized_return": result.annualized_return,
            "sharpe_ratio": result.sharpe_ratio,
            "sortino_ratio": result.sortino_ratio,
            "max_drawdown": result.max_drawdown,
            "win_rate": result.win_rate,
            "profit_factor": result.profit_factor,
            "total_trades": result.total_trades,
        }

        await BacktestRepository.save_run(session, config, run_metrics, result.equity_curve)

        return {
            "total_return": result.total_return,
            "annualized_return": result.annualized_return,
            "sharpe_ratio": result.sharpe_ratio,
            "sortino_ratio": result.sortino_ratio,
            "max_drawdown": result.max_drawdown,
            "win_rate": result.win_rate,
            "profit_factor": result.profit_factor,
            "total_trades": result.total_trades,
            "equity_curve": result.equity_curve,
            "timestamps": [str(t) for t in result.timestamps],
        }

    except HTTPException:
        raise
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Missing dependency: {e}")
    except Exception as e:
        logger.exception("Backtest failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_backtests(session: AsyncSession = Depends(get_session)):
    runs = await BacktestRepository.list_runs(session)
    return [
        {
            "id": r.id,
            "timestamp": r.timestamp.isoformat() if hasattr(r.timestamp, "isoformat") else str(r.timestamp),
            "metrics": r.metrics_json,
        }
        for r in runs
    ]


@router.get("/{backtest_id}")
async def get_backtest(backtest_id: int, session: AsyncSession = Depends(get_session)):
    run = await BacktestRepository.get_run(session, backtest_id)
    if not run:
        raise HTTPException(status_code=404, detail="Backtest not found")
    def _safe_json(val):
        if val is None:
            return {}
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return {}
    return {
        "id": run.id,
        "timestamp": run.timestamp.isoformat() if hasattr(run.timestamp, "isoformat") else str(run.timestamp),
        "config": _safe_json(run.config_json),
        "metrics": _safe_json(run.metrics_json),
        "equity_curve": _safe_json(run.equity_curve_json),
        "total_return": run.total_return,
        "sharpe_ratio": run.sharpe_ratio,
        "max_drawdown": run.max_drawdown,
    }
