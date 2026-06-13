from __future__ import annotations

import logging
from typing import Any, Callable, Coroutine

logger = logging.getLogger(__name__)


async def cancel_all_orders(
    cancel_fn: Callable[..., Coroutine[Any, Any, tuple[list, list]]] | None = None,
    sandbox_cancel_fn: Callable[..., Coroutine[Any, Any, dict]] | None = None,
    is_analyze: bool = False,
) -> tuple[bool, dict, int]:
    if is_analyze and sandbox_cancel_fn:
        try:
            result = await sandbox_cancel_fn()
            canceled = result.get("canceled_orders", [])
            failed = result.get("failed_cancellations", [])
            return True, {
                "status": "success",
                "canceled_orders": canceled,
                "failed_cancellations": failed,
                "message": f"Canceled {len(canceled)} orders. Failed: {len(failed)}",
            }, 200
        except Exception as e:
            logger.exception(f"Sandbox cancel all failed: {e}")
            return False, {"status": "error", "message": str(e)}, 500

    if cancel_fn:
        try:
            canceled, failed = await cancel_fn()
            return True, {
                "status": "success",
                "canceled_orders": canceled,
                "failed_cancellations": failed,
                "message": f"Canceled {len(canceled)} orders. Failed: {len(failed)}",
            }, 200
        except Exception as e:
            logger.exception(f"Cancel all orders failed: {e}")
            return False, {"status": "error", "message": str(e)}, 500

    return False, {"status": "error", "message": "No execution function provided"}, 500
