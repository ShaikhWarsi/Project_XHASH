from __future__ import annotations

import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/broker", tags=["broker"])

_broker_configs: dict[str, dict[str, Any]] = {}

SUPPORTED_BROKERS = {
    "alpaca": {"name": "Alpaca", "type": "stock", "fields": ["api_key", "api_secret", "paper"]},
    "ibkr": {"name": "Interactive Brokers", "type": "stock", "fields": ["host", "port", "client_id"]},
    "binance": {"name": "Binance", "type": "crypto", "fields": ["api_key", "api_secret"]},
    "coinbase": {"name": "Coinbase", "type": "crypto", "fields": ["api_key", "api_secret", "passphrase"]},
    "kraken": {"name": "Kraken", "type": "crypto", "fields": ["api_key", "api_secret"]},
    "bybit": {"name": "Bybit", "type": "crypto", "fields": ["api_key", "api_secret"]},
    "okx": {"name": "OKX", "type": "crypto", "fields": ["api_key", "api_secret", "passphrase"]},
    "kucoin": {"name": "KuCoin", "type": "crypto", "fields": ["api_key", "api_secret", "passphrase"]},
    "gate": {"name": "Gate.io", "type": "crypto", "fields": ["api_key", "api_secret"]},
    "htx": {"name": "HTX", "type": "crypto", "fields": ["api_key", "api_secret"]},
    "bitget": {"name": "Bitget", "type": "crypto", "fields": ["api_key", "api_secret", "passphrase"]},
}


class BrokerConnectRequest(BaseModel):
    provider: str
    config: dict[str, str] = {}
    risk_limit: float = 5000.0


async def _test_binance_connection(config: dict[str, str]) -> dict[str, Any]:
    try:
        import ccxt
        exchange = ccxt.binance({
            "apiKey": config.get("api_key", ""),
            "secret": config.get("api_secret", ""),
            "enableRateLimit": True,
        })
        ticker = await asyncio.to_thread(lambda: exchange.fetch_ticker("BTC/USDT"))
        return {
            "connected": True,
            "message": f"Binance connected. BTC/USDT: ${ticker.get('last', 0):,.2f}",
            "server_time": datetime.now(timezone.utc).isoformat(),
        }
    except ImportError:
        return {"connected": False, "message": "ccxt not installed. Run: pip install ccxt"}
    except Exception as e:
        return {"connected": False, "message": f"Binance connection failed: {str(e)[:200]}"}


async def _test_coinbase_connection(config: dict[str, str]) -> dict[str, Any]:
    try:
        import ccxt
        exchange = ccxt.coinbasepro({
            "apiKey": config.get("api_key", ""),
            "secret": config.get("api_secret", ""),
            "password": config.get("passphrase", ""),
            "enableRateLimit": True,
        })
        ticker = await asyncio.to_thread(lambda: exchange.fetch_ticker("BTC/USDT"))
        return {
            "connected": True,
            "message": f"Coinbase connected. BTC/USDT: ${ticker.get('last', 0):,.2f}",
            "server_time": datetime.now(timezone.utc).isoformat(),
        }
    except ImportError:
        return {"connected": False, "message": "ccxt not installed. Run: pip install ccxt"}
    except Exception as e:
        return {"connected": False, "message": f"Coinbase connection failed: {str(e)[:200]}"}


async def _test_kraken_connection(config: dict[str, str]) -> dict[str, Any]:
    try:
        import ccxt
        exchange = ccxt.kraken({
            "apiKey": config.get("api_key", ""),
            "secret": config.get("api_secret", ""),
            "enableRateLimit": True,
        })
        ticker = await asyncio.to_thread(lambda: exchange.fetch_ticker("BTC/USDT"))
        return {
            "connected": True,
            "message": f"Kraken connected. BTC/USDT: ${ticker.get('last', 0):,.2f}",
            "server_time": datetime.now(timezone.utc).isoformat(),
        }
    except ImportError:
        return {"connected": False, "message": "ccxt not installed. Run: pip install ccxt"}
    except Exception as e:
        return {"connected": False, "message": f"Kraken connection failed: {str(e)[:200]}"}


async def _test_generic_ccxt(exchange_id: str, config: dict[str, str]) -> dict[str, Any]:
    try:
        import ccxt
        exchange_class = getattr(ccxt, exchange_id, None)
        if not exchange_class:
            return {"connected": False, "message": f"Exchange {exchange_id} not supported by ccxt"}
        params = {"apiKey": config.get("api_key", ""), "secret": config.get("api_secret", ""), "enableRateLimit": True}
        if "passphrase" in config:
            params["password"] = config["passphrase"]
        exchange = exchange_class(params)
        ticker = await asyncio.to_thread(lambda: exchange.fetch_ticker("BTC/USDT"))
        return {
            "connected": True,
            "message": f"{exchange_id} connected. BTC/USDT: ${ticker.get('last', 0):,.2f}",
            "server_time": datetime.now(timezone.utc).isoformat(),
        }
    except ImportError:
        return {"connected": False, "message": "ccxt not installed. Run: pip install ccxt"}
    except Exception as e:
        return {"connected": False, "message": f"{exchange_id} connection failed: {str(e)[:200]}"}


async def _test_alpaca_connection(config: dict[str, str]) -> dict[str, Any]:
    try:
        from alpaca.trading.client import TradingClient
        client = TradingClient(
            api_key=config.get("api_key", ""),
            secret_key=config.get("api_secret", ""),
            paper=config.get("paper", "true").lower() == "true",
        )
        account = await asyncio.to_thread(lambda: client.get_account())
        return {
            "connected": True,
            "message": f"Alpaca connected. Account status: {account.status}",
            "account_id": str(account.id),
            "equity": float(account.equity) if hasattr(account, "equity") else None,
            "server_time": datetime.now(timezone.utc).isoformat(),
        }
    except ImportError:
        return {"connected": False, "message": "alpaca-py not installed. Run: pip install alpaca-py"}
    except Exception as e:
        return {"connected": False, "message": f"Alpaca connection failed: {str(e)[:200]}"}


async def _test_ibkr_connection(config: dict[str, str]) -> dict[str, Any]:
    host = config.get("host", "127.0.0.1")
    port = int(config.get("port", "7497"))
    client_id = int(config.get("client_id", "1"))
    try:
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((host, port))
        sock.close()
        if result == 0:
            return {
                "connected": True,
                "message": f"IBKR TWS/Gateway reachable at {host}:{port}",
                "server_time": datetime.now(timezone.utc).isoformat(),
            }
        else:
            return {"connected": False, "message": f"Cannot reach IBKR at {host}:{port}. Is TWS/Gateway running?"}
    except Exception as e:
        return {"connected": False, "message": f"IBKR connection test failed: {str(e)[:200]}"}


async def _test_connection(provider: str, config: dict[str, str]) -> dict[str, Any]:
    if provider == "alpaca":
        return await _test_alpaca_connection(config)
    elif provider == "ibkr":
        return await _test_ibkr_connection(config)
    elif provider in ("binance", "coinbase", "kraken", "bybit", "okx", "kucoin", "gate", "htx", "bitget"):
        return await _test_generic_ccxt(provider, config)
    return {"connected": False, "message": f"Unknown provider: {provider}"}


@router.get("/supported")
async def list_supported_brokers():
    return {"brokers": SUPPORTED_BROKERS}


@router.post("/connect")
async def connect_broker(body: BrokerConnectRequest):
    provider = body.provider
    if provider not in SUPPORTED_BROKERS:
        raise HTTPException(400, f"Unknown broker: {provider}. Supported: {list(SUPPORTED_BROKERS.keys())}")

    test_result = await _test_connection(provider, body.config)

    config_id = f"brk_{uuid.uuid4().hex[:8]}"
    _broker_configs[config_id] = {
        "provider": provider,
        "config": {k: ("***" if len(v) > 4 else v) for k, v in body.config.items()},
        "raw_config": body.config,
        "risk_limit": body.risk_limit,
        "connected": test_result.get("connected", False),
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "last_test": test_result,
    }

    logger.info("Broker connect attempt: %s (id=%s) connected=%s", provider, config_id, test_result.get("connected"))
    return {
        "status": "ok" if test_result.get("connected") else "failed",
        "config_id": config_id,
        "provider": provider,
        **test_result,
    }


@router.post("/save")
async def save_broker_config(body: BrokerConnectRequest):
    provider = body.provider
    if provider not in SUPPORTED_BROKERS:
        raise HTTPException(400, f"Unknown broker: {provider}")

    config_id = f"brk_{uuid.uuid4().hex[:8]}"
    _broker_configs[config_id] = {
        "provider": provider,
        "config": {k: ("***" if len(v) > 4 else v) for k, v in body.config.items()},
        "raw_config": body.config,
        "risk_limit": body.risk_limit,
        "connected": False,
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }
    logger.info("Broker config saved: %s (id=%s)", provider, config_id)
    return {"status": "ok", "config_id": config_id, "message": f"Configuration saved for {provider}"}


@router.get("/configs")
async def list_broker_configs():
    return {
        "configs": [
            {
                "id": cid,
                "provider": cfg["provider"],
                "connected": cfg.get("connected", False),
                "saved_at": cfg.get("saved_at", cfg.get("connected_at", "")),
                "risk_limit": cfg.get("risk_limit", 5000),
            }
            for cid, cfg in _broker_configs.items()
        ]
    }


@router.delete("/configs/{config_id}")
async def delete_broker_config(config_id: str):
    if config_id not in _broker_configs:
        raise HTTPException(404, f"Config {config_id} not found")
    removed = _broker_configs.pop(config_id)
    return {"status": "ok", "message": f"Removed {removed['provider']} config"}


@router.post("/configs/{config_id}/test")
async def test_broker_connection(config_id: str):
    if config_id not in _broker_configs:
        raise HTTPException(404, f"Config {config_id} not found")
    cfg = _broker_configs[config_id]
    raw_config = cfg.get("raw_config", cfg.get("config", {}))
    result = await _test_connection(cfg["provider"], raw_config)
    cfg["connected"] = result.get("connected", False)
    cfg["last_test"] = result
    cfg["last_tested_at"] = datetime.now(timezone.utc).isoformat()
    return {"config_id": config_id, "provider": cfg["provider"], **result}


@router.post("/configs/{config_id}/disconnect")
async def disconnect_broker(config_id: str):
    if config_id not in _broker_configs:
        raise HTTPException(404, f"Config {config_id} not found")
    _broker_configs[config_id]["connected"] = False
    _broker_configs[config_id]["disconnected_at"] = datetime.now(timezone.utc).isoformat()
    return {"status": "ok", "message": "Broker disconnected"}


import asyncio
