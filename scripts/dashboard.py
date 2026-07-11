#!/usr/bin/env python3
"""Dashboard API server.

Usage:
    python scripts/dashboard.py --port 8000
"""

from __future__ import annotations

import argparse

import uvicorn

from api.app import create_app


def main():
    parser = argparse.ArgumentParser(description="Start the trading dashboard API server")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    parser.add_argument("--db", default="sqlite+aiosqlite:///trading_engine.db", help="Database URL")
    args = parser.parse_args()

    app = create_app()
    endpoints = [
        ("GET", "/health", "Health check"),
        ("GET", "/config", "App configuration"),
        ("GET", "/watchlist", "Watchlist items"),
        ("GET", "/signals/", "Full signal matrix"),
        ("GET", "/signals/latest", "Latest signals with composite scores"),
        ("GET", "/portfolio/", "Portfolio state + positions"),
        ("GET", "/portfolio/history", "Portfolio value history"),
        ("GET", "/metrics/", "Performance metrics"),
        ("GET", "/metrics/attribution", "Trade attribution"),
        ("GET", "/trades/", "Trade history"),
        ("GET", "/orders/", "Open orders"),
        ("POST", "/orders/", "Place new order"),
        ("GET", "/alerts/", "Active alerts"),
        ("GET", "/backtest/list", "List past backtests"),
        ("POST", "/backtest/run", "Run new backtest"),
        ("GET", "/backtest/{id}", "Backtest detail"),
        ("GET", "/stream/live", "SSE live stream"),
        ("GET", "/api/ai/briefing", "AI-powered market briefing"),
        ("GET", "/api/screener/", "Stock screener results"),
        ("GET", "/api/market/quotes", "Real-time market quotes"),
        ("GET", "/api/regime", "Market regime detection"),
    ]
    print(f"\n{'='*60}")
    print("  Trading Engine Dashboard API v0.4.0")
    print(f"  http://{args.host}:{args.port}")
    print(f"{'='*60}")
    print("\nEndpoints:")
    for method, path, desc in endpoints:
        print(f"  {method:<6} {path:<30} {desc}")
    print(f"\nDatabase: {args.db}")
    print(f"Docs:     http://{args.host}:{args.port}/docs\n")

    uvicorn.run(app, host=args.host, port=args.port, reload=args.reload)


if __name__ == "__main__":
    main()
