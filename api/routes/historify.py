from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from api.services.historify_service import (
    download_data,
    get_ohlcv,
    get_watchlist,
    add_to_watchlist,
    remove_from_watchlist,
    export_csv,
    list_jobs,
    cancel_job,
)
from api.services.historify_scheduler_service import (
    schedule_download as sched_schedule_download,
    list_schedules as sched_list_schedules,
    remove_schedule as sched_remove_schedule,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/openalgo/historify", tags=["historify"])


class DownloadRequest(BaseModel):
    symbol: str
    exchange: str = "NSE"
    timeframe: str = "1d"
    from_date: str = ""
    to_date: str = ""


class WatchlistAddRequest(BaseModel):
    symbol: str
    exchange: str = "NSE"


class ScheduleRequest(BaseModel):
    symbol: str
    exchange: str = "NSE"
    timeframe: str = "1d"
    schedule_type: str = "daily"
    schedule_time: str = "09:15"


@router.get("/download")
async def get_download_jobs():
    return {"jobs": list_jobs()}


@router.post("/download")
async def start_download(body: DownloadRequest):
    if not body.symbol:
        raise HTTPException(status_code=400, detail="symbol is required")
    from_date = body.from_date or (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    to_date = body.to_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        result = download_data(body.symbol, body.exchange, body.timeframe, from_date, to_date)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/download/{job_id}")
async def cancel_download_job(job_id: str):
    ok = cancel_job(job_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Job not found or already completed")
    return {"status": "cancelled", "job_id": job_id}


@router.get("/data")
async def get_ohlcv_data(
    symbol: str = Query(...),
    exchange: str = Query("NSE"),
    timeframe: str = Query("1d"),
    from_date: str | None = Query(None),
    to_date: str | None = Query(None),
):
    if not symbol:
        raise HTTPException(status_code=400, detail="symbol is required")
    try:
        data = get_ohlcv(symbol, exchange, timeframe, from_date, to_date)
        return {"symbol": symbol.upper(), "exchange": exchange.upper(), "timeframe": timeframe, "data": data}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/watchlist")
async def get_watchlist_data():
    return {"watchlist": get_watchlist()}


@router.post("/watchlist")
async def add_to_watchlist_data(body: WatchlistAddRequest):
    if not body.symbol:
        raise HTTPException(status_code=400, detail="symbol is required")
    return {"watchlist": add_to_watchlist(body.symbol, body.exchange)}


@router.delete("/watchlist/{symbol}")
async def remove_from_watchlist_data(symbol: str, exchange: str = Query("NSE")):
    return {"watchlist": remove_from_watchlist(symbol, exchange)}


@router.get("/export")
async def export_ohlcv_csv(
    symbol: str = Query(...),
    exchange: str = Query("NSE"),
    timeframe: str = Query("1d"),
):
    if not symbol:
        raise HTTPException(status_code=400, detail="symbol is required")
    csv_data = export_csv(symbol, exchange, timeframe)
    if not csv_data:
        raise HTTPException(status_code=404, detail="No data found for export")
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{symbol}_{timeframe}.csv"'},
    )


@router.get("/schedules")
async def get_schedules():
    return {"schedules": sched_list_schedules()}


@router.post("/schedules")
async def create_schedule(body: ScheduleRequest):
    if not body.symbol:
        raise HTTPException(status_code=400, detail="symbol is required")
    try:
        from api.app import _scheduler
    except (ImportError, AttributeError):
        _scheduler = None
    entry = sched_schedule_download(
        body.symbol, body.exchange, body.timeframe,
        body.schedule_type, body.schedule_time,
        scheduler=_scheduler,
    )
    return entry


@router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str):
    ok = sched_remove_schedule(schedule_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"status": "deleted", "schedule_id": schedule_id}
