from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Optional

from sqlalchemy import select, desc, update
from sqlalchemy.ext.asyncio import AsyncSession

import persistence.database as _db  # use _db._session_factory to get live reference
from persistence.models import TradingAgentsRun, TradingAgentsReport, TradingAgentsEvent
from integrations.tradingagents_bridge import run_pipeline, build_ta_config
from integrations.tradingagents_bridge.report_bundle import ReportBundle
from integrations.tradingagents_bridge.callback_emitter import SSEEvent

from api.models.tradingagents_schemas import (
    AnalyzeRequest, ReportBundleOut, RunSummaryOut,
    ScrapeBundleOut, ScrapeSourceOut,
    RunStatusOut, EventOut,
)

logger = logging.getLogger(__name__)

_RUN_CACHE: dict[str, dict[str, Any]] = {}
_SSE_QUEUES: dict[str, list[Callable[[SSEEvent], None]]] = {}
_PIPELINE_TASKS: dict[str, asyncio.Task] = {}
_PIPELINE_TIMEOUT = 600  # 10 minute hard timeout


def _register_sse_listener(run_id: str, listener: Callable[[SSEEvent], None]):
    _SSE_QUEUES.setdefault(run_id, []).append(listener)


def _unregister_sse_listener(run_id: str, listener: Callable[[SSEEvent], None]):
    listeners = _SSE_QUEUES.get(run_id, [])
    if listener in listeners:
        listeners.remove(listener)


def _push_event(run_id: str, event: SSEEvent):
    for listener in _SSE_QUEUES.get(run_id, []):
        try:
            listener(event)
        except Exception:
            pass


async def start_analysis(req: AnalyzeRequest) -> str:
    run_id = str(uuid.uuid4())
    config_overrides = {}
    if req.deep_model:
        config_overrides["deep_think_llm"] = req.deep_model
    if req.quick_model:
        config_overrides["quick_think_llm"] = req.quick_model
    if req.trade_date:
        config_overrides["trade_date"] = req.trade_date

    async with _db._session_factory() as session:
        run = TradingAgentsRun(
            id=run_id,
            ticker=req.ticker.upper(),
            status="running",
            current_stage="scraping",
            config_json=json.dumps({
                "max_debate_rounds": req.max_debate_rounds,
                "max_risk_rounds": req.max_risk_rounds,
                "trade_date": req.trade_date,
                "deep_model": req.deep_model,
                "quick_model": req.quick_model,
            }),
        )
        session.add(run)
        await session.commit()

    _RUN_CACHE[run_id] = {"status": "running", "result": None}

    task = asyncio.create_task(_execute_pipeline(run_id, req, config_overrides))
    _PIPELINE_TASKS[run_id] = task

    return run_id


async def _save_event(run_id: str, event_type: str, event_data: dict, node_name: Optional[str] = None):
    """Persist an event to the DB safely (fire-and-forget)."""
    try:
        async with _db._session_factory() as session:
            ev = TradingAgentsEvent(
                run_id=run_id,
                event_type=event_type,
                event_data=json.dumps(event_data),
                node_name=node_name,
            )
            session.add(ev)
            await session.commit()
    except Exception as e:
        logger.warning("Failed to persist event %s for %s: %s", event_type, run_id, e)


async def _update_run_stage(run_id: str, stage: str, node: Optional[str] = None, tool_count: Optional[int] = None):
    """Update the run's current stage/node/tool count in DB."""
    try:
        async with _db._session_factory() as session:
            result = await session.execute(
                select(TradingAgentsRun).where(TradingAgentsRun.id == run_id)
            )
            run = result.scalar_one_or_none()
            if run:
                elapsed = int((datetime.now(timezone.utc) - run.started_at).total_seconds() * 1000) if run.started_at else 0
                run.current_stage = stage
                run.elapsed_ms = elapsed
                if node:
                    run.current_node = node
                if tool_count is not None:
                    run.tool_call_count = tool_count
                await session.commit()
    except Exception as e:
        logger.warning("Failed to update run stage for %s: %s", run_id, e)


async def _check_cancelled(run_id: str) -> bool:
    """Check if cancellation was requested for this run."""
    try:
        async with _db._session_factory() as session:
            result = await session.execute(
                select(TradingAgentsRun.cancel_requested).where(TradingAgentsRun.id == run_id)
            )
            val = result.scalar_one_or_none()
            return bool(val)
    except Exception:
        return False


async def _execute_pipeline(run_id: str, req: AnalyzeRequest, config_overrides: dict):
    start_ts = datetime.now(timezone.utc)
    try:
        def push_event(event: SSEEvent):
            _push_event(run_id, event)

        async def push_and_save(event: SSEEvent, node: Optional[str] = None):
            _push_event(run_id, event)
            asyncio.create_task(_save_event(run_id, event.event, event.data, node))

        await _update_run_stage(run_id, "scraping")

        # Wrap pipeline with timeout
        bundle = await asyncio.wait_for(
            run_pipeline(
                ticker=req.ticker.upper(),
                trade_date=req.trade_date or None,
                max_debate_rounds=req.max_debate_rounds,
                max_risk_rounds=req.max_risk_rounds,
                push_event=lambda e: asyncio.create_task(push_and_save(e)),
                config_overrides=config_overrides,
            ),
            timeout=_PIPELINE_TIMEOUT,
        )

        if await _check_cancelled(run_id):
            return

        # Save report stages to DB
        async with _db._session_factory() as session:
            if bundle.scrape:
                stage = TradingAgentsReport(
                    run_id=run_id, stage="scrape",
                    payload_json=json.dumps(bundle.scrape.to_dict()),
                )
                session.add(stage)

            for analyst in bundle.analysts:
                stage = TradingAgentsReport(
                    run_id=run_id, stage=f"analyst:{analyst.name}",
                    payload_json=json.dumps(analyst.to_dict()),
                )
                session.add(stage)

            for round_ in bundle.invest_debate:
                stage = TradingAgentsReport(
                    run_id=run_id, stage=f"debate:invest:{round_.speaker}",
                    payload_json=json.dumps(round_.to_dict()),
                )
                session.add(stage)

            for round_ in bundle.risk_debate:
                stage = TradingAgentsReport(
                    run_id=run_id, stage=f"debate:risk:{round_.speaker}",
                    payload_json=json.dumps(round_.to_dict()),
                )
                session.add(stage)

            final_stage = TradingAgentsReport(
                run_id=run_id, stage="final",
                payload_json=json.dumps(bundle.final.to_dict()),
            )
            session.add(final_stage)

            # Update run status
            result = await session.execute(
                select(TradingAgentsRun).where(TradingAgentsRun.id == run_id)
            )
            run = result.scalar_one_or_none()
            if run:
                elapsed = int((datetime.now(timezone.utc) - start_ts).total_seconds() * 1000)
                run.status = "done"
                run.finished_at = datetime.now(timezone.utc)
                run.elapsed_ms = elapsed
                run.current_stage = "final"

            await session.commit()

        _RUN_CACHE[run_id] = {"status": "done", "result": bundle.to_dict()}

    except asyncio.TimeoutError:
        logger.error("Pipeline timed out for run %s (exceeded %ss)", run_id, _PIPELINE_TIMEOUT)
        async with _db._session_factory() as session:
            result = await session.execute(
                select(TradingAgentsRun).where(TradingAgentsRun.id == run_id)
            )
            run = result.scalar_one_or_none()
            if run:
                run.status = "failed"
                run.error = f"Pipeline timed out after {_PIPELINE_TIMEOUT}s"
                run.error_detail = f"Hard timeout of {_PIPELINE_TIMEOUT}s exceeded"
                run.finished_at = datetime.now(timezone.utc)
                await session.commit()
        _RUN_CACHE[run_id] = {"status": "failed", "error": "Pipeline timed out"}
        _push_event(run_id, SSEEvent("pipeline_error", {"error": f"Pipeline timed out after {_PIPELINE_TIMEOUT}s"}))

    except asyncio.CancelledError:
        logger.info("Pipeline cancelled for run %s", run_id)
        async with _db._session_factory() as session:
            result = await session.execute(
                select(TradingAgentsRun).where(TradingAgentsRun.id == run_id)
            )
            run = result.scalar_one_or_none()
            if run:
                run.status = "cancelled"
                run.error = "Cancelled by user"
                run.finished_at = datetime.now(timezone.utc)
                await session.commit()
        _RUN_CACHE[run_id] = {"status": "cancelled", "error": "Cancelled by user"}

    except Exception as exc:
        logger.exception("Pipeline failed for run %s: %s", run_id, exc)
        async with _db._session_factory() as session:
            result = await session.execute(
                select(TradingAgentsRun).where(TradingAgentsRun.id == run_id)
            )
            run = result.scalar_one_or_none()
            if run:
                run.status = "failed"
                run.error = str(exc)[:2000]
                run.error_detail = str(exc)
                run.finished_at = datetime.now(timezone.utc)
                await session.commit()
        _RUN_CACHE[run_id] = {"status": "failed", "error": str(exc)}
    finally:
        _PIPELINE_TASKS.pop(run_id, None)


async def get_report(run_id: str) -> Optional[ReportBundleOut]:
    cached = _RUN_CACHE.get(run_id)
    if cached and cached.get("result"):
        return ReportBundleOut(**cached["result"])
    if _db._session_factory is None:
        return None

    async with _db._session_factory() as session:
        result = await session.execute(
            select(TradingAgentsReport)
            .where(TradingAgentsReport.run_id == run_id)
            .order_by(TradingAgentsReport.id)
        )
        stages = result.scalars().all()
        if not stages:
            return None

        bundle: dict[str, Any] = {"ticker": "", "analysts": [], "invest_debate": [],
                                    "risk_debate": [], "final": {}}
        for stage in stages:
            payload = json.loads(stage.payload_json)
            if stage.stage == "scrape":
                bundle["scrape"] = payload
            elif stage.stage.startswith("analyst:"):
                bundle.setdefault("analysts", []).append(payload)
            elif stage.stage.startswith("debate:invest:"):
                bundle.setdefault("invest_debate", []).append(payload)
            elif stage.stage.startswith("debate:risk:"):
                bundle.setdefault("risk_debate", []).append(payload)
            elif stage.stage == "final":
                bundle["final"] = payload

        run_result = await session.execute(
            select(TradingAgentsRun).where(TradingAgentsRun.id == run_id)
        )
        run = run_result.scalar_one_or_none()
        if run:
            bundle["ticker"] = run.ticker
            bundle["status"] = run.status

        return ReportBundleOut(**bundle)


async def list_runs(limit: int = 20) -> list[RunSummaryOut]:
    if _db._session_factory is None:
        return []
    async with _db._session_factory() as session:
        result = await session.execute(
            select(TradingAgentsRun)
            .order_by(desc(TradingAgentsRun.started_at))
            .limit(limit)
        )
        runs = result.scalars().all()
        return [RunSummaryOut(
            id=r.id, ticker=r.ticker, status=r.status,
            started_at=r.started_at, finished_at=r.finished_at,
            error=r.error,
        ) for r in runs]


async def get_run_status(run_id: str) -> Optional[str]:
    cached = _RUN_CACHE.get(run_id)
    if cached:
        return cached.get("status")
    if _db._session_factory is None:
        return None
    async with _db._session_factory() as session:
        result = await session.execute(
            select(TradingAgentsRun).where(TradingAgentsRun.id == run_id)
        )
        run = result.scalar_one_or_none()
        return run.status if run else None


async def get_run_status_detail(run_id: str) -> Optional[RunStatusOut]:
    if _db._session_factory is None:
        return None
    async with _db._session_factory() as session:
        result = await session.execute(
            select(TradingAgentsRun).where(TradingAgentsRun.id == run_id)
        )
        run = result.scalar_one_or_none()
        if not run:
            return None
        elapsed = 0
        if run.started_at:
            end = run.finished_at or datetime.now(timezone.utc)
            elapsed = int((end - run.started_at).total_seconds() * 1000)
        return RunStatusOut(
            id=run.id,
            ticker=run.ticker,
            status=run.status,
            current_stage=run.current_stage,
            current_node=run.current_node,
            tool_call_count=run.tool_call_count or 0,
            elapsed_ms=elapsed,
            cancel_requested=bool(run.cancel_requested),
            started_at=run.started_at,
            finished_at=run.finished_at,
            error=run.error,
            error_detail=run.error_detail,
        )


async def cancel_run(run_id: str) -> bool:
    """Request cancellation of a running pipeline."""
    try:
        async with _db._session_factory() as session:
            result = await session.execute(
                select(TradingAgentsRun).where(TradingAgentsRun.id == run_id)
            )
            run = result.scalar_one_or_none()
            if not run:
                return False
            run.cancel_requested = 1
            await session.commit()

        # Cancel the asyncio task if it's still running
        task = _PIPELINE_TASKS.pop(run_id, None)
        if task and not task.done():
            task.cancel()

        _push_event(run_id, SSEEvent("pipeline_cancelled", {"run_id": run_id}))
        return True
    except Exception as e:
        logger.exception("Failed to cancel run %s: %s", run_id, e)
        return False


async def get_run_events(run_id: str, limit: int = 200) -> list[EventOut]:
    if _db._session_factory is None:
        return []
    async with _db._session_factory() as session:
        result = await session.execute(
            select(TradingAgentsEvent)
            .where(TradingAgentsEvent.run_id == run_id)
            .order_by(TradingAgentsEvent.id)
            .limit(limit)
        )
        events = result.scalars().all()
        return [
            EventOut(
                id=ev.id,
                run_id=ev.run_id,
                event_type=ev.event_type,
                event_data=json.loads(ev.event_data) if ev.event_data else {},
                node_name=ev.node_name,
                created_at=ev.created_at,
            )
            for ev in events
        ]
