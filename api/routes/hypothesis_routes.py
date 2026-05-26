from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from api.services.hypotheses.registry import HypothesisRegistry

logger = logging.getLogger(__name__)

_execution_results: dict[str, dict[str, Any]] = {}


async def _execute_hypothesis(hypothesis_id: str):
    try:
        h = HypothesisRegistry.get(hypothesis_id)
        if not h:
            return

        result = {
            "status": "running",
            "hypothesis_id": hypothesis_id,
            "started_at": time.time(),
            "completed_at": None,
            "findings": [],
            "error": None,
        }
        _execution_results[hypothesis_id] = result

        thesis = h.get("thesis", "")
        universe = h.get("universe", "")
        signal_def = h.get("signal_definition", "")

        import yfinance as yf
        import pandas as pd

        symbols = [s.strip() for s in (universe or "SPY,QQQ").split(",") if s.strip()]
        findings = []

        for symbol in symbols[:5]:
            try:
                ticker = yf.Ticker(symbol)
                df = ticker.history(period="1y")
                if df.empty:
                    continue

                current_price = float(df["Close"].iloc[-1])
                prev_price = float(df["Close"].iloc[0])
                ret = (current_price - prev_price) / prev_price * 100
                volatility = float(df["Close"].pct_change().std() * (252 ** 0.5) * 100)

                findings.append({
                    "symbol": symbol,
                    "current_price": round(current_price, 2),
                    "return_pct": round(ret, 2),
                    "volatility_pct": round(volatility, 2),
                    "thesis_match": "positive" if ret > 0 else "negative",
                })
                await asyncio.sleep(0.1)
            except Exception as e:
                findings.append({"symbol": symbol, "error": str(e)})

        result["status"] = "completed"
        result["completed_at"] = time.time()
        result["findings"] = findings
        result["summary"] = f"Analyzed {len(findings)}/{len(symbols)} symbols for hypothesis '{h.get('title', hypothesis_id)}'"

        hypothesis_data = h.copy()
        hypothesis_data["last_run"] = result
        HypothesisRegistry.update(hypothesis_id, {"last_run": result})
    except Exception as e:
        _execution_results[hypothesis_id] = {"status": "failed", "error": str(e)}

router = APIRouter(prefix="/hypotheses", tags=["hypotheses"])


class CreateHypothesisRequest(BaseModel):
    title: str
    thesis: str
    universe: str = ""
    signal_definition: str = ""
    data_sources: list[str] | None = None
    skills: list[str] | None = None


class UpdateHypothesisRequest(BaseModel):
    title: str | None = None
    thesis: str | None = None
    status: str | None = None
    universe: str | None = None
    signal_definition: str | None = None
    invalidation_notes: str | None = None
    data_sources: list[str] | None = None
    skills: list[str] | None = None


class LinkBacktestRequest(BaseModel):
    run_card_path: str = ""
    backtest_run_dir: str = ""
    metrics: dict[str, Any] | None = None
    notes: str = ""


class AddBacktestResultRequest(BaseModel):
    result: dict[str, Any]


@router.get("/")
async def list_hypotheses(search: str = "", status: str = ""):
    if search or status:
        results = HypothesisRegistry.search(query=search, status=status)
    else:
        results = HypothesisRegistry.list()
    return {"hypotheses": results}


@router.post("/")
async def create_hypothesis(req: CreateHypothesisRequest):
    h = HypothesisRegistry.create(
        title=req.title,
        thesis=req.thesis,
        universe=req.universe,
        signal_definition=req.signal_definition,
        data_sources=req.data_sources,
        skills=req.skills,
    )
    return h


@router.get("/{hypothesis_id}")
async def get_hypothesis(hypothesis_id: str):
    h = HypothesisRegistry.get(hypothesis_id)
    if not h:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    return h


@router.patch("/{hypothesis_id}")
async def update_hypothesis(hypothesis_id: str, req: UpdateHypothesisRequest):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    h = HypothesisRegistry.update(hypothesis_id, updates)
    if not h:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    return h


@router.delete("/{hypothesis_id}")
async def delete_hypothesis(hypothesis_id: str):
    ok = HypothesisRegistry.delete(hypothesis_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    return {"status": "deleted"}


@router.post("/{hypothesis_id}/link-backtest")
async def link_backtest(hypothesis_id: str, req: LinkBacktestRequest):
    h = HypothesisRegistry.link_backtest(
        hypothesis_id,
        run_card_path=req.run_card_path,
        backtest_run_dir=req.backtest_run_dir,
        metrics=req.metrics,
        notes=req.notes,
    )
    if not h:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    return h


@router.post("/{hypothesis_id}/backtest-results")
async def add_backtest_result(hypothesis_id: str, req: AddBacktestResultRequest):
    h = HypothesisRegistry.add_backtest_result(hypothesis_id, req.result)
    if not h:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    return h


@router.post("/{hypothesis_id}/run")
async def run_hypothesis(hypothesis_id: str, background_tasks: BackgroundTasks):
    h = HypothesisRegistry.get(hypothesis_id)
    if not h:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    run_id = f"run_{hypothesis_id}_{__import__('time').time():.0f}"
    background_tasks.add_task(_execute_hypothesis, hypothesis_id)
    return {
        "status": "started",
        "hypothesis_id": hypothesis_id,
        "run_id": run_id,
        "message": f"Hypothesis '{h.get('title', hypothesis_id)}' queued for execution",
    }


@router.get("/{hypothesis_id}/result")
async def get_hypothesis_result(hypothesis_id: str):
    result = _execution_results.get(hypothesis_id)
    if not result:
        return {"status": "not_started", "hypothesis_id": hypothesis_id}
    return result


@router.post("/{hypothesis_id}/invalidate")
async def invalidate_hypothesis(hypothesis_id: str, notes: str = ""):
    h = HypothesisRegistry.invalidate(hypothesis_id, notes)
    if not h:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    return h
