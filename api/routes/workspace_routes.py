from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workspace", tags=["workspace"])

_workspaces: dict[str, dict[str, Any]] = {}
_WORKSPACE_FILE = "chart_workspaces.json"


def _load_workspaces() -> dict[str, dict[str, Any]]:
    global _workspaces
    if _workspaces:
        return _workspaces
    try:
        with open(_WORKSPACE_FILE) as f:
            _workspaces = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        _workspaces = {}
    return _workspaces


def _save_workspaces() -> None:
    try:
        with open(_WORKSPACE_FILE, "w") as f:
            json.dump(_workspaces, f, indent=2, default=str)
    except OSError as e:
        logger.warning("Could not save workspaces: %s", e)


@router.get("/")
async def list_workspaces():
    workspaces = _load_workspaces()
    return {
        "workspaces": [
            {
                "id": wid,
                "name": w.get("name", "Untitled"),
                "symbol": w.get("symbol", ""),
                "interval": w.get("interval", "1d"),
                "updated_at": w.get("updated_at", ""),
                "drawing_count": len(w.get("drawings", [])),
                "indicator_count": len(w.get("indicators", [])),
            }
            for wid, w in workspaces.items()
        ]
    }


@router.post("/save")
async def save_workspace(data: dict[str, Any]):
    workspace_id = data.get("id") or str(uuid.uuid4())
    workspaces = _load_workspaces()

    workspaces[workspace_id] = {
        "id": workspace_id,
        "name": data.get("name", "Untitled"),
        "symbol": data.get("symbol", ""),
        "interval": data.get("interval", "1d"),
        "chart_style": data.get("chart_style", "candle"),
        "theme": data.get("theme", "dark"),
        "layout": data.get("layout", "single"),
        "indicators": data.get("indicators", []),
        "drawings": data.get("drawings", []),
        "layers": data.get("layers", []),
        "comparison_symbols": data.get("comparison_symbols", []),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    _save_workspaces()
    return {"id": workspace_id, "name": data.get("name", "Untitled")}


@router.get("/{workspace_id}")
async def load_workspace(workspace_id: str):
    workspaces = _load_workspaces()
    workspace = workspaces.get(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


@router.delete("/{workspace_id}")
async def delete_workspace(workspace_id: str):
    workspaces = _load_workspaces()
    if workspace_id not in workspaces:
        raise HTTPException(status_code=404, detail="Workspace not found")
    del workspaces[workspace_id]
    _save_workspaces()
    return {"status": "deleted", "id": workspace_id}
