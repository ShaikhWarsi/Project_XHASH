from __future__ import annotations

import asyncio
import inspect
import json
import logging
import os
import threading
import time
import traceback
import uuid
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Any, AsyncIterator, Callable, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from persistence.database import get_session
from persistence.models import AgentJob

logger = logging.getLogger(__name__)

_PROGRESS_RING_SIZE = 200
_progress_buffers: dict[str, deque] = {}
_progress_locks: dict[str, threading.Lock] = {}
_progress_signals: dict[str, threading.Event] = {}
_progress_global_lock = threading.Lock()


def _max_workers() -> int:
    try:
        return max(1, int(os.getenv("AGENT_JOBS_MAX_WORKERS", "4")))
    except Exception as e:
        logger.warning("Failed to read AGENT_JOBS_MAX_WORKERS: %s", e)
        return 4


_executor: Optional[ThreadPoolExecutor] = None
_lock = threading.Lock()


def _get_executor() -> ThreadPoolExecutor:
    global _executor
    if _executor is not None:
        return _executor
    with _lock:
        if _executor is None:
            _executor = ThreadPoolExecutor(
                max_workers=_max_workers(),
                thread_name_prefix="agent-job",
            )
        return _executor


def _new_job_id() -> str:
    return uuid.uuid4().hex


def submit_job(
    *,
    user_id: int,
    agent_token_id: Optional[int],
    kind: str,
    request_payload: dict,
    runner: Callable[..., Any],
    idempotency_key: Optional[str] = None,
) -> dict:
    job_id = _new_job_id()
    created_at = datetime.utcnow()

    import asyncio

    async def _persist():
        async for session in get_session():
            job = AgentJob(
                job_id=job_id,
                user_id=int(user_id),
                agent_token_id=agent_token_id,
                kind=kind,
                status="queued",
                request=json.dumps(request_payload, default=str),
                idempotency_key=idempotency_key,
                created_at=created_at,
            )
            session.add(job)
            await session.commit()
            break

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_persist())
    except RuntimeError:
        asyncio.run(_persist())

    accepts_progress = _runner_accepts_progress(runner)

    def _run():
        _set_status(job_id, "running", started_at=datetime.utcnow())
        _publish_progress(job_id, {"phase": "running", "ts": time.time()})
        try:
            if accepts_progress:
                def _on_progress(snapshot: Any) -> None:
                    if not isinstance(snapshot, dict):
                        snapshot = {"value": snapshot}
                    _publish_progress(job_id, snapshot)
                result = runner(request_payload, _on_progress)
            else:
                result = runner(request_payload)
            _set_result(job_id, result)
            _publish_progress(job_id, {"phase": "succeeded", "ts": time.time()}, terminal=True)
        except Exception as exc:
            tb = traceback.format_exc()
            logger.error("agent_job %s kind=%s failed: %s\n%s", job_id, kind, exc, tb)
            _set_failure(job_id, f"{exc}\n{tb[-2000:]}")
            _publish_progress(
                job_id,
                {"phase": "failed", "error": str(exc)[:500], "ts": time.time()},
                terminal=True,
            )

    _get_executor().submit(_run)

    return {
        "job_id": job_id,
        "status": "queued",
        "kind": kind,
        "created_at": created_at.isoformat() + "Z",
    }


def _runner_accepts_progress(runner: Callable) -> bool:
    try:
        sig = inspect.signature(runner)
    except (TypeError, ValueError):
        return False
    params = [
        p
        for p in sig.parameters.values()
        if p.kind in (inspect.Parameter.POSITIONAL_ONLY, inspect.Parameter.POSITIONAL_OR_KEYWORD)
    ]
    return len(params) >= 2


def _job_signal(job_id: str) -> threading.Event:
    with _progress_global_lock:
        ev = _progress_signals.get(job_id)
        if ev is None:
            ev = threading.Event()
            _progress_signals[job_id] = ev
        return ev


def _job_buffer(job_id: str) -> tuple[deque, threading.Lock]:
    with _progress_global_lock:
        buf = _progress_buffers.get(job_id)
        if buf is None:
            buf = deque(maxlen=_PROGRESS_RING_SIZE)
            _progress_buffers[job_id] = buf
            _progress_locks[job_id] = threading.Lock()
        return buf, _progress_locks[job_id]


def _publish_progress(job_id: str, event: dict, *, terminal: bool = False) -> None:
    buf, lock = _job_buffer(job_id)
    seq = (buf[-1]["seq"] + 1) if buf else 1
    record = {
        "seq": seq,
        "ts": event.get("ts") or time.time(),
        "data": event,
        "terminal": terminal,
    }
    with lock:
        buf.append(record)
    _job_signal(job_id).set()

    async def _persist():
        async for session in get_session():
            await session.execute(
                update(AgentJob)
                .where(AgentJob.job_id == job_id)
                .values(progress=json.dumps(event, default=str))
            )
            await session.commit()
            break

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_persist())
    except RuntimeError:
        pass


async def stream_progress(
    job_id: str, *, since_seq: int = 0, idle_timeout_s: float = 60.0
) -> AsyncIterator[dict]:
    buf, lock = _job_buffer(job_id)
    last_seq = since_seq
    deadline = time.monotonic() + idle_timeout_s

    _stream_max = 10000000
    for _ in range(_stream_max):
        with lock:
            pending = [r for r in list(buf) if r["seq"] > last_seq]
        for rec in pending:
            yield rec
            last_seq = rec["seq"]
            if rec.get("terminal"):
                _gc_job_state(job_id)
                return
            deadline = time.monotonic() + idle_timeout_s

        ev = _job_signal(job_id)
        wait_for = max(0.0, deadline - time.monotonic())
        if wait_for == 0.0:
            return
        ev.wait(timeout=min(wait_for, 5.0))
        ev.clear()


def _gc_job_state(job_id: str) -> None:
    with _progress_global_lock:
        _progress_buffers.pop(job_id, None)
        _progress_locks.pop(job_id, None)
        _progress_signals.pop(job_id, None)


def _set_status(job_id: str, status: str, *, started_at: Optional[datetime] = None) -> None:
    import asyncio

    async def _update():
        async for session in get_session():
            values = {"status": status}
            if started_at is not None:
                values["started_at"] = started_at
            await session.execute(
                update(AgentJob).where(AgentJob.job_id == job_id).values(**values)
            )
            await session.commit()
            break

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_update())
    except RuntimeError:
        asyncio.run(_update())


def _set_result(job_id: str, result: Any) -> None:
    import asyncio

    async def _update():
        async for session in get_session():
            await session.execute(
                update(AgentJob)
                .where(AgentJob.job_id == job_id)
                .values(
                    status="succeeded",
                    result=json.dumps(result, default=str),
                    finished_at=datetime.utcnow(),
                )
            )
            await session.commit()
            break

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_update())
    except RuntimeError:
        asyncio.run(_update())


def _set_failure(job_id: str, error: str) -> None:
    import asyncio

    async def _update():
        async for session in get_session():
            await session.execute(
                update(AgentJob)
                .where(AgentJob.job_id == job_id)
                .values(
                    status="failed",
                    error=error[:6000],
                    finished_at=datetime.utcnow(),
                )
            )
            await session.commit()
            break

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_update())
    except RuntimeError:
        asyncio.run(_update())


async def get_job(job_id: str, *, user_id: int, db: AsyncSession) -> Optional[dict]:
    result = await db.execute(
        select(AgentJob).where(AgentJob.job_id == job_id, AgentJob.user_id == int(user_id))
    )
    row = result.scalar_one_or_none()
    if not row:
        return None
    def _safe_json(val):
        if val is None:
            return None
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return {}
    return {
        "job_id": row.job_id,
        "kind": row.kind,
        "status": row.status,
        "request": _safe_json(row.request) or {},
        "result": _safe_json(row.result),
        "error": row.error,
        "progress": _safe_json(row.progress),
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "started_at": row.started_at.isoformat() if row.started_at else None,
        "finished_at": row.finished_at.isoformat() if row.finished_at else None,
    }


async def list_jobs(
    *, user_id: int, kind: Optional[str] = None, limit: int = 50, db: AsyncSession
) -> list[dict]:
    limit = max(1, min(int(limit or 50), 200))
    query = select(AgentJob).where(AgentJob.user_id == int(user_id))
    if kind:
        query = query.where(AgentJob.kind == kind)
    query = query.order_by(AgentJob.id.desc()).limit(limit)
    result = await db.execute(query)
    rows = result.scalars().all()
    return [
        {
            "job_id": r.job_id,
            "kind": r.kind,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "finished_at": r.finished_at.isoformat() if r.finished_at else None,
        }
        for r in rows
    ]
