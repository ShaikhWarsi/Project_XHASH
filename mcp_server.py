#!/usr/bin/env python3
"""Trading-Engine MCP Server — exposes 20+ finance tools to any MCP client.

Works with Claude Desktop, Cursor, OpenClaw, and any MCP-compatible client.

Usage:
    python mcp_server.py                    # stdio transport (default)
    python mcp_server.py --transport sse    # SSE transport for web clients
"""

from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

try:
    from fastmcp import FastMCP
except ImportError:
    FastMCP = None

mcp = None
if FastMCP is not None:
    mcp = FastMCP("Trading-Engine")


# ── Market Data Tools ────────────────────────────────────────────

def _get_data_provider(name: str = "yfinance"):
    from data.providers.yfinance import YFinanceDataSource
    return YFinanceDataSource()


if mcp is not None:
    @mcp.tool()
    def get_stock_price(symbol: str) -> str:
        """Get current stock price and basic info for a symbol."""
        provider = _get_data_provider()
        try:
            data = provider.fetch_ticker(symbol)
            return json.dumps(data, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})

    @mcp.tool()
    def get_historical_data(symbol: str, days: int = 30) -> str:
        """Get historical OHLCV data for a symbol."""
        provider = _get_data_provider()
        end = datetime.now()
        start = end - timedelta(days=days)
        from core.enums import Timeframe
        try:
            df = provider.fetch_bars(symbol, Timeframe.D1, start, end)
            return df.tail(100).to_json(orient="records", date_format="iso")
        except Exception as e:
            return json.dumps({"error": str(e)})

    @mcp.tool()
    def get_technical_indicators(symbol: str) -> str:
        """Compute key technical indicators for a symbol."""
        from core.enums import Timeframe
        provider = _get_data_provider()
        end = datetime.now()
        start = end - timedelta(days=365)
        try:
            df = provider.fetch_bars(symbol, Timeframe.D1, start, end)
            if df.empty:
                return json.dumps({"error": "No data"})
            close = df["close"].values
            import numpy as np
            rsi_period = 14
            delta_vals = np.diff(close)
            gains = np.maximum(delta_vals, 0)
            losses = np.maximum(-delta_vals, 0)
            avg_gain = np.mean(gains[-rsi_period:]) if len(gains) >= rsi_period else 0
            avg_loss = np.mean(losses[-rsi_period:]) if len(losses) >= rsi_period else 0
            rsi = 100 - (100 / (1 + avg_gain / max(avg_loss, 0.001))) if avg_loss > 0 else 100
            sma_20 = float(np.mean(close[-20:])) if len(close) >= 20 else None
            sma_50 = float(np.mean(close[-50:])) if len(close) >= 50 else None
            return json.dumps({
                "symbol": symbol,
                "last_close": float(close[-1]),
                "sma_20": sma_20,
                "sma_50": sma_50,
                "rsi_14": round(rsi, 2),
                "high_52w": float(np.max(close)),
                "low_52w": float(np.min(close)),
            }, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})

    @mcp.tool()
    def get_fundamentals(symbol: str) -> str:
        """Get fundamental data for a symbol."""
        from core.enums import Timeframe
        provider = _get_data_provider()
        try:
            data = provider.fetch_ticker(symbol)
            fundamentals = {k: v for k, v in data.items() if isinstance(v, (str, int, float, bool)) and not k.startswith("_")}
            return json.dumps(fundamentals, indent=2, default=str)
        except Exception as e:
            return json.dumps({"error": str(e)})

    @mcp.tool()
    def get_news(symbol: str, max_articles: int = 10) -> str:
        """Get recent news for a symbol."""
        try:
            import yfinance as yf
            ticker = yf.Ticker(symbol)
            news = ticker.news or []
            results = []
            for item in news[:max_articles]:
                results.append({
                    "title": item.get("title", ""),
                    "publisher": item.get("publisher", ""),
                    "link": item.get("link", ""),
                    "summary": item.get("summary", ""),
                })
            return json.dumps(results, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})

    @mcp.tool()
    def get_social_sentiment(symbol: str) -> str:
        """Get StockTwits and Reddit sentiment for a symbol."""
        from data.providers.stocktwits import StockTwitsDataSource
        from data.providers.reddit import RedditDataSource
        st = StockTwitsDataSource()
        rd = RedditDataSource()
        st_sentiment = st.sentiment_summary(symbol)
        rd_sentiment = rd.sentiment_summary(symbol)
        total_bullish = st_sentiment.get("bullish", 0) + rd_sentiment.get("total_posts", 0) * 0.5
        total = st_sentiment.get("total", 0) + rd_sentiment.get("total_posts", 0)
        return json.dumps({
            "stocktwits": st_sentiment,
            "reddit": rd_sentiment,
            "combined": {"total": total, "bullish_score": round(total_bullish / max(total, 1), 2)},
        }, indent=2)

    @mcp.tool()
    def get_insider_transactions(symbol: str) -> str:
        """Get recent insider transactions for a symbol."""
        from data.providers.insider_transactions import InsiderTransactionsDataSource
        insider = InsiderTransactionsDataSource()
        txns = insider.fetch_transactions(symbol)
        summary = insider.summary(symbol)
        return json.dumps({"summary": summary, "transactions": txns[:20]}, indent=2)

    @mcp.tool()
    def run_backtest(strategy: str, tickers: str, start_date: str = "", end_date: str = "", initial_capital: float = 100000.0) -> str:
        """Run a backtest with a given strategy (sma_cross or momentum) on tickers (comma-separated)."""
        try:
            from scripts.run import run_backtest as _run
            ticker_list = [t.strip() for t in tickers.split(",")]
            if not start_date:
                start_date = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
            if not end_date:
                end_date = datetime.now().strftime("%Y-%m-%d")
            import pandas as pd
            from backtesting.engine import BacktestEngine, BacktestResult
            from data.providers.yfinance import YFinanceDataSource
            provider = YFinanceDataSource()
            from core.enums import Timeframe
            all_data = {}
            for t in ticker_list:
                df = provider.fetch_bars(t, Timeframe.D1, datetime.fromisoformat(start_date), datetime.fromisoformat(end_date))
                if not df.empty:
                    all_data[t] = df
            engine = BacktestEngine(initial_capital=initial_capital)
            if strategy == "sma_cross":
                def strat(data):
                    signals = {}
                    for t, df in data.items():
                        df["sma_20"] = df["close"].rolling(20).mean()
                        df["sma_50"] = df["close"].rolling(50).mean()
                        signals[t] = "buy" if df["sma_20"].iloc[-1] > df["sma_50"].iloc[-1] and df["sma_20"].iloc[-2] <= df["sma_50"].iloc[-2] else ("sell" if df["sma_20"].iloc[-1] < df["sma_50"].iloc[-1] and df["sma_20"].iloc[-2] >= df["sma_50"].iloc[-2] else "hold")
                    return signals
            else:
                def strat(data):
                    signals = {}
                    for t, df in data.items():
                        ret = df["close"].pct_change(20).iloc[-1] if len(df) > 20 else 0
                        signals[t] = "buy" if ret > 0.05 else ("sell" if ret < -0.05 else "hold")
                    return signals
            result = engine.run(all_data, strat)
            return json.dumps({
                "total_return": f"{result.total_return:.2%}",
                "sharpe": round(result.sharpe, 2),
                "max_drawdown": f"{result.max_drawdown:.2%}",
                "total_trades": result.total_trades,
                "win_rate": f"{result.win_rate:.2%}",
            }, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})

    @mcp.tool()
    def analyze_signal(symbol: str) -> str:
        """Run all signal engines on a symbol and return combined analysis."""
        from core.enums import SignalType, Timeframe
        from signals.engine_registry import create_engine, list_engines
        from data.providers.yfinance import YFinanceDataSource
        provider = YFinanceDataSource()
        end = datetime.now()
        start = end - timedelta(days=180)
        try:
            df = provider.fetch_bars(symbol, Timeframe.D1, start, end)
            if df.empty:
                return json.dumps({"error": "No data"})
            signals = []
            engine_names = list_engines()
            for name in ["sma_cross", "rsi", "macd"]:
                engine = create_engine(name, symbol=symbol)
                if engine:
                    try:
                        sigs = engine.compute(df)
                        signals.append({"engine": name, "count": len(sigs) if hasattr(sigs, '__len__') else 1})
                    except Exception:
                        pass
            return json.dumps({
                "symbol": symbol,
                "data_points": len(df),
                "last_close": float(df["close"].iloc[-1]),
                "signal_engines_available": len(engine_names),
                "signal_engines_run": len(signals),
            }, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})

    @mcp.tool()
    def get_portfolio_optimizer(returns_json: str, method: str = "mean_variance") -> str:
        """Run portfolio optimization. returns_json is a JSON string of {symbol: [returns]}."""
        import numpy as np
        import pandas as pd
        data = json.loads(returns_json)
        df = pd.DataFrame(data)
        if method == "mean_variance":
            from analytics.optimizers import MeanVarianceOptimizer
            opt = MeanVarianceOptimizer()
        elif method == "risk_parity":
            from analytics.optimizers import RiskParityOptimizer
            opt = RiskParityOptimizer()
        elif method == "equal_vol":
            from analytics.optimizers import EqualVolatilityOptimizer
            opt = EqualVolatilityOptimizer()
        elif method == "max_div":
            from analytics.optimizers import MaxDiversificationOptimizer
            opt = MaxDiversificationOptimizer()
        else:
            return json.dumps({"error": f"Unknown method: {method}"})
        result = opt.optimize(df)
        return json.dumps(result, indent=2)

    @mcp.tool()
    def get_alpha_zoo_list() -> str:
        """List all available alpha factors in the Alpha Zoo."""
        from signals.alpha_zoo import Registry as AlphaRegistry
        registry = AlphaRegistry()
        alphas = registry.list()
        health = registry.health()
        return json.dumps({"total": len(alphas), "health": health, "alphas": alphas[:50]}, indent=2)

    @mcp.tool()
    def get_alpha_zoo_info(alpha_id: str) -> str:
        """Get info about a specific alpha factor."""
        from signals.alpha_zoo import Registry as AlphaRegistry
        registry = AlphaRegistry()
        try:
            alpha = registry.get(alpha_id)
            return json.dumps({"id": alpha.id, "zoo": alpha.zoo, "module_path": alpha.module_path, "meta": alpha.meta}, indent=2)
        except KeyError:
            return json.dumps({"error": f"Alpha {alpha_id} not found"})

    @mcp.tool()
    def get_market_regime(symbol: str) -> str:
        """Detect current market regime for a symbol."""
        from core.enums import Timeframe
        provider = _get_data_provider()
        end = datetime.now()
        start = end - timedelta(days=90)
        try:
            df = provider.fetch_bars(symbol, Timeframe.D1, start, end)
            if df.empty or len(df) < 20:
                return json.dumps({"error": "Insufficient data"})
            close = df["close"].values
            returns = (close[-1] / close[0]) - 1
            vol = float(np.std(close[-20:] / close[-21:-1] - 1)) * np.sqrt(252)
            sma_20 = float(np.mean(close[-20:]))
            sma_50 = float(np.mean(close[-50:])) if len(close) >= 50 else sma_20
            trend = "bullish" if sma_20 > sma_50 else "bearish" if sma_20 < sma_50 else "neutral"
            vol_regime = "high" if vol > 0.3 else "low" if vol < 0.15 else "normal"
            return json.dumps({
                "symbol": symbol,
                "trend": trend,
                "volatility_regime": vol_regime,
                "annualized_volatility": round(vol, 4),
                "return_90d": f"{returns:.2%}",
                "last_close": float(close[-1]),
            }, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})

    @mcp.tool()
    def analyze_trade_journal(filepath: str) -> str:
        """Analyze a broker CSV/Excel trade journal file."""
        from data.trade_journal import parse_journal_file, TradeJournalAnalyzer
        df = parse_journal_file(filepath)
        if df is None or df.empty:
            return json.dumps({"error": "Could not parse file or empty"})
        analyzer = TradeJournalAnalyzer(df)
        profile = analyzer.profile()
        biases = analyzer.bias_diagnostics()
        return json.dumps({"profile": profile, "bias_diagnostics": biases}, indent=2)


def main():
    if FastMCP is None:
        print("Error: fastmcp not installed. Run: pip install fastmcp")
        sys.exit(1)
    transport = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] == "--transport" else "stdio"
    if transport == "sse":
        mcp.run(transport="sse")
    else:
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
