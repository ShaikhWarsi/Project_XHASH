from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from api.services.flow_db import (
    activate_workflow, add_execution_log, create_workflow, deactivate_workflow,
    delete_workflow, get_executions, get_workflow, get_workflow_by_webhook_token,
    list_workflows, update_workflow,
)
from api.services.flow_executor_service import execute_workflow
from api.services.flow_scheduler_service import schedule_workflow, unschedule_workflow

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/openalgo/flow", tags=["openalgo_flow"])


@router.get("/workflows")
async def api_list_workflows():
    return list_workflows()


@router.post("/workflows")
async def api_create_workflow(request: Request):
    data = await request.json()
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    wf = create_workflow(name, data.get("description", ""))
    return wf


@router.get("/workflows/{workflow_id}")
async def api_get_workflow(workflow_id: str):
    wf = get_workflow(workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


@router.put("/workflows/{workflow_id}")
async def api_update_workflow(workflow_id: str, request: Request):
    data = await request.json()
    wf = update_workflow(workflow_id, data)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


@router.delete("/workflows/{workflow_id}")
async def api_delete_workflow(workflow_id: str):
    await unschedule_workflow(workflow_id)
    if not delete_workflow(workflow_id):
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"status": "success"}


@router.post("/workflows/{workflow_id}/activate")
async def api_activate_workflow(workflow_id: str, request: Request):
    data = await request.json()
    trigger_type = data.get("trigger_type", "manual")
    api_key = data.get("api_key")
    schedule_config = data.get("schedule_config")
    price_alert_config = data.get("price_alert_config")
    wf = activate_workflow(workflow_id, api_key, trigger_type, schedule_config, price_alert_config)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if trigger_type == "schedule" and schedule_config:
        await schedule_workflow(workflow_id, schedule_config)
    return {"status": "success", "webhook_token": wf.get("webhook_token")}


@router.post("/workflows/{workflow_id}/deactivate")
async def api_deactivate_workflow(workflow_id: str):
    await unschedule_workflow(workflow_id)
    wf = deactivate_workflow(workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"status": "success"}


@router.post("/workflows/{workflow_id}/execute")
async def api_execute_workflow(workflow_id: str, request: Request):
    wf = get_workflow(workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    try:
        body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    except Exception:
        logger.debug("Failed to parse JSON body for flow execute, using empty")
        body = {}
    result = await execute_workflow(wf, webhook_data=body)
    return result


@router.get("/workflows/{workflow_id}/executions")
async def api_get_executions(workflow_id: str):
    return get_executions(workflow_id)


@router.post("/webhook/{token}")
async def api_webhook(token: str, request: Request):
    wf = get_workflow_by_webhook_token(token)
    if not wf:
        raise HTTPException(status_code=404, detail="Invalid webhook token")
    try:
        payload = await request.json() if request.headers.get("content-type") == "application/json" else {}
    except Exception:
        logger.debug("Failed to parse webhook payload JSON, using empty")
        payload = {}
    result = await execute_workflow(wf, webhook_data=payload)
    return result
