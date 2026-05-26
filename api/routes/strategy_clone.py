from __future__ import annotations

import copy
import logging
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/strategies", tags=["strategies"])

_cloned_strategies: dict[str, dict[str, Any]] = {}


@router.post("/{strategy_id}/clone")
async def clone_strategy(strategy_id: str) -> dict[str, Any]:
    try:
        from api.state import app_state

        sm = await app_state.async_get_signals()
        if not sm:
            raise HTTPException(404, "Signal matrix not available")

        new_id = f"{strategy_id}_clone_{uuid.uuid4().hex[:8]}"

        config = {}
        if hasattr(sm, "strategies") and strategy_id in sm.strategies:
            original = sm.strategies[strategy_id]
            if hasattr(original, "model_dump"):
                config = original.model_dump()
            elif isinstance(original, dict):
                config = copy.deepcopy(original)
            else:
                config = {"original_type": type(original).__name__}
            config["cloned_from"] = strategy_id
            config["clone_id"] = new_id
        elif hasattr(sm, "get_strategy_config"):
            config = sm.get_strategy_config(strategy_id) or {}
            config["cloned_from"] = strategy_id
            config["clone_id"] = new_id

        _cloned_strategies[new_id] = config

        if hasattr(sm, "strategies") and isinstance(sm.strategies, dict):
            sm.strategies[new_id] = copy.deepcopy(config)

        return {
            "original_id": strategy_id,
            "new_id": new_id,
            "status": "cloned",
            "config": config,
            "message": f"Strategy {strategy_id} cloned to {new_id}",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to clone strategy %s", strategy_id)
        raise HTTPException(500, str(e))
