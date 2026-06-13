from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from api.services.market_calendar_service import get_timings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/openalgo/market-timings", tags=["openalgo"])


@router.post("/")
async def timings(request: Request):
    try:
        data = await request.json()
        date_str = data.get("date")
        success, response_data, status_code = get_timings(date_str)
        if not success:
            raise HTTPException(status_code=status_code, detail=response_data)
        return response_data
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Market timings failed: %s", e)
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})
