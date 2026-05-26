from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from api.services.swarm.store import SwarmStore

logger = logging.getLogger(__name__)

_task_results: dict[str, dict[str, Any]] = {}


async def _execute_task(run_id: str, task_id: str, agent_id: str, prompt_template: str):
    try:
        SwarmStore.update_task_status(run_id, task_id, "running")

        if agent_id and prompt_template:
            prompt = prompt_template.replace("{run_id}", run_id).replace("{task_id}", task_id)
            import yfinance as yf

            symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"]
            results = []
            for symbol in symbols:
                try:
                    ticker = yf.Ticker(symbol)
                    df = ticker.history(period="1mo")
                    if not df.empty:
                        price = float(df["Close"].iloc[-1])
                        change = float(df["Close"].pct_change().iloc[-1] * 100)
                        results.append({"symbol": symbol, "price": round(price, 2), "change_pct": round(change, 2)})
                    await asyncio.sleep(0.05)
                except Exception:
                    continue

            output = {
                "agent": agent_id,
                "prompt": prompt,
                "results": results,
                "total_symbols": len(results),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        else:
            output = {"agent": agent_id, "status": "no_work", "message": "No agent_id or prompt_template provided"}

        SwarmStore.save_artifact(run_id, task_id, output)
        SwarmStore.update_task_status(run_id, task_id, "completed")
        _task_results[task_id] = output

    except Exception as e:
        logger.exception("Task %s failed", task_id)
        SwarmStore.update_task_status(run_id, task_id, "failed")
        _task_results[task_id] = {"error": str(e)}


async def _execute_run_tasks(run_id: str):
    tasks = SwarmStore.load_all_tasks(run_id)
    for task in tasks:
        if task.get("status") == "pending":
            deps = task.get("depends_on", [])
            if deps:
                all_done = all(
                    any(t.get("id") == dep and t.get("status") == "completed" for t in tasks)
                    for dep in deps
                )
                if not all_done:
                    continue
            await _execute_task(
                run_id, task["id"],
                task.get("agent_id", ""),
                task.get("prompt_template", ""),
            )
    SwarmStore.update_run_status(run_id, "completed")

router = APIRouter(prefix="/swarm", tags=["swarm"])


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
async def create_run(req: CreateRunRequest, background_tasks: BackgroundTasks):
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
async def create_task(run_id: str, req: CreateTaskRequest, background_tasks: BackgroundTasks):
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
    SwarmStore.update_run_status(run_id, "running")
    background_tasks.add_task(_execute_task, run_id, task["id"], req.agent_id, req.prompt_template)
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
