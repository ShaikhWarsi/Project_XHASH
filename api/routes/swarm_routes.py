from __future__ import annotations

import asyncio
import logging
import string
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from api.services.swarm.store import SwarmStore
from copy import deepcopy

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/swarm", tags=["swarm"])

_task_results: dict[str, dict[str, Any]] = {}
_reaper_task: asyncio.Task | None = None


async def _reaper_loop():
    while True:
        try:
            SwarmStore.reap_stale_runs()
        except Exception as e:
            logger.warning("Reaper error: %s", e)
        await asyncio.sleep(300)


@router.on_event("startup")
async def _start_reaper():
    global _reaper_task
    if _reaper_task is None:
        _reaper_task = asyncio.create_task(_reaper_loop())


async def _execute_task(run_id: str, task_id: str, agent_id: str, prompt_template: str):
    try:
        SwarmStore.update_task_status(run_id, task_id, "running")

        if agent_id and prompt_template:
            prompt = string.Template(prompt_template).safe_substitute(run_id=run_id, task_id=task_id)

            symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"]
            results = []

            try:
                from agents.hedge_fund.orchestrator import HedgeFundOrchestrator
                from llm.client import LLMClient
                llm = LLMClient()
                orchestrator = HedgeFundOrchestrator(llm_client=llm, analysts=[agent_id] if agent_id != "all" else None)
                use_agent = True
            except Exception:
                logger.warning("HedgeFundOrchestrator not available, falling back to data crawl")
                use_agent = False

            # Batch data fetch — one yfinance download call instead of per-symbol
            import pandas as pd
            import yfinance as yf
            batch_df = await asyncio.to_thread(lambda: yf.download(symbols, period="1mo", group_by="ticker", progress=False))
            data_batch = {}
            if not batch_df.empty:
                for sym in symbols:
                    try:
                        if isinstance(batch_df.columns, pd.MultiIndex) and sym in batch_df.columns.levels[0]:
                            data_batch[sym] = batch_df[sym]
                        elif sym in batch_df.columns:
                            data_batch[sym] = batch_df
                        info_batch = await asyncio.to_thread(
                            lambda: {s: yf.Ticker(s).info for s in symbols}
                        ) if len(symbols) <= 5 else {}
                    except Exception:
                        logger.debug("Failed to fetch info batch for symbol")

            for symbol in symbols:
                try:
                    df = data_batch.get(symbol, pd.DataFrame())
                    info = (info_batch or {}).get(symbol, {})

                    price = info.get("currentPrice") or info.get("regularMarketPrice") or 0.0
                    if isinstance(price, float) and (pd.isna(price) or price == 0.0) and not df.empty:
                        price = float(df["Close"].iloc[-1]) if "Close" in df.columns else 0.0
                    change_pct = info.get("regularMarketChangePercent", 0.0) or 0.0
                    if change_pct == 0.0 and not df.empty and "Close" in df.columns:
                        change_pct = float(df["Close"].pct_change().iloc[-1] * 100)

                    entry = {
                        "symbol": symbol,
                        "price": round(float(price), 2),
                        "change_pct": round(float(change_pct), 2),
                        "market_cap": info.get("marketCap"),
                        "pe_ratio": info.get("trailingPE"),
                        "sector": info.get("sector"),
                        "volume": int(df["Volume"].sum()) if not df.empty and "Volume" in df.columns else 0,
                    }

                    if use_agent and not df.empty:
                        deliberation = await asyncio.to_thread(
                            lambda: orchestrator.deliberate(
                                ticker=symbol,
                                portfolio_value=1000000.0,
                                price_data=df,
                            )
                        )
                        entry["deliberation"] = deliberation.get("consensus") if deliberation else None
                        entry["confidence"] = deliberation.get("confidence") if deliberation else None
                        entry["analyst_signals"] = deliberation.get("analyst_signals", []) if deliberation else []

                    results.append(entry)
                except Exception as e:
                    logger.debug("Swarm agent task failed for %s: %s", symbol, e)
                    results.append({"symbol": symbol, "error": str(e)[:100]})
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


_run_execution_triggers: set[str] = set()


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
    if run_id not in _run_execution_triggers:
        _run_execution_triggers.add(run_id)
        background_tasks.add_task(_execute_run_tasks, run_id)
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


@router.post("/runs/{run_id}/replay")
async def replay_run(run_id: str, background_tasks: BackgroundTasks):
    run = SwarmStore.load_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    new_run_id = f"replay_{uuid.uuid4().hex[:12]}"
    tasks = SwarmStore.load_all_tasks(run_id)
    if not tasks:
        raise HTTPException(status_code=400, detail="No tasks to replay")

    new_run = SwarmStore.create_run(
        new_run_id,
        preset_name=f"replay_{run.get('preset_name', 'unknown')}",
        user_vars=run.get("user_vars"),
    )

    for task in tasks:
        new_task = deepcopy(task)
        new_task["id"] = f"task_{uuid.uuid4().hex[:8]}"
        new_task["run_id"] = new_run_id
        new_task["status"] = "pending"
        SwarmStore.save_task(new_run_id, new_task)

    SwarmStore.update_run_status(new_run_id, "running")
    background_tasks.add_task(_execute_run_tasks, new_run_id)

    return {
        "original_run_id": run_id,
        "replay_run_id": new_run_id,
        "tasks_replayed": len(tasks),
    }


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
