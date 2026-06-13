from __future__ import annotations

import os
import asyncio
import logging
from datetime import datetime, timezone

from persistence.models_health import HealthMetric, HealthAlert
from persistence.multi_db import multi_db

logger = logging.getLogger(__name__)

FD_WARNING = int(os.getenv("HEALTH_FD_WARNING", "1000"))
MEMORY_WARNING_MB = int(os.getenv("HEALTH_MEMORY_WARNING_MB", "1024"))
DB_SIZE_WARNING_MB = int(os.getenv("HEALTH_DB_SIZE_WARNING_MB", "500"))
COLLECT_INTERVAL = int(os.getenv("HEALTH_COLLECT_INTERVAL", "60"))

_running = False


async def collect_health_metrics():
    try:
        import psutil
        process = psutil.Process()
        fd_count = process.num_fds() if hasattr(process, 'num_fds') else 0
        memory_info = process.memory_info()
        memory_rss_mb = memory_info.rss / (1024 * 1024)
        memory_vms_mb = memory_info.vms / (1024 * 1024)
        memory_percent = psutil.virtual_memory().percent
        thread_count = process.num_threads()
        db_sizes = {}

        for db_name in ["latency.db", "logs.db", "health.db", "sandbox.db", "openalgo_auth.db"]:
            db_path = os.path.join("db", db_name)
            try:
                db_sizes[db_name] = os.path.getsize(db_path) / (1024 * 1024)
            except OSError:
                db_sizes[db_name] = 0

        fd_status = "pass"
        if fd_count > FD_WARNING * 1.5:
            fd_status = "fail"
        elif fd_count > FD_WARNING:
            fd_status = "warn"

        memory_status = "pass"
        if memory_rss_mb > MEMORY_WARNING_MB * 1.5:
            memory_status = "fail"
        elif memory_rss_mb > MEMORY_WARNING_MB:
            memory_status = "warn"

        statuses = [fd_status, memory_status]
        overall = "pass"
        if "fail" in statuses:
            overall = "fail"
        elif "warn" in statuses:
            overall = "warn"

        factory = multi_db.get_factory("health")
        async with factory() as session:
            metric = HealthMetric(
                fd_count=fd_count,
                fd_usage_percent=round(fd_count / max(FD_WARNING, 1) * 100, 1) if FD_WARNING else 0,
                fd_status=fd_status,
                memory_rss_mb=round(memory_rss_mb, 1),
                memory_vms_mb=round(memory_vms_mb, 1),
                memory_percent=round(memory_percent, 1),
                memory_status=memory_status,
                thread_count=thread_count,
                db_connections=db_sizes,
                overall_status=overall,
            )
            session.add(metric)
            await session.commit()

        if fd_status == "fail":
            async with factory() as session:
                alert = HealthAlert(
                    alert_type="fd_exhaustion",
                    severity="fail",
                    metric_name="fd_count",
                    metric_value=float(fd_count),
                    threshold_value=float(FD_WARNING),
                    message=f"File descriptor count {fd_count} exceeds warning threshold {FD_WARNING}",
                )
                session.add(alert)
                await session.commit()

        if memory_status == "fail":
            async with factory() as session:
                alert = HealthAlert(
                    alert_type="memory_exhaustion",
                    severity="fail",
                    metric_name="memory_rss_mb",
                    metric_value=round(memory_rss_mb, 1),
                    threshold_value=float(MEMORY_WARNING_MB),
                    message=f"Memory usage {memory_rss_mb:.1f}MB exceeds warning threshold {MEMORY_WARNING_MB}MB",
                )
                session.add(alert)
                await session.commit()

    except ImportError:
        pass
    except Exception as e:
        logger.error(f"Health monitor error: {e}")


async def health_monitor_loop():
    global _running
    _running = True
    await asyncio.sleep(10)
    while _running:
        try:
            await collect_health_metrics()
        except Exception as e:
            logger.error(f"Health monitor loop error: {e}")
        await asyncio.sleep(COLLECT_INTERVAL)


def start_health_monitoring():
    asyncio.create_task(health_monitor_loop(), name="health-monitor")
    logger.info("Health monitoring started")


def stop_health_monitoring():
    global _running
    _running = False
