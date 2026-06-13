from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from api.services.market_calendar_service import get_holidays

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/openalgo/market-holidays", tags=["openalgo"])


@router.post("/")
async def holidays(request: Request):
    try:
        data = await request.json()
        year = data.get("year")
        if year is None:
            from datetime import datetime
            year = datetime.now().year
        year = int(year)
        success, response_data, status_code = get_holidays(year)
        if not success:
            raise HTTPException(status_code=status_code, detail=response_data)
        return response_data
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Market holidays failed: %s", e)
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})
