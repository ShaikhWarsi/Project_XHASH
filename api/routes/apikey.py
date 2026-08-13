from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from persistence.models_auth import ApiKeys
from persistence.multi_db import get_auth_db
from api.auth.pepper_auth import generate_api_key, invalidate_user_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/apikey", tags=["apikey"])


def _extract_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return request.query_params.get("token", "")


async def _verify_requester(request: Request):
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Missing authentication")
    from api.auth.pepper_auth import verify_api_key
    if not verify_api_key(token):
        raise HTTPException(status_code=401, detail="Invalid authentication token")


class GenerateRequest(BaseModel):
    user_id: str


class RevokeRequest(BaseModel):
    user_id: str


class OrderModeRequest(BaseModel):
    user_id: str
    mode: str


@router.post("/generate")
async def generate_api_key_endpoint(
    req: GenerateRequest,
    request: Request,
    session: AsyncSession = Depends(get_auth_db),
):
    await _verify_requester(request)
    raw_key, key_hash, key_encrypted = generate_api_key(req.user_id)

    result = await session.execute(
        select(ApiKeys).where(ApiKeys.user_id == req.user_id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.api_key_hash = key_hash
        existing.api_key_encrypted = key_encrypted
    else:
        api_key = ApiKeys(
            user_id=req.user_id,
            api_key_hash=key_hash,
            api_key_encrypted=key_encrypted,
        )
        session.add(api_key)

    await session.commit()
    invalidate_user_cache(req.user_id)

    return {
        "status": "success",
        "message": "API key generated successfully",
        "data": {"api_key": raw_key, "user_id": req.user_id},
    }


@router.post("/revoke")
async def revoke_api_key_endpoint(
    req: RevokeRequest,
    request: Request,
    session: AsyncSession = Depends(get_auth_db),
):
    await _verify_requester(request)
    result = await session.execute(
        select(ApiKeys).where(ApiKeys.user_id == req.user_id)
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    await session.delete(api_key)
    await session.commit()
    invalidate_user_cache(req.user_id)

    return {"status": "success", "message": "API key revoked"}


@router.post("/order_mode")
async def set_order_mode_endpoint(
    req: OrderModeRequest,
    request: Request,
    session: AsyncSession = Depends(get_auth_db),
):
    await _verify_requester(request)
    if req.mode not in ("auto", "semi_auto"):
        raise HTTPException(status_code=400, detail="Mode must be 'auto' or 'semi_auto'")

    result = await session.execute(
        select(ApiKeys).where(ApiKeys.user_id == req.user_id)
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    api_key.order_mode = req.mode
    await session.commit()
    invalidate_user_cache(req.user_id)

    return {"status": "success", "message": f"Order mode set to '{req.mode}'", "data": {"mode": req.mode}}


@router.get("/mode/{user_id}")
async def get_order_mode_endpoint(
    user_id: str,
    session: AsyncSession = Depends(get_auth_db),
):
    result = await session.execute(
        select(ApiKeys.order_mode).where(ApiKeys.user_id == user_id)
    )
    mode = result.scalar_one_or_none()
    return {"status": "success", "data": {"user_id": user_id, "mode": mode or "auto"}}
