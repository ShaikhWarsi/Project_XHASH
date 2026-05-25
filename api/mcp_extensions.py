from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional

try:
    from mcp import types
    from mcp.server import Server
    from mcp.server.models import InitializationOptions

    MCP_AVAILABLE = True
except ImportError:
    MCP_AVAILABLE = False

logger = logging.getLogger(__name__)


def _get_http_session():
    import requests
    s = requests.Session()
    s.headers.update({"User-Agent": "TradingEngine-MCP/1.0"})
    return s


if MCP_AVAILABLE:

    def create_agent_mcp_server(base_url: str = "http://localhost:8000", api_token: str = "") -> Server:
        server = Server("trading-engine-agent")
        session = _get_http_session()
        auth_headers = {"Authorization": f"Bearer {api_token}"} if api_token else {}

        @server.list_tools()
        async def list_tools() -> list[types.Tool]:
            return [
                types.Tool(
                    name="whoami",
                    description="Get current agent token identity and scopes",
                    inputSchema={"type": "object", "properties": {}},
                ),
                types.Tool(
                    name="list_markets",
                    description="List available markets",
                    inputSchema={"type": "object", "properties": {}},
                ),
                types.Tool(
                    name="search_symbols",
                    description="Search for tradable symbols",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "market": {"type": "string", "description": "Market name (crypto, stocks, forex)"},
                            "keyword": {"type": "string", "description": "Search keyword"},
                            "limit": {"type": "integer", "description": "Max results"},
                        },
                        "required": ["market"],
                    },
                ),
                types.Tool(
                    name="get_klines",
                    description="Get OHLCV kline data",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "market": {"type": "string"},
                            "symbol": {"type": "string"},
                            "timeframe": {"type": "string", "default": "1d"},
                            "limit": {"type": "integer", "default": 100},
                        },
                        "required": ["market", "symbol"],
                    },
                ),
                types.Tool(
                    name="get_price",
                    description="Get latest price for a symbol",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "market": {"type": "string"},
                            "symbol": {"type": "string"},
                        },
                        "required": ["market", "symbol"],
                    },
                ),
                types.Tool(
                    name="list_strategies",
                    description="List backtest strategies",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "limit": {"type": "integer", "default": 20},
                        },
                    },
                ),
                types.Tool(
                    name="list_jobs",
                    description="List agent jobs",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "kind": {"type": "string"},
                            "limit": {"type": "integer", "default": 50},
                        },
                    },
                ),
                types.Tool(
                    name="submit_backtest",
                    description="Submit an async backtest job",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "market": {"type": "string"},
                            "symbol": {"type": "string"},
                            "timeframe": {"type": "string", "default": "1d"},
                            "config": {"type": "object", "default": {}},
                        },
                        "required": ["market", "symbol"],
                    },
                ),
                types.Tool(
                    name="detect_regime",
                    description="Detect current market regime",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "symbol": {"type": "string", "default": "SPY"},
                            "market": {"type": "string", "default": "USStock"},
                            "timeframe": {"type": "string", "default": "1d"},
                        },
                    },
                ),
            ]

        @server.call_tool()
        async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
            headers = {**auth_headers, "Content-Type": "application/json"}

            try:
                if name == "whoami":
                    resp = session.get(f"{base_url}/api/agent/v1/whoami", headers=headers)
                    return [types.TextContent(type="text", text=resp.text)]

                elif name == "list_markets":
                    resp = session.get(f"{base_url}/api/agent/v1/markets", headers=headers)
                    return [types.TextContent(type="text", text=resp.text)]

                elif name == "search_symbols":
                    params = {"market": arguments.get("market", "crypto")}
                    if "keyword" in arguments:
                        params["keyword"] = arguments["keyword"]
                    if "limit" in arguments:
                        params["limit"] = arguments["limit"]
                    resp = session.get(f"{base_url}/api/agent/v1/markets/{params['market']}/symbols", headers=headers, params=params)
                    return [types.TextContent(type="text", text=resp.text)]

                elif name == "get_klines":
                    params = {
                        "market": arguments["market"],
                        "symbol": arguments["symbol"],
                        "timeframe": arguments.get("timeframe", "1d"),
                        "limit": arguments.get("limit", 100),
                    }
                    resp = session.get(f"{base_url}/api/agent/v1/klines", headers=headers, params=params)
                    return [types.TextContent(type="text", text=resp.text)]

                elif name == "get_price":
                    params = {"market": arguments["market"], "symbol": arguments["symbol"]}
                    resp = session.get(f"{base_url}/api/agent/v1/price", headers=headers, params=params)
                    return [types.TextContent(type="text", text=resp.text)]

                elif name == "list_strategies":
                    resp = session.get(f"{base_url}/api/agent/v1/strategies", headers=headers)
                    return [types.TextContent(type="text", text=resp.text)]

                elif name == "list_jobs":
                    params = {}
                    if "kind" in arguments:
                        params["kind"] = arguments["kind"]
                    if "limit" in arguments:
                        params["limit"] = arguments["limit"]
                    resp = session.get(f"{base_url}/api/agent/v1/jobs", headers=headers, params=params)
                    return [types.TextContent(type="text", text=resp.text)]

                elif name == "submit_backtest":
                    resp = session.post(
                        f"{base_url}/api/agent/v1/backtests",
                        headers=headers,
                        json={
                            "market": arguments["market"],
                            "symbol": arguments["symbol"],
                            "timeframe": arguments.get("timeframe", "1d"),
                            "config": arguments.get("config", {}),
                        },
                    )
                    return [types.TextContent(type="text", text=resp.text)]

                elif name == "detect_regime":
                    from signals.regime.market_regime import MarketRegimeService
                    import pandas as pd
                    from data.registry import ProviderRegistry
                    from core.enums import Timeframe
                    from datetime import datetime, timedelta

                    symbol = arguments.get("symbol", "SPY")
                    market = arguments.get("market", "USStock")
                    timeframe = arguments.get("timeframe", "1d")

                    provider = ProviderRegistry.get("yfinance")
                    tf = Timeframe(timeframe) if hasattr(Timeframe, timeframe) else Timeframe("1d")
                    bars = provider.fetch_bars(symbol=symbol, timeframe=tf, start=datetime.utcnow() - timedelta(days=180), end=datetime.utcnow())

                    if bars is not None and not bars.empty:
                        service = MarketRegimeService()
                        result = service.detect(bars, symbol=symbol, market=market, timeframe=timeframe)
                        return [types.TextContent(type="text", text=json.dumps(result, default=str))]
                    return [types.TextContent(type="text", text=json.dumps({"error": "No data available"}))]

                else:
                    raise ValueError(f"Unknown tool: {name}")

            except Exception as e:
                logger.error("MCP tool %s failed: %s", name, e)
                return [types.TextContent(type="text", text=json.dumps({"error": str(e)}))]

        return server


def run_mcp_server(base_url: str = "http://localhost:8000", api_token: str = ""):
    if not MCP_AVAILABLE:
        logger.error("MCP package not installed. Install with: pip install mcp")
        return

    server = create_agent_mcp_server(base_url=base_url, api_token=api_token)

    import anyio
    from mcp.server.stdio import stdio_server

    async def main():
        async with stdio_server() as (read_stream, write_stream):
            await server.run(read_stream, write_stream, InitializationOptions(
                server_name="trading-engine-agent",
                server_version="0.1.0",
            ))

    anyio.run(main)
