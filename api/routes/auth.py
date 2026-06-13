from __future__ import annotations

import hashlib
import logging
import os
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from persistence import get_session

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login")
async def login(req: LoginRequest, session: AsyncSession = Depends(get_session)):
    admin_user = os.environ.get("AUTH_USER", "admin")
    admin_pass = os.environ.get("AUTH_PASSWORD", "")

    if req.username != admin_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if admin_pass:
        import hashlib
        stored_hash = os.environ.get("AUTH_PASSWORD_HASH", "")
        if stored_hash:
            input_hash = hashlib.sha256(req.password.encode()).hexdigest()
            if input_hash != stored_hash:
                raise HTTPException(status_code=401, detail="Invalid credentials")
        elif req.password != admin_pass:
            raise HTTPException(status_code=401, detail="Invalid credentials")

    from api.auth.agent_auth import agent_required, generate_token
    token = generate_token()
    await session.commit()

    return TokenResponse(access_token=token)


@router.get("/me")
async def get_current_user(token: str = ""):
    from api.auth.agent_auth import agent_required
    try:
        agent = agent_required(token)
        return {"username": agent.get("username", "admin"), "scopes": agent.get("scopes", ["read"])}
    except Exception:
        logger.warning("Auth token validation failed", exc_info=True)
        raise HTTPException(status_code=401, detail="Invalid or expired token")
