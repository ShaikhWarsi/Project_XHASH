from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.services.hypotheses.registry import HypothesisRegistry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/hypotheses", tags=["hypotheses"])


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


@router.post("/{hypothesis_id}/invalidate")
async def invalidate_hypothesis(hypothesis_id: str, notes: str = ""):
    h = HypothesisRegistry.invalidate(hypothesis_id, notes)
    if not h:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    return h
