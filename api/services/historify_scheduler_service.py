from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

_schedules: dict[str, dict[str, Any]] = {}
_apscheduler_jobs: dict[str, Any] = {}


def set_scheduler(scheduler: Any) -> None:
    _scheduler_global = scheduler


def schedule_download(
    symbol: str,
    exchange: str,
    timeframe: str,
    schedule_type: str,
    schedule_time: str,
    scheduler: Any = None,
) -> dict[str, Any]:
    schedule_id = uuid.uuid4().hex[:12]
    entry = {
        "schedule_id": schedule_id,
        "symbol": symbol.upper(),
        "exchange": exchange.upper(),
        "timeframe": timeframe,
        "schedule_type": schedule_type,
        "schedule_time": schedule_time,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "active",
    }
    _schedules[schedule_id] = entry
    if scheduler:
        try:
            from apscheduler.triggers.cron import CronTrigger
            from apscheduler.triggers.interval import IntervalTrigger

            hour, minute = 0, 0
            if ":" in schedule_time:
                parts = schedule_time.split(":")
                hour = int(parts[0])
                minute = int(parts[1]) if len(parts) > 1 else 0

            if schedule_type == "daily":
                trigger = CronTrigger(hour=hour, minute=minute)
            elif schedule_type == "hourly":
                trigger = IntervalTrigger(hours=1)
            elif schedule_type == "weekly":
                trigger = CronTrigger(day_of_week="mon", hour=hour, minute=minute)
            else:
                trigger = CronTrigger(hour=hour, minute=minute)

            scheduler.add_job(
                lambda: _run_scheduled_download(symbol, exchange, timeframe),
                trigger=trigger,
                id=schedule_id,
                replace_existing=True,
                name=f"historify:{symbol}:{timeframe}",
            )
            _apscheduler_jobs[schedule_id] = True
            logger.info("Scheduled historify download: %s %s %s (%s)", symbol, timeframe, schedule_type, schedule_id)
        except Exception as e:
            logger.warning("Failed to schedule APScheduler job: %s", e)
    return entry


def _run_scheduled_download(symbol: str, exchange: str, timeframe: str) -> None:
    from .historify_service import download_data

    from_date = datetime.now(timezone.utc).isoformat()
    try:
        result = download_data(symbol, exchange, timeframe, from_date, from_date)
        logger.info("Scheduled download complete: %s -> %s rows", symbol, result.get("rows", 0))
    except Exception as e:
        logger.error("Scheduled download failed: %s %s: %s", symbol, timeframe, e)


def list_schedules() -> list[dict[str, Any]]:
    return list(_schedules.values())


def remove_schedule(schedule_id: str) -> bool:
    if schedule_id not in _schedules:
        return False
    del _schedules[schedule_id]
    if schedule_id in _apscheduler_jobs:
        try:
            from apscheduler.schedulers.asyncio import AsyncIOScheduler
        except ImportError:
            pass
        _apscheduler_jobs.pop(schedule_id, None)
    return True
