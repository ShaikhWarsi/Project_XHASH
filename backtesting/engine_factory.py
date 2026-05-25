"""Engine factory — maps engine_type to market parameters.

Provides a bridge between the multi-asset engine hierarchy and
the API/CLI/frontend workflow. The factory sets market-appropriate
commission, slippage, and leverage on BacktestEngine.

For full market rule enforcement (T+1, funding fees, liquidation,
contract multipliers), use the engine classes directly via Python.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from backtesting.market_engines import (
    BaseEngine,
    ChinaAEngine,
    ChinaFuturesEngine,
    CompositeEngine,
    CryptoEngine,
    ForexEngine,
    GlobalEquityEngine,
    GlobalFuturesEngine,
)

ENGINE_MARKET_PARAMS: Dict[str, Dict[str, Any]] = {
    "default": {
        "label": "Default (simple)",
        "description": "Simple commission+slippage model, no market rules",
        "commission": 0.001,
        "slippage": 0.001,
        "leverage": 1.0,
    },
    "us_equity": {
        "label": "US Equity",
        "description": "T+0, long/short, zero commission retail, fractional shares",
        "commission": 0.0,
        "slippage": 0.0005,
        "leverage": 1.0,
    },
    "hk_equity": {
        "label": "HK Equity",
        "description": "T+0, 100-share lots, stamp tax 0.1% + levies",
        "commission": 0.00127,
        "slippage": 0.001,
        "leverage": 1.0,
    },
    "china_a": {
        "label": "China A-Share",
        "description": "T+1, no short, 100-share lots, stamp tax 0.05% sell",
        "commission": 0.00077,
        "slippage": 0.001,
        "leverage": 1.0,
    },
    "crypto": {
        "label": "Crypto Perpetual",
        "description": "24/7, taker 0.05% / maker 0.02%, funding fees, liquidation",
        "commission": 0.0005,
        "slippage": 0.0005,
        "leverage": 1.0,
    },
    "forex": {
        "label": "Forex",
        "description": "24x5, spread-based pricing, 100:1 leverage, swap at daily close",
        "commission": 0.0,
        "slippage": 0.0001,
        "leverage": 100.0,
    },
    "china_futures": {
        "label": "China Futures",
        "description": "CFFEX/SHFE/DCE/ZCE, product-specific multipliers, margin 5-15%",
        "commission": 0.0001,
        "slippage": 0.0005,
        "leverage": 10.0,
    },
    "global_futures": {
        "label": "Global Futures",
        "description": "CME/ICE/Eurex, per-contract commission ~$2.25, ~10x leverage",
        "commission": 0.0,
        "slippage": 0.0003,
        "leverage": 10.0,
    },
}

ENGINE_CLASSES: Dict[str, type[BaseEngine]] = {
    "china_a": ChinaAEngine,
    "crypto": CryptoEngine,
    "forex": ForexEngine,
    "us_equity": GlobalEquityEngine,
    "hk_equity": lambda cfg: GlobalEquityEngine(cfg, market="hk"),
    "china_futures": ChinaFuturesEngine,
    "global_futures": GlobalFuturesEngine,
}


def list_engines() -> list[dict[str, Any]]:
    """Return available engines for frontend dropdown."""
    return [
        {
            "id": engine_id,
            "label": params["label"],
            "description": params["description"],
        }
        for engine_id, params in ENGINE_MARKET_PARAMS.items()
    ]


def get_engine_params(engine_type: str, overrides: Optional[dict] = None) -> dict[str, Any]:
    """Get BacktestEngine-compatible params for an engine type.

    Args:
        engine_type: Key in ENGINE_MARKET_PARAMS ("default", "us_equity", etc.)
        overrides: Optional dict to override individual params.

    Returns:
        Dict with commission, slippage, leverage keys.
    """
    params = ENGINE_MARKET_PARAMS.get(engine_type, ENGINE_MARKET_PARAMS["default"])
    result = {
        "commission": params["commission"],
        "slippage": params["slippage"],
        "leverage": params["leverage"],
    }
    if overrides:
        result.update(overrides)
    return result


def instantiate_engine(
    engine_type: str,
    config: Optional[dict] = None,
) -> Optional[BaseEngine]:
    """Instantiate a full market engine for programmatic use.

    Returns None for "default" (no market engine).
    """
    if engine_type in ("default",):
        return None

    cls = ENGINE_CLASSES.get(engine_type)
    if cls is None:
        return None

    engine_cfg = dict(config or {})
    if engine_type == "hk_equity":
        return cls(engine_cfg, market="hk")
    return cls(engine_cfg)
