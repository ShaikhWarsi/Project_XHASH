from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from api.services.gtt_service import cancel_gtt, get_gtt_orderbook, modify_gtt, place_gtt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/openalgo/gtt", tags=["openalgo_gtt"])


@router.post("/place")
async def place_gtt_order(request: Request):
    try:
        data = await request.json()
        success, response_data, status_code = await place_gtt(data)
        if not success:
            raise HTTPException(status_code=status_code, detail=response_data)
        return response_data
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Place GTT failed: %s", e)
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.post("/modify")
async def modify_gtt_order(request: Request):
    try:
        data = await request.json()
        success, response_data, status_code = await modify_gtt(data)
        if not success:
            raise HTTPException(status_code=status_code, detail=response_data)
        return response_data
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Modify GTT failed: %s", e)
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.post("/cancel")
async def cancel_gtt_order(request: Request):
    try:
        data = await request.json()
        trigger_id = data.get("trigger_id", "")
        success, response_data, status_code = await cancel_gtt(trigger_id)
        if not success:
            raise HTTPException(status_code=status_code, detail=response_data)
        return response_data
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Cancel GTT failed: %s", e)
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.post("/orderbook")
async def gtt_orderbook(request: Request):
    try:
        success, response_data, status_code = await get_gtt_orderbook()
        if not success:
            raise HTTPException(status_code=status_code, detail=response_data)
        return {"status": "success", "data": response_data}
    except Exception as e:
        logger.exception("GTT orderbook failed: %s", e)
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})
