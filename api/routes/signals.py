from __future__ import annotations

from fastapi import APIRouter, Query

from api.state import app_state

router = APIRouter(prefix="/signals", tags=["signals"])


@router.get("/")
async def get_signals(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    sm = app_state.signals
    if not sm:
        return {"timestamp": "", "signals": {}, "composite_scores": {}, "regime": None}

    symbols = list(sm.signals.keys())[offset:offset + limit]
    signals_dict = {}
    for symbol in symbols:
        sigs = sm.signals[symbol]
        signals_dict[symbol] = [
            {
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
            for s in sigs
        ]

    return {
        "timestamp": sm.timestamp.isoformat() if hasattr(sm.timestamp, "isoformat") else str(sm.timestamp),
        "signals": signals_dict,
        "composite_scores": sm.composite_scores,
        "regime": {
            "primary": sm.regime.primary.value if sm.regime else "unknown",
            "confidence": sm.regime.confidence if sm.regime else 0,
            "wasserstein_cluster": sm.regime.wasserstein_cluster if sm.regime else -1,
            "vol_regime": sm.regime.vol_regime if sm.regime else "unknown",
        } if sm.regime else None,
    }


@router.get("/latest")
async def get_latest_signals():
    sm = app_state.signals
    if sm:
        signals_dict = {}
        for symbol, sigs in sm.signals.items():
            signals_dict[symbol] = [
                {
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
                for s in sigs
            ]
        return {
            "timestamp": sm.timestamp.isoformat() if hasattr(sm.timestamp, "isoformat") else str(sm.timestamp),
            "signals": signals_dict,
            "composite_scores": sm.composite_scores,
            "regime": {
                "primary": sm.regime.primary.value if sm.regime else "unknown",
                "confidence": sm.regime.confidence if sm.regime else 0,
                "wasserstein_cluster": sm.regime.wasserstein_cluster if sm.regime else -1,
                "vol_regime": sm.regime.vol_regime if sm.regime else "unknown",
            } if sm.regime else None,
        }
    return {"timestamp": "", "signals": {}, "composite_scores": {}, "regime": None}
