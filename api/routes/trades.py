from __future__ import annotations

from fastapi import APIRouter, Query

from api.state import app_state

router = APIRouter(prefix="/trades", tags=["trades"])


@router.get("")
async def get_trades(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    trades = await app_state.async_get_trades() or []
    return trades[offset:offset + limit]
