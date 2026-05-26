from __future__ import annotations

from fastapi import APIRouter, Query, HTTPException

from api.state import app_state
from signals.structure_state import StructureFusionEngine, StructureState
from signals.engine_registry import create_engine
from core.enums import SignalDir, RegimeType

router = APIRouter(prefix="/v1/structure", tags=["structure"])
_fusion = StructureFusionEngine()


@router.get("/{symbol}")
async def get_structure(
    symbol: str,
    timeframe: str = Query("1h", description="Timeframe for analysis"),
):
    sm = await app_state.async_get_signals()
    if sm is None:
        return _empty_state(symbol, timeframe)

    signals = sm.get_signals(symbol.upper())
    regime = sm.regime

    state = _fusion.fuse(symbol.upper(), timeframe, signals, regime_state=regime)
    return _to_response(state)


def _empty_state(symbol: str, timeframe: str) -> dict:
    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "composite_bias": "NEUTRAL",
        "composite_confidence": 0.0,
        "regime": "unknown",
        "total_signals": 0,
        "bullish_count": 0,
        "bearish_count": 0,
        "active_order_blocks": [],
        "active_fvgs": [],
        "liquidity_levels": [],
        "last_bos": None,
        "last_choch": None,
        "key_levels": [],
        "active_patterns": [],
    }


def _to_response(state: StructureState) -> dict:
    return {
        "symbol": state.symbol,
        "timeframe": state.timeframe,
        "composite_bias": state.composite_bias.name,
        "composite_confidence": state.composite_confidence,
        "regime": state.regime.value,
        "total_signals": state.total_signals,
        "bullish_count": state.bullish_count,
        "bearish_count": state.bearish_count,
        "active_order_blocks": state.active_order_blocks,
        "active_fvgs": state.active_fvgs,
        "liquidity_levels": state.liquidity_levels,
        "last_bos": state.last_bos,
        "last_choch": state.last_choch,
        "key_levels": state.key_levels,
        "active_patterns": state.active_patterns,
    }
