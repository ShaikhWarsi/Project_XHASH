from __future__ import annotations

import uuid
import logging
from typing import Any

from fastapi import APIRouter, HTTPException

from api.services.workflow import WorkflowGraph, WorkflowState, build_default_workflow

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


@router.post("/run")
async def run_workflow(symbol: str):
    wf = build_default_workflow()
    wid = f"wf_{uuid.uuid4().hex[:12]}"
    result = await wf.run(wid, symbol)
    return {
        "workflow_id": wid,
        "symbol": symbol,
        "status": result.status,
        "consensus": result.consensus,
        "consensus_confidence": round(result.consensus_confidence, 3),
        "error": result.error,
        "steps": {
            name: {
                "role": s.role,
                "confidence": s.confidence,
                "reflection": s.reflection,
                "output": s.output,
            }
            for name, s in result.steps.items()
        },
    }


@router.post("/custom")
async def run_custom_workflow(symbol: str, nodes: list[str]):
    available = {
        "bull_researcher": __import__("api.services.workflow.graph", fromlist=["researcher_bull"]).researcher_bull,
        "bear_researcher": __import__("api.services.workflow.graph", fromlist=["researcher_bear"]).researcher_bear,
        "risk_debater": __import__("api.services.workflow.graph", fromlist=["risk_debater"]).risk_debater,
        "reflector": __import__("api.services.workflow.graph", fromlist=["reflection_layer"]).reflection_layer,
    }
    wf = WorkflowGraph()
    for name in nodes:
        fn = available.get(name)
        if fn:
            wf.add_node(name, fn)
    prev = None
    for name in nodes:
        if prev:
            wf.add_edge(prev, name, "always")
        prev = name
    wid = f"wf_{uuid.uuid4().hex[:12]}"
    result = await wf.run(wid, symbol)
    return {
        "workflow_id": wid,
        "symbol": symbol,
        "status": result.status,
        "consensus": result.consensus,
        "consensus_confidence": round(result.consensus_confidence, 3),
        "steps": {n: {"confidence": s.confidence, "reflection": s.reflection} for n, s in result.steps.items()},
    }


@router.get("/list")
async def list_workflows():
    return {"workflows": WorkflowGraph.list_workflows()}


@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str):
    wf = WorkflowGraph.load(workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf
