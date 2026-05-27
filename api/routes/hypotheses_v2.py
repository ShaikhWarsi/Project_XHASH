from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from analytics.hypothesis.registry import HypothesisRegistry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hypotheses/v2", tags=["hypotheses-v2"])

registry = HypothesisRegistry()


class CreateHypothesisRequest(BaseModel):
    title: str
    description: str
    tags: Optional[list[str]] = None


class UpdateStatusRequest(BaseModel):
    status: str


class LinkBacktestRequest(BaseModel):
    backtest_id: str


@router.get("/")
async def list_hypotheses(status: Optional[str] = None):
    try:
        hypotheses = registry.list(status=status)
        return {"hypotheses": hypotheses}
    except Exception as e:
        logger.error(f"Error listing hypotheses: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def create_hypothesis(request: CreateHypothesisRequest):
    try:
        hypothesis = registry.create(
            title=request.title,
            description=request.description,
            tags=request.tags,
        )
        return {"hypothesis": hypothesis}
    except Exception as e:
        logger.error(f"Error creating hypothesis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{hypothesis_id}")
async def get_hypothesis(hypothesis_id: str):
    hypothesis = registry.get(hypothesis_id)
    if not hypothesis:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    return {"hypothesis": hypothesis}


@router.put("/{hypothesis_id}/status")
async def update_hypothesis_status(
    hypothesis_id: str,
    request: UpdateStatusRequest,
):
    hypothesis = registry.update_status(hypothesis_id, request.status)
    if not hypothesis:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    return {"hypothesis": hypothesis}


@router.post("/{hypothesis_id}/backtest")
async def link_backtest(
    hypothesis_id: str,
    request: LinkBacktestRequest,
):
    hypothesis = registry.link_backtest(hypothesis_id, request.backtest_id)
    if not hypothesis:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    return {"hypothesis": hypothesis}


@router.get("/search")
async def search_hypotheses(q: str):
    try:
        results = registry.search(q)
        return {"hypotheses": results}
    except Exception as e:
        logger.error(f"Error searching hypotheses: {e}")
        raise HTTPException(status_code=500, detail=str(e))
