from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse

from api.state import app_state

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/signals", tags=["signals"])


async def signal_event_generator(request: Request, symbols: list[str] | None, engines: list[str] | None):
    try:
        while True:
            if await request.is_disconnected():
                break

            sm = await app_state.async_get_signals()
            if sm:
                signals_dict = {}
                for symbol, sigs in sm.signals.items():
                    if symbols and symbol not in symbols:
                        continue
                    filtered = [
                        s for s in sigs
                        if not engines or s.type.value in engines or s.type in engines
                    ]
                    if filtered:
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
                            for s in filtered
                        ]

                data = {
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
                yield f"data: {json.dumps(data, default=str)}\n\n"
            else:
                yield "data: {}\n\n"

            await asyncio.sleep(2)
    except asyncio.CancelledError:
        pass


@router.get("/stream")
async def stream_signals(
    request: Request,
    symbols: str | None = Query(None, description="Comma-separated list of symbols to filter"),
    engines: str | None = Query(None, description="Comma-separated list of signal engines to filter"),
):
    symbol_list = symbols.split(",") if symbols else None
    engine_list = engines.split(",") if engines else None

    return StreamingResponse(
        signal_event_generator(request, symbol_list, engine_list),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
