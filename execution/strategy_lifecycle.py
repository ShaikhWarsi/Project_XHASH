from __future__ import annotations

import logging
import threading
from typing import Set

logger = logging.getLogger(__name__)

_quiet_lock = threading.Lock()
_quiet_sids: Set[int] = set()


def is_fatal_exchange_error(msg: str) -> bool:
    m = (msg or "").lower()
    if not m:
        return False
    if "unsupported market type" in m or "unsupported market" in m:
        return True
    tokens = (
        "binance http 401",
        '"code":-2015',
        "-2015",
        "okx http 401",
        '"code":"50111"',
        "50111",
        "invalid api-key",
        "invalid api key",
        "invalid ok-access-key",
        "invalid ip",
        "invalid_ip",
        "40018",
        "permissions for action",
        "unauthorized",
        "forbidden",
        " http 401",
        "authentication",
        "signature mismatch",
        "invalid_signature",
        "permission denied",
        "connection refused",
        "connect call failed",
        "errno 111",
        "make sure api port on tws",
        "failed to connect to ibkr",
        "ibkr connection failed",
        "live trading error",
        "single-asset collateral mode is temporarily unavailable",
        "disabled ibkr",
    )
    return any(t in m for t in tokens)


def should_skip_position_sync(strategy_id: int) -> bool:
    with _quiet_lock:
        return int(strategy_id) in _quiet_sids


def auto_stop_live_strategy(
    strategy_id: int,
    reason: str,
    *,
    source: str = "position_sync",
) -> bool:
    sid = int(strategy_id)
    if sid <= 0:
        return False

    reason = (reason or "").strip() or "fatal exchange error"
    with _quiet_lock:
        already = sid in _quiet_sids
        _quiet_sids.add(sid)
    if already:
        return True

    log_msg = f"Auto-stopped ({source}): {reason}"
    logger.error("[Strategy %s] %s", sid, log_msg)

    try:
        from persistence.database import get_session
        import asyncio

        async def _update():
            async for session in get_session():
                from sqlalchemy import update
                from persistence.models import Order
                await session.execute(
                    update(Order)
                    .where(Order.status == "SUBMITTED")
                    .values(status="CANCELLED")
                )
                await session.commit()
                break

        loop = asyncio.new_event_loop()
        loop.run_until_complete(_update())
        loop.close()
    except Exception as e:
        logger.warning("auto_stop: DB update failed for strategy %s: %s", sid, e)

    try:
        from api.agent_jobs import _gc_job_state
        _gc_job_state(f"strategy_{sid}")
    except Exception as e:
        logger.debug("auto_stop: cleanup %s: %s", sid, e)

    return True
