from __future__ import annotations

import time
import logging
import functools
from datetime import datetime, timezone

from persistence.models_latency import OrderLatency
from persistence.multi_db import multi_db

logger = logging.getLogger(__name__)


def monitor_latency(order_type: str = None):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            start = time.perf_counter()

            try:
                result = await func(*args, **kwargs)
                rtt = (time.perf_counter() - start) * 1000

                try:
                    factory = multi_db.get_factory("latency")
                    async with factory() as session:
                        order_data = {}
                        symbol = ""
                        user_id = None

                        for arg in args:
                            if hasattr(arg, "symbol"):
                                symbol = arg.symbol
                            if hasattr(arg, "user_id"):
                                user_id = arg.user_id

                        log = OrderLatency(
                            order_id=str(int(time.time() * 1000)),
                            user_id=user_id,
                            symbol=symbol,
                            order_type=order_type or "UNKNOWN",
                            rtt_ms=round(rtt, 2),
                            total_latency_ms=round(rtt, 2),
                            status="SUCCESS",
                        )
                        session.add(log)
                        await session.commit()
                except Exception as e:
                    logger.error(f"Failed to log latency: {e}")

                return result

            except Exception as e:
                rtt = (time.perf_counter() - start) * 1000
                try:
                    factory = multi_db.get_factory("latency")
                    async with factory() as session:
                        log = OrderLatency(
                            order_id=str(int(time.time() * 1000)),
                            order_type=order_type or "UNKNOWN",
                            rtt_ms=round(rtt, 2),
                            total_latency_ms=round(rtt, 2),
                            status="FAILED",
                            error=str(e)[:200],
                        )
                        session.add(log)
                        await session.commit()
                except Exception as log_e:
                    logger.error(f"Failed to log latency: {log_e}")
                raise

        return wrapper

    if callable(order_type):
        func = order_type
        order_type = None
        return decorator(func)

    return decorator
