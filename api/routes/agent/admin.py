from __future__ import annotations

import json
from datetime import datetime
from typing import Optional

from fastapi import Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.agent_scopes import generate_token, parse_scopes
from api.routes.agent import agent_v1
from persistence.database import get_session
from persistence.models import AgentToken, AgentAudit
from pydantic import BaseModel


class CreateTokenRequest(BaseModel):
    user_id: int
    name: str
    scopes: str = "R"
    markets: str = "*"
    instruments: str = "*"
    paper_only: bool = True
    rate_limit_per_min: int = 60
    expires_at: Optional[str] = None


@agent_v1.post("/admin/tokens")
async def create_token(
    body: CreateTokenRequest,
    db: AsyncSession = Depends(get_session),
):
    full_token, prefix, token_hash = generate_token()

    expires_at = None
    if body.expires_at:
        try:
            expires_at = datetime.fromisoformat(body.expires_at)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid expires_at format")

    scopes_set = parse_scopes(body.scopes)
    scopes_str = ",".join(sorted(scopes_set))

    token = AgentToken(
        user_id=body.user_id,
        name=body.name,
        token_prefix=prefix,
        token_hash=token_hash,
        scopes=scopes_str,
        markets=body.markets,
        instruments=body.instruments,
        paper_only=body.paper_only,
        rate_limit_per_min=body.rate_limit_per_min,
        expires_at=expires_at,
    )
    db.add(token)
    await db.commit()
    await db.refresh(token)

    return {
        "token": full_token,
        "prefix": prefix,
        "id": token.id,
        "name": token.name,
        "scopes": scopes_str,
        "paper_only": token.paper_only,
    }


@agent_v1.get("/admin/tokens")
async def list_tokens(
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(AgentToken).order_by(AgentToken.created_at.desc())
    )
    rows = result.scalars().all()
    return {
        "tokens": [
            {
                "id": t.id,
                "user_id": t.user_id,
                "name": t.name,
                "token_prefix": t.token_prefix,
                "scopes": t.scopes,
                "paper_only": t.paper_only,
                "status": t.status,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "last_used_at": t.last_used_at.isoformat() if t.last_used_at else None,
            }
            for t in rows
        ],
        "total": len(rows),
    }


@agent_v1.delete("/admin/tokens/{token_id}")
async def delete_token(
    token_id: int,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(AgentToken).where(AgentToken.id == token_id))
    token = result.scalar_one_or_none()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    await db.delete(token)
    await db.commit()
    return {"status": "deleted", "id": token_id}


@agent_v1.get("/admin/audit")
async def list_audit(
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(AgentAudit).order_by(AgentAudit.created_at.desc()).limit(limit)
    )
    rows = result.scalars().all()
    return {
        "entries": [
            {
                "id": a.id,
                "user_id": a.user_id,
                "agent_name": a.agent_name,
                "route": a.route,
                "method": a.method,
                "scope_class": a.scope_class,
                "status_code": a.status_code,
                "duration_ms": a.duration_ms,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in rows
        ],
        "total": len(rows),
    }
