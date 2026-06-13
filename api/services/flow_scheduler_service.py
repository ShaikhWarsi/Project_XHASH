from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any

import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger

from api.services.flow_db import get_workflow
from api.services.flow_executor_service import execute_workflow

logger = logging.getLogger(__name__)

IST = pytz.timezone("Asia/Kolkata")

_scheduler: BackgroundScheduler | None = None
_lock = asyncio.Lock()


def get_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler(daemon=True, timezone=IST)
        _scheduler.start()
        logger.info("Flow scheduler started")
    return _scheduler


async def schedule_workflow(workflow_id: str, schedule_config: dict):
    sched = get_scheduler()
    trigger_type = schedule_config.get("type", "daily")
    existing = sched.get_job(f"flow_{workflow_id}")
    if existing:
        sched.remove_job(f"flow_{workflow_id}")

    if trigger_type == "once":
        run_at = schedule_config.get("run_at")
        if run_at:
            dt = datetime.fromisoformat(run_at) if isinstance(run_at, str) else run_at
            sched.add_job(_execute_job, DateTrigger(run_date=dt), id=f"flow_{workflow_id}", args=[workflow_id], replace_existing=True)
    elif trigger_type == "interval":
        seconds = int(schedule_config.get("seconds", 60))
        sched.add_job(_execute_job, IntervalTrigger(seconds=seconds), id=f"flow_{workflow_id}", args=[workflow_id], replace_existing=True)
    elif trigger_type == "daily":
        hour = int(schedule_config.get("hour", 9))
        minute = int(schedule_config.get("minute", 15))
        sched.add_job(_execute_job, CronTrigger(hour=hour, minute=minute, timezone=IST), id=f"flow_{workflow_id}", args=[workflow_id], replace_existing=True)
    elif trigger_type == "weekly":
        hour = int(schedule_config.get("hour", 9))
        minute = int(schedule_config.get("minute", 15))
        days = ",".join(str(d) for d in schedule_config.get("days", [0, 1, 2, 3, 4]))
        sched.add_job(_execute_job, CronTrigger(day_of_week=days, hour=hour, minute=minute, timezone=IST), id=f"flow_{workflow_id}", args=[workflow_id], replace_existing=True)

    logger.info("Scheduled workflow %s (%s)", workflow_id, trigger_type)


async def unschedule_workflow(workflow_id: str):
    sched = get_scheduler()
    existing = sched.get_job(f"flow_{workflow_id}")
    if existing:
        sched.remove_job(f"flow_{workflow_id}")
        logger.info("Unscheduled workflow %s", workflow_id)


def _execute_job(workflow_id: str):
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            workflow = get_workflow(workflow_id)
            if workflow and workflow.get("is_active"):
                loop.run_until_complete(execute_workflow(workflow))
        finally:
            loop.close()
    except Exception as e:
        logger.exception("Scheduled execution failed for %s: %s", workflow_id, e)
