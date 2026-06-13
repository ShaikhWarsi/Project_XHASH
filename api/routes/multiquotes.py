from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from api.services.quotes_service import get_multiquotes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/openalgo/multiquotes", tags=["openalgo"])


@router.post("/")
async def multiquotes(request: Request):
    try:
        data = await request.json()
        symbols = data.get("symbols", [])
        success, response_data, status_code = get_multiquotes(symbols)
        if not success:
            raise HTTPException(status_code=status_code, detail=response_data)
        return response_data
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Multiquotes failed: %s", e)
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})
