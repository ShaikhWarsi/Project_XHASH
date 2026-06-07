"""Celery configuration for long-running tasks.

Requires: pip install celery[redis]

Usage:
    celery -A deploy.celery_config worker --concurrency=4 -Q hedge-fund,backtest,analysis
    celery -A deploy.celery_config beat
"""

import os
from celery import Celery

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "trading_engine",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "api.services.hedge_fund.tasks",
        "api.services.backtest.tasks",
        "api.services.analysis.tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,
    task_soft_time_limit=3000,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_default_queue="default",
    task_queues={
        "hedge-fund": {"routing_key": "hedge-fund"},
        "backtest": {"routing_key": "backtest"},
        "analysis": {"routing_key": "analysis"},
        "default": {"routing_key": "default"},
    },
    beat_schedule={
        "refresh-market-intel": {
            "task": "api.services.analysis.tasks.refresh_market_intel",
            "schedule": 300.0,
        },
    },
)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def run_hedge_fund(self, flow_id: int, ticker: str):
    """Execute a hedge fund deliberation flow asynchronously."""
    from api.services.hedge_fund.engine import HedgeFundEngine
    engine = HedgeFundEngine()
    try:
        result = engine.run(flow_id, ticker)
        return {"status": "completed", "result": result}
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=30)
def run_backtest(self, config: dict):
    """Execute a backtest asynchronously."""
    from api.services.backtest.engine import BacktestEngine
    engine = BacktestEngine()
    try:
        result = engine.run(config)
        return {"status": "completed", "result": result}
    except Exception as exc:
        raise self.retry(exc=exc)
