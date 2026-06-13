from __future__ import annotations

import logging
from typing import Any, Callable, Coroutine

logger = logging.getLogger(__name__)


async def close_position(
    position_data: dict[str, Any] | None = None,
    close_fn: Callable[..., Coroutine[Any, Any, dict]] | None = None,
    sandbox_close_fn: Callable[..., Coroutine[Any, Any, dict]] | None = None,
    is_analyze: bool = False,
) -> tuple[bool, dict, int]:
    if is_analyze and sandbox_close_fn:
        try:
            result = await sandbox_close_fn(position_data or {})
            return True, result, 200
        except Exception as e:
            logger.exception(f"Sandbox close position failed: {e}")
            return False, {"status": "error", "message": str(e)}, 500

    if close_fn:
        try:
            result = await close_fn(position_data or {})
            if result.get("status") == "success":
                return True, {"status": "success", "message": "All open positions squared off"}, 200
            return False, result, 400
        except Exception as e:
            logger.exception(f"Close position failed: {e}")
            return False, {"status": "error", "message": str(e)}, 500

    return False, {"status": "error", "message": "No execution function provided"}, 500
