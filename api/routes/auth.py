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
    auth_password_hash = os.environ.get("AUTH_PASSWORD_HASH", "")

    if not admin_pass and not auth_password_hash:
        raise HTTPException(status_code=503, detail="Authentication not configured. Set AUTH_PASSWORD or AUTH_PASSWORD_HASH environment variables.")

    if req.username != admin_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if auth_password_hash:
        import hashlib
        input_hash = hashlib.sha256(req.password.encode()).hexdigest()
        if input_hash != auth_password_hash:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    elif req.password != admin_pass:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    from api.auth.agent_auth import generate_token
    full_token, prefix, key_hash = generate_token()
    await session.commit()

    return TokenResponse(access_token=full_token)


@router.post("/rotate-key")
async def rotate_api_key(request):
    from api.auth.agent_auth import generate_token
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""
    if not token:
        token = request.query_params.get("token", "")
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        from api.auth.pepper_auth import verify_api_key
        if not verify_api_key(token):
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        full_token, prefix, key_hash = generate_token()
        return TokenResponse(access_token=full_token)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.get("/me")
async def get_current_user(request):
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""
    if not token:
        token = request.query_params.get("token", "")
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        from api.auth.pepper_auth import verify_api_key
        if not verify_api_key(token):
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return {"username": "admin", "scopes": ["read", "write"]}
    except HTTPException:
        raise
    except Exception:
        logger.warning("Auth token validation failed", exc_info=True)
        raise HTTPException(status_code=401, detail="Invalid or expired token")
