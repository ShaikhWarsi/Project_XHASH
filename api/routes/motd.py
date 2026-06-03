from __future__ import annotations
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.services.motd_service import get_motd, update_motd

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/motd", tags=["motd"])


class MotdUpdate(BaseModel):
    message: str
    type: str = "info"
    active: bool = True


@router.get("")
async def motd_get():
    try:
        return get_motd()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def motd_post(body: MotdUpdate):
    try:
        return update_motd(body.message, body.type, body.active)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
