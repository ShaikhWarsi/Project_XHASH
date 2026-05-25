from __future__ import annotations

import os
import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from .routes import backtest_routes, bars_routes, cfa, chart_routes, config, flows, hedge_fund, market_data, metrics, mmc, portfolio, signals, stream, structure, trades, global_market
from .routes.ws import router as ws_router
from .routes.orders import router as orders_router
from .routes.positions import router as positions_router
from .routes.risk import router as risk_router
from .routes.paper import router as paper_router
from .routes.agent import agent_v1
from .routes.portfolio_optimization import router as portfolio_opt_router
from .routes.factor_analysis import router as factor_analysis_router
from .routes.rl_training import router as rl_training_router
from .routes.research.sql_research import router as sql_research_router
from .routes.finscript import router as finscript_router
from .routes.ta_routes import router as ta_router
from .routes.alpha_zoo_routes import router as alpha_zoo_router
from .routes.geo_analysis_routes import router as geo_analysis_router
from .routes.experiment_routes import router as experiment_router
from .routes.swarm_routes import router as swarm_router
from .routes.hypothesis_routes import router as hypothesis_router
from .routes.china_markets_routes import router as china_markets_router
from .routes.backtest_cache_routes import router as backtest_cache_router
from .routes.protections_routes import router as protections_router
from .routes.pairlists_routes import router as pairlists_router
from .routes.debate_routes import router as debate_router
from .routes.providers_routes import router as providers_router
from .routes.mcp_routes import router as mcp_router
from .routes.workflow_routes import router as workflow_router
from .routes.hyperopt_routes import router as hyperopt_router
from .routes.agent import health as agent_health
from .routes.agent import markets as agent_markets
from .routes.agent import strategies as agent_strategies
from .routes.agent import backtests as agent_backtests
from .routes.agent import jobs as agent_jobs
from .routes.agent import admin as agent_admin
from .routes.signals_stream import router as signals_stream_router
from .routes.risk_live import router as risk_live_router
from .routes.portfolio_whatif import router as portfolio_whatif_router
from .routes.strategy_clone import router as strategy_clone_router
from .routes.llm import router as llm_router
from persistence import init_db, close_db
from persistence.database import _engine as db_engine

logger = logging.getLogger(__name__)

_start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


def _check_db():
    try:
        if db_engine is not None:
            return {"status": "ok", "backend": str(db_engine.url)}
        return {"status": "deferred"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


def _check_ccxt():
    try:
        import ccxt
        return {"status": "ok", "version": getattr(ccxt, "__version__", "unknown")}
    except ImportError:
        return {"status": "unavailable"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


def create_app(title: str = "Trading Engine API") -> FastAPI:
    app = FastAPI(title=title, version="0.2.0", lifespan=lifespan)

    raw_origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
    cors_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    logger.info("No authentication — all routes open")

    app.include_router(signals.router)
    app.include_router(portfolio.router)
    app.include_router(market_data.router)
    app.include_router(metrics.router)
    app.include_router(stream.router)
    app.include_router(trades.router)
    app.include_router(backtest_routes.router)
    app.include_router(chart_routes.router)
    app.include_router(bars_routes.router)
    app.include_router(hedge_fund.router)
    app.include_router(flows.router)
    app.include_router(structure.router)
    app.include_router(cfa.router)
    app.include_router(mmc.router)
    app.include_router(config.router)
    app.include_router(orders_router)
    app.include_router(positions_router)
    app.include_router(risk_router)
    app.include_router(paper_router)
    app.include_router(ws_router)
    app.include_router(global_market.router)
    app.include_router(agent_v1)
    app.include_router(portfolio_opt_router)
    app.include_router(factor_analysis_router)
    app.include_router(rl_training_router)
    app.include_router(sql_research_router)
    app.include_router(finscript_router)
    app.include_router(ta_router)
    app.include_router(alpha_zoo_router)
    app.include_router(geo_analysis_router)
    app.include_router(experiment_router)
    app.include_router(swarm_router)
    app.include_router(hypothesis_router)
    app.include_router(china_markets_router)
    app.include_router(backtest_cache_router)
    app.include_router(protections_router)
    app.include_router(pairlists_router)
    app.include_router(debate_router)
    app.include_router(providers_router)
    app.include_router(mcp_router)
    app.include_router(workflow_router)
    app.include_router(hyperopt_router)
    app.include_router(signals_stream_router)
    app.include_router(risk_live_router)
    app.include_router(portfolio_whatif_router)
    app.include_router(strategy_clone_router)
    app.include_router(llm_router)

    @app.get("/")
    async def root():
        return RedirectResponse(url="/docs")

    @app.get("/health")
    async def health():
        return {
            "status": "ok",
            "uptime_seconds": int(time.time() - _start_time),
            "dependencies": {
                "database": _check_db(),
                "ccxt": _check_ccxt(),
            },
        }

    return app
