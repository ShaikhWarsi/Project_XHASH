from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from agents.memory import AgentMemoryStore

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memory", tags=["memory"])

_store = AgentMemoryStore()


@router.post("/create")
async def create_memory(agent_id: str, session_id: str):
    memory = _store.create_memory(agent_id, session_id)
    return {"agent_id": memory.agent_id, "session_id": memory.session_id, "created_at": str(memory.created_at)}


@router.get("/sessions")
async def list_sessions(agent_id: str = Query(...)):
    sessions = _store.list_sessions(agent_id)
    return {"agent_id": agent_id, "sessions": sessions}


@router.get("/get")
async def get_memory(agent_id: str = Query(...), session_id: str = Query(...)):
    memory = _store.get_memory(agent_id, session_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    from dataclasses import asdict
    return asdict(memory)


@router.post("/reflect")
async def add_reflection(
    agent_id: str = Query(...),
    session_id: str = Query(...),
    content: str = Query(...),
):
    memory = _store.add_reflection(agent_id, session_id, {"content": content})
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"status": "ok"}


@router.post("/delete")
async def delete_memory(agent_id: str = Query(...), session_id: str = Query(...)):
    ok = _store.delete_memory(agent_id, session_id)
    return {"deleted": ok}
