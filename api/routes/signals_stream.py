from __future__ import annotations

import asyncio
import hashlib
import json
import logging

from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse

from api.state import app_state

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/signals", tags=["signals"])


def _signal_hash(signal_dict: dict) -> str:
    """Return a stable hash for a single signal dict for change detection."""
    key = f"{signal_dict.get('symbol')}:{signal_dict.get('type')}:{signal_dict.get('direction')}:{signal_dict.get('strength')}:{signal_dict.get('confidence')}:{signal_dict.get('price')}:{signal_dict.get('level')}"
    return hashlib.md5(key.encode()).hexdigest()


async def signal_event_generator(request: Request, symbols: list[str] | None, engines: list[str] | None):
    last_emitted: str | None = None
    last_signal_hashes: dict[str, set[str]] = {}
    _heartbeat_counter = 0
    try:
        while True:
            if await request.is_disconnected():
                break

            sm = await app_state.async_get_signals()
            if sm:
                signals_dict = {}
                has_changed = hasattr(sm, 'changed')
                current_hashes: dict[str, set[str]] = {}

                for symbol, sigs in sm.signals.items():
                    if symbols and symbol not in symbols:
                        continue
                    filtered_dicts = []
                    for s in sigs:
                        try:
                            type_val = s.type.value if hasattr(s.type, "value") else str(s.type)
                        except AttributeError:
                            type_val = str(s.type)
                        if engines and type_val not in engines:
                            continue

                        sig_dict = {
                            "type": type_val,
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
                        filtered_dicts.append(sig_dict)

                    if filtered_dicts:
                        signals_dict[symbol] = filtered_dicts
                        signal_hashes = {_signal_hash(sd) for sd in filtered_dicts}
                        current_hashes[symbol] = signal_hashes

                        prev_hashes = last_signal_hashes.get(symbol, set())
                        if signal_hashes != prev_hashes:
                            has_changed = True

                last_signal_hashes = current_hashes

                regime_ts = sm.timestamp.isoformat() if hasattr(sm.timestamp, "isoformat") else str(sm.timestamp)
                payload_key = f"{regime_ts}:{len(signals_dict)}"

                if not has_changed and payload_key == last_emitted:
                    _heartbeat_counter += 1
                    if _heartbeat_counter % 30 == 0:
                        yield ": heartbeat\n\n"
                    await asyncio.sleep(2)
                    continue

                data = {
                    "timestamp": regime_ts,
                    "signals": signals_dict,
                    "composite_scores": sm.composite_scores,
                    "regime": {
                        "primary": sm.regime.primary.value if sm.regime else "unknown",
                        "confidence": sm.regime.confidence if sm.regime else 0,
                        "wasserstein_cluster": sm.regime.wasserstein_cluster if sm.regime else -1,
                        "vol_regime": sm.regime.vol_regime if sm.regime else "unknown",
                    } if sm.regime else None,
                }
                last_emitted = payload_key
                _heartbeat_counter = 0
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
