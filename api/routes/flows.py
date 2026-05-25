from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.schemas import (
    ErrorResponse,
    FlowCreateRequest,
    FlowResponse,
    FlowSummaryResponse,
    FlowUpdateRequest,
    GraphNodeData,
)
from persistence import HedgeFundFlow, get_session

logger = logging.getLogger(__name__)


def _validate_node_data(data: dict | GraphNodeData) -> dict:
    if isinstance(data, GraphNodeData):
        data = data.model_dump(exclude_none=True)
    allowed_keys = {"ticker", "agent_key", "label", "description", "icon", "status", "type", "tickers", "startDate", "endDate", "initialCash"}
    return {k: v for k, v in data.items() if k in allowed_keys and isinstance(v, (str, int, float, bool, type(None)))}


router = APIRouter(prefix="/flows", tags=["flows"])


@router.post("/", response_model=FlowResponse, responses={400: {"model": ErrorResponse}})
async def create_flow(request: FlowCreateRequest, db: AsyncSession = Depends(get_session)):
    try:
        flow = HedgeFundFlow(
            name=request.name,
            description=request.description or "",
            tickers=json.dumps([_validate_node_data(n.data).get("ticker") for n in request.nodes if _validate_node_data(n.data).get("ticker")]),
            agents=json.dumps([_validate_node_data(n.data).get("agent_key") for n in request.nodes if _validate_node_data(n.data).get("agent_key")]),
            config_json=json.dumps({
                "nodes": [n.model_dump() for n in request.nodes],
                "edges": [e.model_dump() for e in request.edges],
                "viewport": request.viewport,
                "data": request.data,
                "tags": request.tags or [],
            }),
            is_active=1,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(flow)
        await db.commit()
        await db.refresh(flow)
        return _flow_to_response(flow)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[FlowSummaryResponse])
async def get_flows(
    db: AsyncSession = Depends(get_session),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    result = await db.execute(
        select(HedgeFundFlow).order_by(HedgeFundFlow.updated_at.desc()).offset(offset).limit(limit)
    )
    flows = result.scalars().all()
    return [
        FlowSummaryResponse(
            id=f.id,
            name=f.name,
            description=f.description,
            is_template=False,
            created_at=f.created_at,
            updated_at=f.updated_at,
        )
        for f in flows
    ]


@router.get("/{flow_id}", response_model=FlowResponse)
async def get_flow(flow_id: int, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(HedgeFundFlow).where(HedgeFundFlow.id == flow_id))
    flow = result.scalar_one_or_none()
    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")
    return _flow_to_response(flow)


@router.put("/{flow_id}", response_model=FlowResponse)
async def update_flow(flow_id: int, request: FlowUpdateRequest, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(HedgeFundFlow).where(HedgeFundFlow.id == flow_id))
    flow = result.scalar_one_or_none()
    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")

    try:
        if request.name is not None:
            flow.name = request.name
        if request.description is not None:
            flow.description = request.description
        if request.nodes is not None:
            flow.tickers = json.dumps([_validate_node_data(n.data).get("ticker") for n in request.nodes if _validate_node_data(n.data).get("ticker")])
            flow.agents = json.dumps([_validate_node_data(n.data).get("agent_key") for n in request.nodes if _validate_node_data(n.data).get("agent_key")])
        if request.nodes is not None or request.edges is not None or request.viewport is not None or request.data is not None:
            config = json.loads(flow.config_json) if flow.config_json else {}
            if request.nodes is not None:
                config["nodes"] = [n.model_dump() for n in request.nodes]
            if request.edges is not None:
                config["edges"] = [e.model_dump() for e in request.edges]
            if request.viewport is not None:
                config["viewport"] = request.viewport
            if request.data is not None:
                config["data"] = request.data
            flow.config_json = json.dumps(config)
        flow.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(flow)
        return _flow_to_response(flow)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{flow_id}")
async def delete_flow(flow_id: int, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(HedgeFundFlow).where(HedgeFundFlow.id == flow_id))
    flow = result.scalar_one_or_none()
    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")
    await db.delete(flow)
    await db.commit()
    return {"message": "Flow deleted"}


def _flow_to_response(flow: HedgeFundFlow) -> FlowResponse:
    config = json.loads(flow.config_json) if flow.config_json else {}
    return FlowResponse(
        id=flow.id,
        name=flow.name,
        description=flow.description,
        nodes=config.get("nodes", []),
        edges=config.get("edges", []),
        viewport=config.get("viewport"),
        data=config.get("data"),
        tags=config.get("tags"),
        created_at=flow.created_at,
        updated_at=flow.updated_at,
    )
