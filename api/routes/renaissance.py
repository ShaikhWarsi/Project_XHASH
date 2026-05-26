from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime
from typing import Any

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/renaissance", tags=["renaissance"])

_run_results: dict[str, dict[str, Any]] = {}
_run_counter = 0


async def _build_orchestrator(symbol: str):
    from agents.renaissance.orchestrator import RenaissanceOrchestrator, InvestmentCommittee
    from agents.renaissance.research_team import ResearchTeam, SignalScientistAgent, QuantResearcherAgent, RenaissancePortfolioManager
    from agents.renaissance.risk_team import RiskTeam, RiskQuantAgent
    from agents.renaissance.trading_team import TradingTeam, ExecutionQuantAgent, ComplianceOfficer

    research_team = ResearchTeam([
        SignalScientistAgent(),
        QuantResearcherAgent(),
        RenaissancePortfolioManager(),
    ])
    risk_team = RiskTeam([RiskQuantAgent()])
    trading_team = TradingTeam([ExecutionQuantAgent(), ComplianceOfficer()])
    committee = InvestmentCommittee(consensus_threshold=0.15)

    return RenaissanceOrchestrator(
        research_team=research_team,
        trading_team=trading_team,
        risk_team=risk_team,
        committee=committee,
    )


async def _fetch_price_data(symbols: list[str]) -> dict[str, pd.DataFrame]:
    import yfinance as yf

    prices_df: dict[str, pd.DataFrame] = {}
    for s in symbols:
        try:
            ticker = yf.Ticker(s)
            df = ticker.history(period="6mo")
            if not df.empty:
                df.columns = [c.lower() for c in df.columns]
                prices_df[s] = df
            await asyncio.sleep(0.1)
        except Exception:
            continue
    return prices_df


async def _build_portfolio(symbol: str, price: float) -> Any:
    from core.types import PortfolioState, Position, OrderSide

    return PortfolioState(
        cash=1000000.0,
        positions={
            symbol: Position(
                symbol=symbol,
                quantity=100,
                side=OrderSide.BUY,
                entry_price=price,
                current_price=price,
            )
        },
        total_value=1000000.0 + 100 * price,
    )


async def _build_signal_matrix(symbols: list[str]) -> Any:
    from core.types import SignalMatrix, RegimeState, RegimeType

    return SignalMatrix(
        timestamp=datetime.now(),
        signals={s: [] for s in symbols},
        composite_scores={s: 0.0 for s in symbols},
        regime=RegimeState(primary=RegimeType.NEUTRAL, confidence=0.5),
    )


async def _build_risk_limits() -> Any:
    from core.types import RiskLimits

    return RiskLimits(max_drawdown=0.2, max_leverage=2.0, max_concentration=0.3)


async def _run_analysis(orchestrator: Any, symbol: str) -> dict[str, Any]:
    symbols = [symbol, "SPY"]
    prices_df = await _fetch_price_data(symbols)

    price = 100.0
    df = prices_df.get(symbol)
    if df is not None and not df.empty:
        price = float(df["close"].iloc[-1])

    portfolio = await _build_portfolio(symbol, price)
    signals = await _build_signal_matrix(symbols)
    risk_limits = await _build_risk_limits()

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: orchestrator.deliberate(
            tickers=symbols,
            portfolio=portfolio,
            signals=signals,
            risk_limits=risk_limits,
            prices_df=prices_df,
        ),
    )

    workflow = await loop.run_in_executor(
        None,
        lambda: orchestrator.run_workflow(
            tickers=symbols,
            portfolio=portfolio,
            signals=signals,
            risk_limits=risk_limits,
            prices_df=prices_df,
        ),
    )

    return {
        "deliberation": {
            ticker: {
                "consensus": data["consensus"],
                "confidence": data["confidence"],
                "bullish_count": data["bullish_count"],
                "bearish_count": data["bearish_count"],
                "total_agents": data["total_agents"],
                "opinions": data.get("opinions", []),
            }
            for ticker, data in (result or {}).items()
        },
        "workflow_consensus": {
            ticker: {
                "consensus": data.get("consensus"),
                "confidence": data.get("confidence"),
            }
            for ticker, data in (workflow or {}).items()
        },
        "price": price,
        "universe": symbols,
    }


@router.post("/analyze")
async def renaissance_analyze(symbol: str = Query("AAPL")):
    global _run_counter
    try:
        orchestrator = await _build_orchestrator(symbol)
        result = await _run_analysis(orchestrator, symbol)

        _run_counter += 1
        run_id = f"ren_{int(time.time())}_{_run_counter}"
        _run_results[run_id] = {
            "run_id": run_id,
            "symbol": symbol,
            "timestamp": time.time(),
            "result": result,
        }

        return {
            "run_id": run_id,
            "symbol": symbol,
            "status": "completed",
            "teams": ["research", "risk", "trading"],
            "result": result,
        }
    except ImportError as e:
        raise HTTPException(status_code=503, detail=f"Renaissance modules not available: {e}")
    except Exception as e:
        logger.exception("Renaissance analysis failed for %s", symbol)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/runs")
async def list_renaissance_runs():
    return {"runs": list(_run_results.values())}


@router.get("/runs/{run_id}")
async def get_renaissance_run(run_id: str):
    result = _run_results.get(run_id)
    if not result:
        raise HTTPException(status_code=404, detail="Run not found")
    return result


@router.get("/agents")
async def list_renaissance_agents():
    return {
        "agents": [
            {"id": "signal_scientist", "team": "research", "role": "Signal generation and pattern detection"},
            {"id": "quant_researcher", "team": "research", "role": "Quantitative research and factor analysis"},
            {"id": "portfolio_manager", "team": "research", "role": "Portfolio allocation and risk budgeting"},
            {"id": "risk_quant", "team": "risk", "role": "VaR/CVaR calculation and risk assessment"},
            {"id": "execution_quant", "team": "trading", "role": "Execution optimization and slippage analysis"},
            {"id": "compliance_officer", "team": "trading", "role": "Trading compliance and constraint checking"},
        ]
    }
