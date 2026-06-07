from __future__ import annotations
import asyncio
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)

_USE_APSCHEDULER = os.environ.get("SCHEDULER_BACKEND", "apscheduler") == "apscheduler"

# ── Run history (observability) ──
_run_history: dict[str, list[dict]] = {}
_MAX_HISTORY = 100


def _record_run(job_name: str, started: float, duration: float, success: bool, error: str = ""):
    entry = {
        "job": job_name,
        "started_at": datetime.fromtimestamp(started, tz=timezone.utc).isoformat(),
        "duration_ms": round(duration * 1000, 1),
        "success": success,
        "error": error[:200] if error else "",
    }
    history = _run_history.setdefault(job_name, [])
    history.append(entry)
    if len(history) > _MAX_HISTORY:
        history.pop(0)


def get_run_history(job_name: str | None = None, limit: int = 20) -> list[dict]:
    if job_name:
        return list(_run_history.get(job_name, []))[-limit:]
    result = []
    for entries in _run_history.values():
        result.extend(entries)
    result.sort(key=lambda e: e["started_at"], reverse=True)
    return result[:limit]


def get_job_status() -> dict[str, Any]:
    status = {}
    for name, entries in _run_history.items():
        recent = entries[-5:] if entries else []
        successes = sum(1 for e in recent if e["success"])
        status[name] = {
            "total_runs": len(entries),
            "recent_runs": len(recent),
            "recent_success_rate": round(successes / len(recent), 2) if recent else 0,
            "last_run": recent[-1] if recent else None,
        }
    return status


# ── Retry wrapper ──
async def run_with_retry(
    job_name: str,
    fn: Callable,
    max_retries: int = 2,
    base_delay: float = 5.0,
    *args,
    **kwargs,
):
    started = time.time()
    last_error = ""
    for attempt in range(max_retries + 1):
        try:
            result = fn(*args, **kwargs)
            if hasattr(result, "__await__"):
                result = await result
            duration = time.time() - started
            _record_run(job_name, started, duration, True)
            return result
        except Exception as e:
            last_error = str(e)
            duration = time.time() - started
            if attempt < max_retries:
                delay = base_delay * (2 ** attempt)
                logger.warning("%s attempt %d/%d failed, retrying in %.1fs: %s", job_name, attempt + 1, max_retries, delay, e)
                await asyncio.sleep(delay)
            else:
                logger.error("%s failed after %d retries: %s", job_name, max_retries, e)
                _record_run(job_name, started, duration, False, last_error)
    return None


# ── APScheduler setup ──
def create_scheduler():
    if not _USE_APSCHEDULER:
        logger.info("APScheduler disabled — using asyncio background tasks (legacy)")
        return None
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.interval import IntervalTrigger

        sched = AsyncIOScheduler()
        logger.info("APScheduler initialized")
        return sched
    except ImportError:
        logger.info("APScheduler not installed — falling back to asyncio background tasks")
        return None


def register_job(scheduler, job_name: str, fn: Callable, interval_seconds: int, start_delay: int = 0):
    if scheduler is None:
        return

    from apscheduler.triggers.interval import IntervalTrigger

    async def _wrapped():
        await asyncio.sleep(start_delay)
        await run_with_retry(job_name, fn, max_retries=int(os.environ.get(f"{job_name.upper()}_RETRIES", "2")))

    trigger = IntervalTrigger(seconds=interval_seconds, jitter=30)
    scheduler.add_job(_wrapped, trigger=trigger, id=job_name, replace_existing=True, name=job_name)
    logger.info("Registered scheduler job: %s (interval=%ds, retries=%s)", job_name, interval_seconds, os.environ.get(f"{job_name.upper()}_RETRIES", "2"))
