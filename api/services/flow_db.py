from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

_workflows: dict[str, dict[str, Any]] = {}
_executions: dict[str, list[dict[str, Any]]] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _id() -> str:
    return uuid.uuid4().hex[:16]


def create_workflow(name: str, description: str = "", user_id: str = "default") -> dict:
    wid = _id()
    wf = {
        "id": wid,
        "name": name,
        "description": description,
        "user_id": user_id,
        "nodes": [],
        "edges": [],
        "trigger_type": None,
        "is_active": False,
        "webhook_token": None,
        "api_key_encrypted": None,
        "schedule_config": None,
        "price_alert_config": None,
        "created_at": _now(),
        "updated_at": _now(),
    }
    _workflows[wid] = wf
    return wf


def get_workflow(workflow_id: str) -> dict | None:
    return _workflows.get(workflow_id)


def list_workflows(user_id: str = "default") -> list[dict]:
    return [w for w in _workflows.values() if w.get("user_id") == user_id]


def update_workflow(workflow_id: str, data: dict) -> dict | None:
    wf = _workflows.get(workflow_id)
    if not wf:
        return None
    for key in ("name", "description", "nodes", "edges", "trigger_type", "schedule_config", "price_alert_config"):
        if key in data:
            wf[key] = data[key]
    wf["updated_at"] = _now()
    return wf


def delete_workflow(workflow_id: str) -> bool:
    return _workflows.pop(workflow_id, None) is not None


def activate_workflow(workflow_id: str, api_key_encrypted: str | None, trigger_type: str, schedule_config: dict | None = None, price_alert_config: dict | None = None) -> dict | None:
    wf = _workflows.get(workflow_id)
    if not wf:
        return None
    wf["is_active"] = True
    wf["api_key_encrypted"] = api_key_encrypted
    wf["trigger_type"] = trigger_type
    wf["schedule_config"] = schedule_config
    wf["price_alert_config"] = price_alert_config
    if trigger_type == "webhook" and not wf.get("webhook_token"):
        wf["webhook_token"] = _id()
    wf["updated_at"] = _now()
    return wf


def deactivate_workflow(workflow_id: str) -> dict | None:
    wf = _workflows.get(workflow_id)
    if not wf:
        return None
    wf["is_active"] = False
    wf["updated_at"] = _now()
    return wf


def add_execution_log(workflow_id: str, status: str, log_entries: list[dict]) -> dict:
    if workflow_id not in _executions:
        _executions[workflow_id] = []
    execution = {"id": _id(), "workflow_id": workflow_id, "status": status, "logs": log_entries, "started_at": _now(), "completed_at": _now()}
    _executions[workflow_id].append(execution)
    return execution


def get_executions(workflow_id: str) -> list[dict]:
    return _executions.get(workflow_id, [])


def get_workflow_by_webhook_token(token: str) -> dict | None:
    for wf in _workflows.values():
        if wf.get("webhook_token") == token and wf.get("is_active"):
            return wf
    return None
