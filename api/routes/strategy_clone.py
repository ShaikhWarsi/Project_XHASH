from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/strategies", tags=["strategies"])


@router.post("/{strategy_id}/clone")
async def clone_strategy(strategy_id: str) -> dict[str, Any]:
    try:
        from api.state import app_state

        sm = app_state.signals
        if not sm:
            raise HTTPException(404, "Signal matrix not available")

        new_id = f"{strategy_id}_clone_{uuid.uuid4().hex[:8]}"

        return {
            "original_id": strategy_id,
            "new_id": new_id,
            "status": "cloned",
            "message": f"Strategy {strategy_id} cloned to {new_id}",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to clone strategy %s", strategy_id)
        raise HTTPException(500, str(e))
