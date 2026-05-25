from __future__ import annotations

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.events import CompleteEvent, ErrorEvent, ProgressUpdateEvent, StartEvent
from api.models.schemas import BacktestPerformanceMetrics, BacktestRequest, ErrorResponse, HedgeFundRequest
from api.services.agent_service import AGENT_REGISTRY
from api.services.portfolio import create_portfolio
from persistence import HedgeFundFlow, get_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hedge-fund")


@router.post(
    "/run",
    responses={
        200: {"description": "Streaming hedge fund execution"},
        400: {"model": ErrorResponse, "description": "Invalid request"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def run_hedge_fund(request_data: HedgeFundRequest, request: Request):
    try:
        portfolio = create_portfolio(
            request_data.initial_cash,
            request_data.margin_requirement,
            request_data.tickers,
            request_data.portfolio_positions,
        )

        async def event_generator():
            yield StartEvent().to_sse()

            try:
                from agents.hedge_fund import HedgeFundOrchestrator, PersonaAgent

                _AGENT_MAP = {
                    "warren_buffett": ("agents.hedge_fund.warren_buffett", "WarrenBuffettAgent"),
                    "ben_graham": ("agents.hedge_fund.ben_graham", "BenGrahamAgent"),
                    "charlie_munger": ("agents.hedge_fund.charlie_munger", "CharlieMungerAgent"),
                    "michael_burry": ("agents.hedge_fund.michael_burry", "MichaelBurryAgent"),
                    "bill_ackman": ("agents.hedge_fund.bill_ackman", "BillAckmanAgent"),
                    "stanley_druckenmiller": ("agents.hedge_fund.stanley_druckenmiller", "StanleyDruckenmillerAgent"),
                    "rakesh_jhunjhunwala": ("agents.hedge_fund.rakesh_jhunjhunwala", "RakeshJhunjhunwalaAgent"),
                    "mohnish_pabrai": ("agents.hedge_fund.mohnish_pabrai", "MohnishPabraiAgent"),
                    "nassim_taleb": ("agents.hedge_fund.nassim_taleb", "NassimTalebAgent"),
                    "peter_lynch": ("agents.hedge_fund.peter_lynch", "PeterLynchAgent"),
                    "phil_fisher": ("agents.hedge_fund.phil_fisher", "PhilFisherAgent"),
                    "cathie_wood": ("agents.hedge_fund.cathie_wood", "CathieWoodAgent"),
                    "aswath_damodaran": ("agents.hedge_fund.aswath_damodaran", "AswathDamodaranAgent"),
                    "technicals": ("agents.hedge_fund.sentiment_analyst", "SentimentAnalystPersona"),
                    "sentiment": ("agents.hedge_fund.sentiment_analyst", "SentimentAnalystPersona"),
                    "news_sentiment": ("agents.hedge_fund.news_sentiment", "NewsSentimentPersona"),
                    "growth_agent": ("agents.hedge_fund.growth_agent", "GrowthPersona"),
                }

                agents: list[PersonaAgent] = []
                seen_keys: set[str] = set()
                for node in request_data.graph_nodes:
                    agent_key = node.data.get("agent_key", "").replace(" ", "_").lower()
                    if agent_key in seen_keys:
                        continue
                    seen_keys.add(agent_key)
                    entry = _AGENT_MAP.get(agent_key)
                    if entry:
                        import importlib
                        mod = importlib.import_module(entry[0])
                        cls = getattr(mod, entry[1])
                        info = AGENT_REGISTRY.get(agent_key, {})
                        agents.append(cls(agent_key, info.get("name", agent_key.replace("_", " ").title()), info.get("description", "")))

                if not agents:
                    from agents.hedge_fund.warren_buffett import WarrenBuffettAgent
                    agents.append(WarrenBuffettAgent("warren_buffett", "Warren Buffett", "Value investor focused on moats"))

                orchestrator = HedgeFundOrchestrator(persona_agents=agents)

                yield ProgressUpdateEvent(agent="system", ticker=None, status=f"Running {len(agents)} agents on {len(request_data.tickers)} tickers").to_sse()

                result = await asyncio.to_thread(
                    orchestrator.deliberate,
                    tickers=request_data.tickers,
                    portfolio=portfolio,
                    signals=None,
                )

                yield CompleteEvent(data={"decisions": result, "agent_count": len(agents)}).to_sse()

            except Exception as e:
                logger.exception("Hedge fund run failed")
                yield ErrorEvent(message=str(e)).to_sse()

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/backtest",
    responses={
        200: {"description": "Streaming backtest execution"},
        400: {"model": ErrorResponse, "description": "Invalid request"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def backtest_hedge_fund(request_data: BacktestRequest, request: Request):
    try:
        async def event_generator():
            yield StartEvent().to_sse()

            try:
                import pandas as pd
                from datetime import datetime, timedelta

                from agents.hedge_fund import HedgeFundOrchestrator

                from agents.hedge_fund.warren_buffett import WarrenBuffettAgent
                agent = WarrenBuffettAgent("warren_buffett", "Warren Buffett", "Value investor")
                orchestrator = HedgeFundOrchestrator(persona_agents=[agent])

                dates = pd.bdate_range(request_data.start_date, request_data.end_date)
                portfolio = create_portfolio(
                    request_data.initial_capital,
                    request_data.margin_requirement,
                    request_data.tickers,
                    request_data.portfolio_positions,
                )

                total_dates = len(dates)
                yield ProgressUpdateEvent(agent="backtest", ticker=None, status=f"Starting backtest over {total_dates} trading days").to_sse()

                for i, current_date in enumerate(dates):
                    if await request.is_disconnected():
                        break

                    date_str = current_date.strftime("%Y-%m-%d")
                    yield ProgressUpdateEvent(agent="backtest", ticker=None, status=f"Processing {date_str} ({i+1}/{total_dates})").to_sse()

                    result = await asyncio.to_thread(
                        orchestrator.deliberate,
                        tickers=request_data.tickers,
                        portfolio=portfolio,
                        signals=None,
                    )

                yield CompleteEvent(data={
                    "status": "completed",
                    "total_days": total_dates,
                    "final_portfolio": portfolio.to_dict() if hasattr(portfolio, 'to_dict') else {},
                }).to_sse()

            except Exception as e:
                logger.exception("Backtest failed")
                yield ErrorEvent(message=str(e)).to_sse()

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents")
async def get_agents():
    agent_list = [
        {"key": k, "display_name": v["name"], "description": v["description"]}
        for k, v in AGENT_REGISTRY.items()
    ]
    return {"agents": agent_list}
