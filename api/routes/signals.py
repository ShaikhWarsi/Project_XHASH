from __future__ import annotations

import asyncio
import logging
from itertools import islice

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from api.state import app_state

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/signals", tags=["signals"])


class SpectreRequest(BaseModel):
    symbol: str
    timeframe: str = "1d"


class TSFreshRequest(BaseModel):
    symbol: str
    interval: str = "1d"
    period: int = 100


def _serialize_signal(s):
    return {
        "type": s.type.value if hasattr(s.type, "value") else str(s.type),
        "direction": s.direction.value if hasattr(s.direction, "value") else int(s.direction),
        "strength": s.strength,
        "confidence": s.confidence,
        "symbol": s.symbol,
        "timeframe": s.timeframe,
        "timestamp": str(s.timestamp) if hasattr(s, "timestamp") else "",
        "price": s.price,
        "level": s.level,
        "metadata": getattr(s, "metadata", {}),
    }


def _serialize_regime(sm):
    if not sm or not sm.regime:
        return None
    return {
        "primary": sm.regime.primary.value if hasattr(sm.regime.primary, "value") else "unknown",
        "confidence": sm.regime.confidence,
        "wasserstein_cluster": sm.regime.wasserstein_cluster if hasattr(sm.regime, "wasserstein_cluster") else -1,
        "vol_regime": sm.regime.vol_regime if hasattr(sm.regime, "vol_regime") else "unknown",
    }


def _serialize_timestamp(sm):
    if not sm:
        return ""
    ts = sm.timestamp
    return ts.isoformat() if hasattr(ts, "isoformat") else str(ts)


@router.get("/count")
async def get_signals_count():
    sm = await app_state.async_get_signals()
    if not sm or not sm.signals:
        return {"count": 0}
    total = sum(len(s) for s in sm.signals.values())
    return {"count": total, "symbols": len(sm.signals)}


@router.get("")
async def get_signals(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    sm = await app_state.async_get_signals()
    if not sm:
        return {
            "status": "empty",
            "message": "No signal data available",
            "timestamp": "",
            "signals": {},
            "composite_scores": {},
            "regime": None,
        }

    page_symbols = list(islice(sm.signals.keys(), offset, offset + limit))
    signals_dict = {}
    for symbol in page_symbols:
        sigs = sm.signals[symbol]
        signals_dict[symbol] = [_serialize_signal(s) for s in sigs]

    return {
        "status": "ok",
        "timestamp": _serialize_timestamp(sm),
        "signals": signals_dict,
        "composite_scores": sm.composite_scores,
        "regime": _serialize_regime(sm),
    }


@router.post("/spectre")
async def run_spectre(req: SpectreRequest):
    symbol = req.symbol.strip()
    if not symbol:
        raise HTTPException(400, "symbol is required")
    try:
        from signals.spectre import SpectreEngine
        engine = SpectreEngine()
        result = await asyncio.to_thread(engine.analyze, symbol, req.timeframe)
        return result
    except ImportError:
        logger.warning("SpectreEngine not available")
        raise HTTPException(status_code=501, detail="Spectre engine not installed")
    except Exception as e:
        logger.warning("Spectre analysis failed for %s: %s", symbol, e)
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/tsfresh")
async def run_tsfresh(req: TSFreshRequest):
    symbol = req.symbol.strip()
    if not symbol:
        raise HTTPException(400, "symbol is required")
    try:
        from signals.tsfresh_engine import TSFreshEngine
        engine = TSFreshEngine()
        result = await asyncio.to_thread(engine.extract_features, symbol, req.interval, req.period)
        return result
    except ImportError:
        logger.warning("TSFreshEngine not available")
        raise HTTPException(status_code=501, detail="TSFresh engine not installed")
    except Exception as e:
        logger.warning("TSFresh analysis failed for %s: %s", symbol, e)
        raise HTTPException(status_code=502, detail=str(e))
