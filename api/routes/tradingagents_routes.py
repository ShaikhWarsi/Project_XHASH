from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from api.models.tradingagents_schemas import (
    AnalyzeRequest, AnalyzeResponse, RunListResponse,
    RunSummaryOut, ReportBundleOut, ScrapeBundleOut, ScrapeSourceOut,
    ScrapeRequest, RunStatusOut, CancelResponse, EventListResponse, EventOut,
    DebugInfoOut,
)
from api.services.tradingagents_service import (
    start_analysis, get_report, list_runs, get_run_status,
    get_run_status_detail, cancel_run, get_run_events,
    _register_sse_listener, _unregister_sse_listener,
)
from integrations.tradingagents_bridge.callback_emitter import SSEEvent
from integrations.tradingagents.dataflows.stocktwits import fetch_stocktwits_messages
from integrations.tradingagents.dataflows.reddit import fetch_reddit_posts
from integrations.tradingagents.dataflows.yfinance_news import get_news_yfinance as get_yfinance_news

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/tradingagents", tags=["tradingagents"])


def _parse_stocktwits(text: str) -> list[dict]:
    items = []
    for line in text.split("\n"):
        line = line.strip()
        if line.startswith("[") and "· @" in line:
            timestamp = ""
            author = ""
            sentiment = ""
            body = line
            if "]" in line:
                meta, body = line[1:].split("]", 1)
                parts = meta.split("·")
                if len(parts) >= 1:
                    timestamp = parts[0].strip()
                if len(parts) >= 2:
                    author = parts[1].strip().lstrip("@")
                if len(parts) >= 3:
                    sentiment = parts[2].strip()
            items.append({
                "author": author,
                "timestamp": timestamp,
                "sentiment": sentiment,
                "text": body.strip(),
            })
    return items


def _parse_reddit(text: str) -> list[dict]:
    items = []
    current_sub = ""
    for line in text.split("\n"):
        stripped = line.strip()
        if stripped.startswith("r/") and "—" in stripped:
            current_sub = stripped.split("—")[0].strip()
        elif stripped.startswith("[") and "]" in stripped:
            title = ""
            date = stripped[1:].split("]")[0] if "]" in stripped else ""
            rest = stripped.split("]", 1)[1].strip() if "]" in stripped else ""
            title = rest
            items.append({
                "subreddit": current_sub,
                "date": date,
                "title": title,
                "text": "",
            })
        elif stripped.startswith("body excerpt:") and items:
            items[-1]["text"] = stripped.replace("body excerpt:", "").strip()
    return items


@router.post("/scrape", response_model=ScrapeBundleOut)
async def scrape_only(req: ScrapeRequest):
    """Scrape raw data for a ticker without running any LLM analysis."""
    ticker = req.ticker.upper()
    bundle = ScrapeBundleOut(ticker=ticker)

    try:
        st_text = await asyncio.to_thread(fetch_stocktwits_messages, ticker, req.days)
        st_items = _parse_stocktwits(st_text)
        bundle.sources.append(ScrapeSourceOut(source="stocktwits", items=st_items or [{"text": st_text}]))
    except Exception as e:
        logger.warning("StockTwits scrape failed: %s", e)

    try:
        reddit_text = await asyncio.to_thread(fetch_reddit_posts, ticker, ("wallstreetbets", "stocks", "investing"), 5)
        reddit_items = _parse_reddit(reddit_text)
        bundle.sources.append(ScrapeSourceOut(source="reddit", items=reddit_items or [{"text": reddit_text}]))
    except Exception as e:
        logger.warning("Reddit scrape failed: %s", e)

    try:
        news_items = await asyncio.to_thread(get_yfinance_news, ticker)
        bundle.sources.append(ScrapeSourceOut(source="yahoo_news", items=news_items or []))
    except Exception as e:
        logger.warning("Yahoo news scrape failed: %s", e)

    try:
        global_news = await asyncio.to_thread(get_yfinance_news, "^GSPC")
        bundle.sources.append(ScrapeSourceOut(source="yahoo_global", items=global_news or []))
    except Exception as e:
        logger.warning("Yahoo global news scrape failed: %s", e)

    return bundle


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    """Start a full TradingAgents multi-agent analysis pipeline."""
    try:
        logger.info("Analyze called for %s", req.ticker)
        run_id = await start_analysis(req)
        logger.info("Analyze started run_id=%s", run_id)
        return {"run_id": run_id, "ticker": req.ticker.upper(), "status": "queued"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Analyze failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")


@router.get("/runs", response_model=RunListResponse)
async def list_runs_endpoint(limit: int = Query(default=20, le=100)):
    """List recent analysis runs."""
    runs = await list_runs(limit=limit)
    return RunListResponse(runs=runs)


@router.get("/runs/{run_id}", response_model=ReportBundleOut)
async def get_run_result(run_id: str):
    """Get the full report for a completed analysis run."""
    report = await get_report(run_id)
    if not report:
        raise HTTPException(status_code=404, detail="Run not found")
    return report


@router.get("/runs/{run_id}/stream")
async def stream_run(run_id: str):
    """SSE stream for live pipeline progress."""
    status = await get_run_status(run_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Run not found")

    async def event_generator():
        queue: asyncio.Queue[SSEEvent] = asyncio.Queue()

        def listener(event: SSEEvent):
            queue.put_nowait(event)

        _register_sse_listener(run_id, listener)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield event.serialize()
                    if event.event == "run_complete" or event.event == "pipeline_error":
                        break
                except asyncio.TimeoutError:
                    # Keep-alive ping
                    yield f"event: ping\ndata: {{\"ts\": \"{__import__('datetime').datetime.utcnow().isoformat()}\"}}\n\n"
                    # Check status
                    s = await get_run_status(run_id)
                    if s in ("done", "failed"):
                        break
        finally:
            _unregister_sse_listener(run_id, listener)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/runs/{run_id}/status", response_model=RunStatusOut)
async def get_run_status_endpoint(run_id: str):
    """Get detailed pipeline status for a run."""
    status = await get_run_status_detail(run_id)
    if not status:
        raise HTTPException(status_code=404, detail="Run not found")
    return status


@router.post("/runs/{run_id}/cancel", response_model=CancelResponse)
async def cancel_run_endpoint(run_id: str):
    """Cancel a running pipeline."""
    success = await cancel_run(run_id)
    if not success:
        raise HTTPException(status_code=404, detail="Run not found or already finished")
    return CancelResponse(success=True, message="Cancellation requested")


@router.get("/runs/{run_id}/events", response_model=EventListResponse)
async def get_run_events_endpoint(run_id: str, limit: int = Query(default=200, le=1000)):
    """Get the full event log for a run."""
    events = await get_run_events(run_id, limit=limit)
    return EventListResponse(events=events, total=len(events))


@router.get("/debug", response_model=DebugInfoOut)
async def debug_info():
    """System health and debug information."""
    import time
    from api.app import _start_time, _check_db, _check_yfinance

    db_status = _check_db()
    yf_status = _check_yfinance()

    # Check LM Studio
    lm_studio_up = False
    lm_model = ""
    lm_context = 0
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get("http://localhost:1234/v1/models")
            if resp.status_code == 200:
                models = resp.json()
                if models and "data" in models and len(models["data"]) > 0:
                    lm_studio_up = True
                    lm_model = models["data"][0].get("id", "unknown")
    except Exception:
        pass

    last_runs = await list_runs(limit=5)
    uptime = int(time.time() - _start_time)

    return DebugInfoOut(
        backend_up=True,
        database_up=db_status.get("status") == "ok",
        lm_studio_up=lm_studio_up,
        lm_studio_model=lm_model,
        lm_studio_context=lm_context,
        last_runs=last_runs,
        uptime_seconds=uptime,
    )
