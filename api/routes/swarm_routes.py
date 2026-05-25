from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.services.swarm.store import SwarmStore

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/swarm", tags=["swarm"])


class CreateRunRequest(BaseModel):
    preset_name: str = ""
    user_vars: dict[str, Any] | None = None


class UpdateRunStatusRequest(BaseModel):
    status: str


class CreateTaskRequest(BaseModel):
    agent_id: str = ""
    prompt_template: str = ""
    depends_on: list[str] | None = None


@router.get("/runs")
async def list_runs():
    runs = SwarmStore.list_runs()
    return {"runs": runs}


@router.post("/runs")
async def create_run(req: CreateRunRequest):
    run_id = f"run_{uuid.uuid4().hex[:12]}"
    run = SwarmStore.create_run(run_id, req.preset_name, req.user_vars)
    return run


@router.get("/runs/{run_id}")
async def get_run(run_id: str):
    run = SwarmStore.reconcile_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.patch("/runs/{run_id}/status")
async def update_run_status(run_id: str, req: UpdateRunStatusRequest):
    run = SwarmStore.update_run_status(run_id, req.status)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.delete("/runs/{run_id}")
async def cancel_run(run_id: str):
    run = SwarmStore.update_run_status(run_id, "cancelled")
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"status": "cancelled", "run_id": run_id}


@router.get("/runs/{run_id}/tasks")
async def list_tasks(run_id: str):
    if not SwarmStore.load_run(run_id):
        raise HTTPException(status_code=404, detail="Run not found")
    tasks = SwarmStore.load_all_tasks(run_id)
    return {"tasks": tasks}


@router.post("/runs/{run_id}/tasks")
async def create_task(run_id: str, req: CreateTaskRequest):
    if not SwarmStore.load_run(run_id):
        raise HTTPException(status_code=404, detail="Run not found")
    task = {
        "id": f"task_{uuid.uuid4().hex[:8]}",
        "run_id": run_id,
        "agent_id": req.agent_id,
        "prompt_template": req.prompt_template,
        "depends_on": req.depends_on or [],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    SwarmStore.save_task(run_id, task)
    return task


@router.get("/runs/{run_id}/events")
async def list_events(run_id: str):
    if not SwarmStore.load_run(run_id):
        raise HTTPException(status_code=404, detail="Run not found")
    events = SwarmStore.load_events(run_id)
    return {"events": events}


@router.post("/reap")
async def reap_stale():
    reaped = SwarmStore.reap_stale_runs()
    return {"reaped": reaped, "count": len(reaped)}


@router.get("/health")
async def swarm_health():
    runs = SwarmStore.list_runs()
    running = [r for r in runs if r.get("status") == "running"]
    stale = []
    for r in running:
        if SwarmStore.is_run_stale(r):
            stale.append(r["run_id"])
    return {
        "total_runs": len(runs),
        "running": len(running),
        "stale": stale,
        "stale_count": len(stale),
    }
