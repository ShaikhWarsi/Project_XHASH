from __future__ import annotations

import json
from typing import Optional

from fastapi import Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.agent_scopes import SCOPE_R
from api.auth.agent_auth import agent_required, AgentTokenData, write_audit_log
from api.agent_jobs import get_job, list_jobs, stream_progress
from api.routes.agent import agent_v1
from persistence.database import get_session


@agent_v1.get("/jobs")
async def list_agent_jobs(
    kind: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_session),
    token: AgentTokenData = Depends(agent_required),
):
    jobs = await list_jobs(user_id=token.user_id, kind=kind, limit=limit, db=db)
    return {"jobs": jobs, "total": len(jobs)}


@agent_v1.get("/jobs/{job_id}")
async def get_agent_job(
    job_id: str,
    db: AsyncSession = Depends(get_session),
    token: AgentTokenData = Depends(agent_required),
):
    job = await get_job(job_id=job_id, user_id=token.user_id, db=db)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@agent_v1.get("/jobs/{job_id}/stream")
async def stream_agent_job(
    job_id: str,
    since_seq: int = Query(0),
    db: AsyncSession = Depends(get_session),
    token: AgentTokenData = Depends(agent_required),
):
    job = await get_job(job_id=job_id, user_id=token.user_id, db=db)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        async for event in stream_progress(job_id, since_seq=since_seq):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
