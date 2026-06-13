from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from api.services.option_greeks_service import get_multi_option_greeks

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/openalgo/multi-option-greeks", tags=["openalgo"])


@router.post("/")
async def multi_option_greeks(request: Request):
    try:
        data = await request.json()
        symbols = data.get("symbols", [])
        interest_rate = data.get("interest_rate")
        success, response_data, status_code = get_multi_option_greeks(symbols, interest_rate)
        if not success:
            raise HTTPException(status_code=status_code, detail=response_data)
        return response_data
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Multi option greeks failed: %s", e)
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})
