from __future__ import annotations

import os
import time
import uuid
import asyncio
import logging
import signal
from contextlib import asynccontextmanager
from contextvars import ContextVar
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import RedirectResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

request_id_var: ContextVar[str] = ContextVar("request_id", default="")
_shutting_down = False

import re as _re

# ── PII redaction ──
_PII_PATTERNS = [
    (_re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', _re.IGNORECASE), '***EMAIL***'),
    (_re.compile(r'(?<!\d)(\d{3}[-.]?\d{3}[-.]?\d{4})(?!\d)', _re.IGNORECASE), '***PHONE***'),
    (_re.compile(r'(api[_-]?key|apikey|secret|password|token)["\s:=]+\S+', _re.IGNORECASE), lambda m: m.group(1) + '=***REDACTED***'),
    (_re.compile(r'Bearer\s+\S+', _re.IGNORECASE), 'Bearer ***REDACTED***'),
]


class PiiRedactFilter(logging.Filter):
    def _redact(self, text: str) -> str:
        for pattern, replacement in _PII_PATTERNS:
            text = pattern.sub(replacement, text)
        return text

    def filter(self, record):
        if hasattr(record, 'msg') and isinstance(record.msg, str):
            record.msg = self._redact(record.msg)
        if hasattr(record, 'args') and record.args:
            sanitized = []
            for arg in record.args:
                if isinstance(arg, str):
                    arg = self._redact(arg)
                sanitized.append(arg)
            record.args = tuple(sanitized)
        return True


class RequestIdFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id_var.get() or "-"
        return True


logging.getLogger().addFilter(RequestIdFilter())
logging.getLogger().addFilter(PiiRedactFilter())
_log_fmt = os.environ.get("LOG_FORMAT", "dev")
if _log_fmt != "json":
    for h in logging.getLogger().handlers:
        if h.formatter and not h.formatter._fmt.startswith("[%(request_id)s"):
            h.setFormatter(logging.Formatter("[%(request_id)s] %(levelname)s %(name)s: %(message)s", defaults={"request_id": "-"}))

_STRUCTLOG_AVAILABLE = False
_LOG_FORMAT = os.environ.get("LOG_FORMAT", "dev")  # dev | json
try:
    import structlog
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]
    if _LOG_FORMAT == "json":
        shared_processors.append(structlog.processors.JSONRenderer())
    else:
        shared_processors.append(structlog.dev.ConsoleRenderer())
    structlog.configure(
        processors=shared_processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
    _STRUCTLOG_AVAILABLE = True
    logging.getLogger(__name__).info("structlog configured")
except ImportError:
    logging.getLogger(__name__).info("structlog not installed — using standard logging")


def get_logger(name: str = __name__):
    if _STRUCTLOG_AVAILABLE:
        import structlog
        return structlog.get_logger(name)
    return logging.getLogger(name)


def bind_context(request_id: str = "", user_id: str = "", **kwargs):
    if _STRUCTLOG_AVAILABLE:
        import structlog
        structlog.contextvars.bind_contextvars(request_id=request_id, user_id=user_id, **kwargs)


from .routes import backtest_routes, bars_routes, cfa, chart_routes, config, flows, hedge_fund, market_data, metrics, mmc, portfolio, signals, stream, structure, trades, global_market
from .routes.ws import router as ws_router
from .routes.motd import router as motd_router
from .routes.news_sidebar import router as news_sidebar_router
from .routes.calendar_sidebar import router as calendar_sidebar_router
from .routes.chat_ws import router as chat_ws_router
from .websocket_manager import manager as ws_manager
from .state import seed_demo_data
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
from data.providers import global_provider_registry
from data.yfinance_provider import YFinanceProvider
from .routes.ta_routes import router as ta_router
from .routes.correlation_routes import router as correlation_router
from .routes.workspace_routes import router as workspace_router
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
from .routes.agent import personas as agent_personas
from .routes.signals_stream import router as signals_stream_router
from .routes.risk_live import router as risk_live_router
from .routes.portfolio_whatif import router as portfolio_whatif_router
from .routes.strategy_clone import router as strategy_clone_router
from .routes.llm import router as llm_router
from .routes.briefing import router as briefing_router
from .routes.network_co_movement import router as co_movement_router
from .routes.earnings_summary import router as earnings_summary_router
from .routes.ai_strategy import router as ai_strategy_router
from .routes.ai_indicator import router as ai_indicator_router
from .routes.ai_inspector import router as ai_inspector_router
from .routes.llm_query import router as llm_query_router
from .routes.screener_routes import router as screener_router
from .routes.renaissance import router as renaissance_router
from .routes.integrations_routes import router as integrations_router
from .routes.analytics_routes import router as analytics_router
from .routes.audit_routes import router as audit_router
from .routes.providers_v2 import router as providers_v2_router
from .routes.hypotheses_v2 import router as hypotheses_v2_router
from .routes.market_intel import router as market_intel_router
from .routes.broker_routes import router as broker_router
from .routes.options_routes import router as options_router
from .routes.calendar_routes import router as calendar_router
from .routes.strategy_health import router as strategy_health_router
from .routes.auto_tag_trades import router as auto_tag_trades_router
from .routes.explain_pnl import router as explain_pnl_router
from .routes.prompts import router as prompts_router
from .routes.leaderboard import router as leaderboard_router
from .routes.auth import router as auth_router
from .routes.explain_stops import router as explain_stops_router
from .routes.trade_coach import router as trade_coach_router
from .routes.risk_report import router as risk_report_router
from .routes.monte_carlo_routes import router as monte_carlo_router
from .scheduler import create_scheduler, register_job, get_run_history, get_job_status
from .routes.walkforward_routes import router as walkforward_router
from .routes.scenario_routes import router as scenario_router
from .routes.memory_routes import router as memory_router
from .routes.calibration_routes import router as calibration_router
from .routes.reflection_routes import router as reflection_router
from .routes.wall_clock_routes import router as wall_clock_router
from .routes.panic import router as panic_router
from .routes.tradingagents_routes import router as tradingagents_router
from .routes.alt_data_routes import router as alt_data_router
from .routes.marketplace_routes import router as marketplace_router
from .routes.health_routes import router as health_router
from .routes.apikey import router as apikey_router
from .routes.latency import router as latency_router
from .routes.traffic import router as traffic_router
from .routes.health_detailed import router as health_detailed_router
from .routes.master_contract_status import router as master_contract_router
from .routes.action_center import router as action_center_router
from .routes.sandbox import router as sandbox_router
from .routes.analyzer import router as analyzer_router
from .routes.smart_order import router as smart_order_router
from .routes.split_order import router as split_order_router
from .routes.basket_order import router as basket_order_router
from .routes.pnltracker import router as pnltracker_router
from .routes.security_dashboard import router as security_dashboard_router
from .routes.gtt import router as gtt_router
from .routes.python_strategy import router as python_strategy_router
from .routes.flow import router as flow_router
from .routes.market_holidays import router as market_holidays_router
from .routes.market_timings import router as market_timings_router
from .routes.multiquotes import router as multiquotes_router
from .routes.multi_option_greeks import router as multi_option_greeks_router
from .routes.ws_proxy import router as ws_proxy_router
from .routes.mcp_oauth import router as mcp_oauth_router, wellknown_router as mcp_wellknown_router
from .routes.chartink import router as chartink_router
from .routes.historify import router as historify_router
from .routes.tv_webhook import router as tv_webhook_router
from .routes.gc_webhook import router as gc_webhook_router
from .routes.playground import router as playground_router
from .routes.whatsapp import router as whatsapp_router
from .routes.strategy_portfolio import router as strategy_portfolio_router
from .routes.security_routes import router as security_admin_router
from .routes.symbols import router as symbols_router
from persistence import init_db, close_db
from persistence.database import _engine as db_engine
from persistence.multi_db import multi_db as openalgo_multi_db
from api.utils.health_monitor import start_health_monitoring
from api.services.broker_keepalive_service import start_broker_keepalive, stop_broker_keepalive
from .state import app_state

logger = logging.getLogger(__name__)

_start_time = time.time()

_background_tasks: list[asyncio.Task] = []
_scheduler = None
_request_latencies: dict[str, list[float]] = {}
_metrics_lock = asyncio.Lock()
_app_instance: FastAPI | None = None


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int, minimum: int | None = None) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except Exception:
        value = default
    if minimum is not None:
        value = max(minimum, value)
    return value


async def _market_news_loop():
    from .market_intel import refresh_market_news_snapshots

    refresh_interval = _env_int("MARKET_NEWS_REFRESH_INTERVAL", 3600, minimum=300)
    await asyncio.sleep(3)
    while True:
        try:
            result = await asyncio.to_thread(refresh_market_news_snapshots)
            logger.info("Market Intel: Refreshed news snapshots: inserted=%s errors=%d",
                        result.get("inserted_categories", 0), len(result.get("errors", {})))
        except Exception as e:
            logger.error("Market Intel Error: %s", e)
        logger.info("Market Intel: Next news refresh in %d seconds", refresh_interval)
        await asyncio.sleep(refresh_interval)


async def _macro_signal_loop():
    from .market_intel import refresh_macro_signal_snapshot

    refresh_interval = _env_int("MACRO_SIGNAL_REFRESH_INTERVAL", 3600, minimum=300)
    await asyncio.sleep(6)
    while True:
        try:
            result = await asyncio.to_thread(refresh_macro_signal_snapshot)
            logger.info("Market Intel: Refreshed macro signals: verdict=%s signals=%d",
                        result.get("verdict"), result.get("total_count", 0))
        except Exception as e:
            logger.error("Macro Signal Error: %s", e)
        logger.info("Market Intel: Next macro signal refresh in %d seconds", refresh_interval)
        await asyncio.sleep(refresh_interval)


async def _etf_flow_loop():
    from .market_intel import refresh_etf_flow_snapshot

    refresh_interval = _env_int("ETF_FLOW_REFRESH_INTERVAL", 3600, minimum=300)
    await asyncio.sleep(9)
    while True:
        try:
            result = await asyncio.to_thread(refresh_etf_flow_snapshot)
            logger.info("Market Intel: Refreshed ETF flows: direction=%s tracked=%d",
                        result.get("direction"), result.get("tracked_count", 0))
        except Exception as e:
            logger.error("ETF Flow Error: %s", e)
        logger.info("Market Intel: Next ETF flow refresh in %d seconds", refresh_interval)
        await asyncio.sleep(refresh_interval)


async def _stock_analysis_loop():
    from .market_intel import refresh_stock_analysis_snapshots

    refresh_interval = _env_int("STOCK_ANALYSIS_REFRESH_INTERVAL", 7200, minimum=600)
    await asyncio.sleep(12)
    while True:
        try:
            result = await asyncio.to_thread(refresh_stock_analysis_snapshots)
            logger.info("Market Intel: Refreshed stock analysis: inserted=%s errors=%d",
                        result.get("inserted_symbols", 0), len(result.get("errors", {})))
        except Exception as e:
            logger.error("Stock Analysis Error: %s", e)
        logger.info("Market Intel: Next stock analysis refresh in %d seconds", refresh_interval)
        await asyncio.sleep(refresh_interval)


_BACKGROUND_TASK_REGISTRY: dict[str, callable] = {
    "market_news": _market_news_loop,
    "macro_signals": _macro_signal_loop,
    "etf_flows": _etf_flow_loop,
    "stock_analysis": _stock_analysis_loop,
}


def get_enabled_background_tasks() -> list[str]:
    raw = os.getenv("TRADING_ENGINE_BACKGROUND_TASKS", "market_news,macro_signals,etf_flows,stock_analysis")
    return [name.strip() for name in raw.split(",") if name.strip() in _BACKGROUND_TASK_REGISTRY]


async def _run_with_restart(task_name: str, task_func: callable, retry_delay: int = 60):
    """Run a background task with automatic restart on failure and exponential backoff."""
    max_delay = 300
    delay = retry_delay
    while True:
        try:
            await task_func()
        except asyncio.CancelledError:
            logger.info("Background task '%s' cancelled, stopping permanently", task_name)
            break
        except Exception as e:
            logger.error("Background task '%s' failed with %s: %s — restarting in %ds",
                         task_name, type(e).__name__, e, delay)
        await asyncio.sleep(delay)
        delay = min(delay * 2, max_delay)


def _log_task_failure(task: asyncio.Task):
    exc = task.exception()
    if exc and not isinstance(exc, asyncio.CancelledError):
        logger.error("Background task '%s' failed: %s", task.get_name(), exc)


def start_background_tasks():
    global _background_tasks, _scheduler
    _background_tasks = [t for t in _background_tasks if not t.done()]

    _scheduler = create_scheduler()
    if _scheduler:
        # APScheduler mode — register jobs with retry + observability
        for name in get_enabled_background_tasks():
            from .market_intel import refresh_market_news_snapshots, refresh_macro_signal_snapshot, refresh_etf_flow_snapshot, refresh_stock_analysis_snapshots
            _FN_MAP = {
                "market_news": refresh_market_news_snapshots,
                "macro_signals": refresh_macro_signal_snapshot,
                "etf_flows": refresh_etf_flow_snapshot,
                "stock_analysis": refresh_stock_analysis_snapshots,
            }
            fn = _FN_MAP.get(name)
            if fn:
                interval = int(os.environ.get(f"{name.upper()}_INTERVAL", "3600"))
                register_job(_scheduler, name, fn, interval)
        _scheduler.start()
    else:
        # Legacy mode — asyncio background tasks with auto-restart
        for name in get_enabled_background_tasks():
            task_func = _BACKGROUND_TASK_REGISTRY[name]
            logger.info("Starting background task with auto-restart: %s", name)
            wrapped = lambda n=name, f=task_func: _run_with_restart(n, f)
            t = asyncio.create_task(wrapped(), name=f"trading-engine:{name}")
            t.add_done_callback(_log_task_failure)
            _background_tasks.append(t)

    # WS manager tasks always run as asyncio tasks
    t = asyncio.create_task(ws_manager.periodic_cleanup(), name="trading-engine:ws-cleanup")
    t.add_done_callback(_log_task_failure)
    _background_tasks.append(t)
    t2 = asyncio.create_task(ws_manager.heartbeat_loop(), name="trading-engine:ws-heartbeat")
    t2.add_done_callback(_log_task_failure)
    _background_tasks.append(t2)


# ── Startup / Shutdown helpers (called by _lifespan) ──

async def _startup():
    global _shutting_down
    try:
        await asyncio.wait_for(init_db(), timeout=30)
    except asyncio.TimeoutError:
        logger.warning("Database init timed out — continuing startup")
    except Exception as e:
        logger.warning("Database init failed: %s — continuing startup", e)
    try:
        await asyncio.wait_for(seed_demo_data(), timeout=60)
    except asyncio.TimeoutError:
        logger.warning("Demo data seeding timed out — continuing startup")
    except Exception as e:
        logger.warning("Demo data seeding failed: %s — continuing startup", e)

    try:
        await openalgo_multi_db.init_all()
        logger.info("OpenAlgo multi-database initialized")
    except Exception as e:
        logger.warning("Failed to initialize OpenAlgo multi-database: %s", e)

    try:
        import json
        from sqlalchemy import select
        from persistence.database import _session_factory
        from persistence.models import ApiKey
        from data.registry import registry
        from data.providers import global_provider_registry
        async with _session_factory() as session:
            stmt = select(ApiKey).where(ApiKey.is_active == 1)
            result = await session.execute(stmt)
            keys = result.scalars().all()
            for key in keys:
                try:
                    config = json.loads(key.key_value)
                    if key.provider in registry._providers:
                        registry._providers[key.provider].credentials.update(config)
                        logger.info("Restored credentials for registry provider: %s", key.provider)
                    p = global_provider_registry.get(key.provider)
                    if p and hasattr(p, "credentials") and isinstance(p.credentials, dict):
                        p.credentials.update(config)
                        logger.info("Restored credentials for global provider: %s", key.provider)
                except Exception as ex:
                    logger.warning("Failed to restore credentials for %s: %s", key.provider, ex)
    except Exception as e:
        logger.warning("Failed to load API keys: %s", e)

    try:
        yfinance_provider = YFinanceProvider()
        global_provider_registry.register(yfinance_provider, enabled=True)
        logger.info("Registered YFinance provider")
    except Exception as e:
        logger.warning("Failed to register YFinance: %s", e)

    if _env_bool("TRADING_ENGINE_MARKET_INTEL_ENABLED", True):
        try:
            start_background_tasks()
        except Exception as e:
            logger.warning("start_background_tasks failed: %s", e)

    try:
        if _env_bool("HEALTH_MONITOR_ENABLED", True):
            start_health_monitoring()
    except Exception as e:
        logger.warning("Failed to start health monitoring: %s", e)

    try:
        await app_state.restore()
        t = asyncio.create_task(app_state.persist_loop(), name="trading-engine:state-persist")
        _background_tasks.append(t)
    except Exception as e:
        logger.warning("Failed to start state persist: %s", e)

    try:
        await start_broker_keepalive(_app_instance)
    except Exception as e:
        logger.warning("Failed to start broker keepalive: %s", e)

    try:
        from api.services.security_service import security_service
        security_service.cleanup_expired_bans()
    except Exception as e:
        logger.warning("Failed to cleanup bans: %s", e)

    try:
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            try:
                loop.add_signal_handler(sig, lambda s=sig: asyncio.create_task(_handle_shutdown(s)))
            except NotImplementedError:
                pass
    except Exception:
        pass


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


def _check_yfinance():
    try:
        import yfinance as yf
        ticker = yf.Ticker("SPY")
        hist = ticker.history(period="1d")
        if hist is not None and not hist.empty:
            return {"status": "ok", "last_close": float(hist["Close"].iloc[-1])}
        return {"status": "degraded", "detail": "empty response"}
    except ImportError:
        return {"status": "unavailable"}
    except Exception as e:
        return {"status": "error", "detail": str(e)[:100]}


def _check_disk():
    try:
        import shutil
        usage = shutil.disk_usage(".")
        free_gb = usage.free / (1024 ** 3)
        status = "ok" if free_gb > 0.5 else "degraded"
        return {"status": status, "free_gb": round(free_gb, 1), "total_gb": round(usage.total / (1024 ** 3), 1)}
    except Exception as e:
        return {"status": "error", "detail": str(e)[:100]}


def _check_llm_connectivity() -> dict:
    results = {}
    providers = [
        ("OPENAI_API_KEY", "OpenAI"),
        ("ANTHROPIC_API_KEY", "Anthropic"),
        ("GROQ_API_KEY", "Groq"),
        ("DEEPSEEK_API_KEY", "DeepSeek"),
        ("GOOGLE_API_KEY", "Google"),
        ("XAI_API_KEY", "xAI"),
    ]
    for env_key, name in providers:
        value = os.getenv(env_key)
        if value:
            results[name.lower()] = {"status": "configured"}
        else:
            results[name.lower()] = {"status": "not_configured"}
    lm_studio_url = os.getenv("LMSTUDIO_BASE_URL", "http://localhost:1234/v1")
    results["lm_studio"] = {"status": "configured" if os.getenv("LMSTUDIO_BASE_URL") else "not_configured", "url": lm_studio_url}
    return results


async def _handle_shutdown(sig: signal.Signals):
    global _shutting_down
    _shutting_down = True
    logger.warning("Received signal %s, initiating graceful shutdown", sig.name)


async def _shutdown():
    global _shutting_down
    _shutting_down = True
    logger.warning("Shutdown phase 1/3: stop accepting new requests")
    await asyncio.sleep(0.5)
    logger.warning("Shutdown phase 2/3: drain in-flight requests")
    drain_deadline = time.time() + 30
    while time.time() < drain_deadline:
        active = [t for t in _background_tasks if not t.done()]
        if not active:
            break
        await asyncio.sleep(1)
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
    for task in _background_tasks:
        task.cancel()
    if _background_tasks:
        await asyncio.wait(_background_tasks, timeout=10)
    await stop_broker_keepalive(_app_instance)
    await close_db()
    try:
        await openalgo_multi_db.close_all()
    except Exception as e:
        logger.warning("Error closing OpenAlgo databases: %s", e)
    logger.warning("Shutdown phase 3/3: complete")


@asynccontextmanager
async def _lifespan(app: FastAPI):
    await _startup()
    yield
    await _shutdown()


def create_app(title: str = "Trading Engine API") -> FastAPI:
    global _app_instance
    app = FastAPI(title=title, version="0.2.0", lifespan=_lifespan)
    _app_instance = app

    from .middleware.cors import get_cors_config
    cors_config = get_cors_config()
    app.add_middleware(CORSMiddleware, **cors_config)

    app.add_middleware(GZipMiddleware, minimum_size=1000)

    from .middleware.traffic_logger import TrafficLoggerMiddleware
    from .middleware.traffic_security import SecurityMiddleware
    from .middleware.security_middleware import SecurityMiddleware as IpBanMiddleware
    from .middleware.csp import CSPMiddleware
    from .middleware.csrf import CSRFMiddleware
    app.add_middleware(TrafficLoggerMiddleware)
    app.add_middleware(SecurityMiddleware)
    app.add_middleware(IpBanMiddleware)
    app.add_middleware(CSPMiddleware)
    app.add_middleware(CSRFMiddleware)

    @app.middleware("http")
    async def cache_control_middleware(request: Request, call_next):
        response = await call_next(request)
        if request.method == "GET" and response.status_code == 200:
            path = request.url.path
            # Static/rarely-changing endpoints: cache 60s browser, 10s shared
            if path in ("/health", "/healthz", "/api/health"):
                response.headers["Cache-Control"] = "no-cache, no-store"
            elif path in ("/metrics",):
                response.headers["Cache-Control"] = "no-cache"
            elif path.startswith("/llm/models"):
                response.headers["Cache-Control"] = "public, max-age=300"
            elif path.startswith("/market/news"):
                response.headers["Cache-Control"] = "public, max-age=60"
            # Portfolio/signals: short cache to avoid stale data
            elif path.startswith("/portfolio") or path.startswith("/signals"):
                response.headers["Cache-Control"] = "no-cache, max-age=5"
            else:
                # Default: 5s browser cache
                response.headers.setdefault("Cache-Control", "public, max-age=5")
            # Set X-Request-Id for tracing
            rid = getattr(request.state, "request_id", "")
            if rid:
                response.headers["X-Request-Id"] = rid
        return response

    @app.middleware("http")
    async def etag_middleware(request: Request, call_next):
        response = await call_next(request)
        if request.method == "GET" and response.status_code == 200 and hasattr(response, 'body') and response.body:
            if request.url.path in ("/portfolio", "/api/portfolio", "/request-metrics"):
                import hashlib
                etag = hashlib.md5(response.body).hexdigest()
                response.headers["ETag"] = f'"{etag}"'
                if_none_match = request.headers.get("if-none-match", "")
                if if_none_match.strip('"') == etag:
                    from fastapi.responses import Response
                    return Response(status_code=304)
        return response

    @app.middleware("http")
    async def shutdown_middleware(request: Request, call_next):
        if _shutting_down:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=503, content={"detail": "Server shutting down"})
        return await call_next(request)

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        request.state.request_id = request_id
        token = request_id_var.set(request_id)
        structlog_ctx = None
        if _STRUCTLOG_AVAILABLE:
            try:
                import structlog
                structlog_ctx = structlog.contextvars.bind_contextvars(request_id=request_id)
            except Exception:
                pass
        _start = time.time()
        try:
            response = await call_next(request)
            response.headers["X-Request-Id"] = request_id
            elapsed = time.time() - _start
            route = request.url.path
            async with _metrics_lock:
                _request_latencies.setdefault(route, []).append(elapsed)
                if len(_request_latencies[route]) > 100:
                    _request_latencies[route] = _request_latencies[route][-100:]
            return response
        finally:
            request_id_var.reset(token)

    @app.middleware("http")
    async def audit_middleware(request: Request, call_next):
        response = await call_next(request)
        if request.method in ("POST", "PUT", "PATCH", "DELETE") and not request.url.path.startswith("/ws"):
            try:
                body = await request.body()
                body_preview = body[:200].decode("utf-8", errors="replace") if body else ""
            except Exception:
                body_preview = ""
            details = {
                "method": request.method,
                "path": request.url.path,
                "query": str(request.url.query),
                "body": body_preview,
                "status": response.status_code,
                "request_id": getattr(request.state, "request_id", ""),
            }
            log_entry = {
                "action": f"{request.method} {request.url.path}",
                "entity_type": request.url.path.split("/")[1] if request.url.path.count("/") >= 1 else "",
                "entity_id": request.url.path.split("/")[-1] if request.url.path.count("/") >= 2 else "",
                "details": details,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            try:
                from .routes.audit_routes import _audit_logs
                _audit_logs.append(log_entry)
                if len(_audit_logs) > 5000:
                    _audit_logs[:len(_audit_logs) - 5000] = []
            except Exception:
                pass
        return response

    limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    from .error_handlers import global_error_handler
    from core.errors import TradingEngineError
    app.add_exception_handler(TradingEngineError, global_error_handler)
    app.add_exception_handler(Exception, global_error_handler)

    # ── Prometheus metrics ──
    if _env_bool("PROMETHEUS_ENABLED", False):
        try:
            from prometheus_fastapi_instrumentator import Instrumentator
            Instrumentator().instrument(app).expose(app, endpoint="/metrics")
            logger.info("Prometheus metrics enabled at /metrics")
        except ImportError:
            logger.info("prometheus-fastapi-instrumentator not installed — skipping Prometheus")

    # ── Sentry APM ──
    sentry_dsn = os.environ.get("SENTRY_DSN", "")
    if sentry_dsn:
        try:
            import sentry_sdk
            sentry_sdk.init(
                dsn=sentry_dsn,
                traces_sample_rate=float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
                environment=os.environ.get("ENV", "development"),
            )
            logger.info("Sentry APM enabled")
        except ImportError:
            logger.info("sentry-sdk not installed — skipping Sentry")

    # ── DataDog APM ──
    if _env_bool("DATADOG_ENABLED", False):
        try:
            from ddtrace import patch_all
            patch_all()
            logger.info("DataDog APM enabled")
        except ImportError:
            logger.info("ddtrace not installed — skipping DataDog")

    auth_key = os.getenv("TRADING_ENGINE_API_KEY") or os.getenv("API_KEY")
    is_prod = os.getenv("ENV", "development").lower() == "production" or _env_bool("PRODUCTION", False)

    if auth_key or is_prod:
        actual_key = auth_key or "admin-default-key"
        if is_prod and not auth_key:
            logger.warning("WARNING: Running in production mode without TRADING_ENGINE_API_KEY! Defaulting key to 'admin-default-key'.")
        
        from fastapi import Request
        from fastapi.responses import JSONResponse

        @app.middleware("http")
        async def api_key_auth_middleware(request: Request, call_next):
            path = request.url.path
            # Allow Swagger docs, root redirect, and health endpoints without authentication
            if path in ("/", "/docs", "/redoc", "/openapi.json", "/health", "/api/health") or path.startswith("/ws"):
                return await call_next(request)
            
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Missing or invalid Authorization header. Expected 'Bearer <key>'"}
                )
            
            token = auth_header.split(" ", 1)[1]
            if token != actual_key:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Unauthorized: Invalid API key"}
                )
                
            return await call_next(request)
        logger.info(f"API key bearer validation enabled (required token: '{actual_key[:4]}***')")
    else:
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
    app.include_router(correlation_router)
    app.include_router(workspace_router)
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
    app.include_router(briefing_router)
    app.include_router(co_movement_router)
    app.include_router(earnings_summary_router)
    app.include_router(ai_strategy_router)
    app.include_router(ai_indicator_router)
    app.include_router(ai_inspector_router)
    app.include_router(llm_query_router)
    app.include_router(screener_router)
    app.include_router(renaissance_router)
    app.include_router(integrations_router)
    app.include_router(analytics_router)
    app.include_router(audit_router)
    app.include_router(providers_v2_router)
    app.include_router(hypotheses_v2_router)
    app.include_router(market_intel_router)
    app.include_router(broker_router)
    app.include_router(options_router)
    app.include_router(calendar_router)
    app.include_router(motd_router)
    app.include_router(news_sidebar_router)
    app.include_router(calendar_sidebar_router)
    app.include_router(chat_ws_router)
    app.include_router(strategy_health_router)
    app.include_router(auto_tag_trades_router)
    app.include_router(explain_pnl_router)
    app.include_router(prompts_router)
    app.include_router(leaderboard_router)
    app.include_router(explain_stops_router)
    app.include_router(trade_coach_router)
    app.include_router(risk_report_router)
    app.include_router(monte_carlo_router)
    app.include_router(walkforward_router)
    app.include_router(scenario_router)
    app.include_router(memory_router)
    app.include_router(calibration_router)
    app.include_router(reflection_router)
    app.include_router(wall_clock_router)
    app.include_router(auth_router)
    app.include_router(panic_router)
    app.include_router(tradingagents_router)
    app.include_router(alt_data_router)
    app.include_router(marketplace_router)
    app.include_router(health_router)
    app.include_router(apikey_router)
    app.include_router(latency_router)
    app.include_router(traffic_router)
    app.include_router(health_detailed_router)
    app.include_router(master_contract_router)
    app.include_router(action_center_router)
    app.include_router(sandbox_router)
    app.include_router(analyzer_router)
    app.include_router(smart_order_router)
    app.include_router(basket_order_router)
    app.include_router(split_order_router)
    app.include_router(pnltracker_router)
    app.include_router(security_dashboard_router)
    app.include_router(gtt_router)
    app.include_router(python_strategy_router)
    app.include_router(flow_router)
    app.include_router(market_holidays_router)
    app.include_router(market_timings_router)
    app.include_router(multiquotes_router)
    app.include_router(multi_option_greeks_router)
    app.include_router(ws_proxy_router)
    app.include_router(mcp_oauth_router)
    app.include_router(mcp_wellknown_router)
    app.include_router(chartink_router)
    app.include_router(tv_webhook_router)
    app.include_router(gc_webhook_router)
    app.include_router(historify_router)
    app.include_router(playground_router)
    app.include_router(whatsapp_router)
    app.include_router(strategy_portfolio_router)
    app.include_router(security_admin_router)
    app.include_router(symbols_router)

    @app.get("/")
    async def root():
        return RedirectResponse(url="/docs")

    @app.get("/health")
    async def health():
        dep_db = _check_db()
        dep_ccxt = _check_ccxt()
        dep_yfinance = _check_yfinance()
        dep_disk = _check_disk()
        dep_llm = _check_llm_connectivity()
        n_tasks = sum(1 for t in _background_tasks if not t.done())
        return {
            "status": "ok" if dep_db.get("status") == "ok" else "degraded",
            "uptime_seconds": int(time.time() - _start_time),
            "background_tasks_running": n_tasks,
            "shutting_down": _shutting_down,
            "dependencies": {
                "database": dep_db,
                "ccxt": dep_ccxt,
                "yfinance": dep_yfinance,
                "disk": dep_disk,
                "llm": dep_llm,
            },
        }

    @app.get("/healthz")
    async def healthz():
        dep_db = _check_db()
        dep_ccxt = _check_ccxt()
        dep_yfinance = _check_yfinance()
        dep_disk = _check_disk()
        dep_llm = _check_llm_connectivity()
        all_ok = all(d.get("status") == "ok" for d in (dep_db, dep_ccxt, dep_yfinance, dep_disk))
        status_code = 200 if all_ok else 503
        from fastapi.responses import JSONResponse
        return JSONResponse(
            content={
                "status": "ok" if all_ok else "degraded",
                "uptime_seconds": int(time.time() - _start_time),
                "shutting_down": _shutting_down,
                "dependencies": {
                    "database": dep_db,
                    "ccxt": dep_ccxt,
                    "yfinance": dep_yfinance,
                    "disk": dep_disk,
                    "llm": dep_llm,
                },
            },
            status_code=status_code,
        )

    @app.get("/api/health")
    async def api_health():
        return await health()

    @app.get("/exchanges/health")
    async def exchange_health():
        from execution.exchanges.factory import create_exchange_client
        exchanges = ["binance", "coinbase", "kraken", "bybit", "okx"]
        results = {}
        for name in exchanges:
            try:
                client = create_exchange_client(exchange=name)
                ticker = await asyncio.to_thread(lambda c=client: c.fetch_ticker("BTC/USDT"))
                results[name] = {"status": "ok", "bid": ticker.get("bid"), "ask": ticker.get("ask"), "error": None}
            except Exception as e:
                results[name] = {"status": "error", "error": str(e)[:100]}
        return results

    @app.get("/request-metrics")
    async def request_metrics():
        async with _metrics_lock:
            route_stats = {}
            for route, latencies in _request_latencies.items():
                route_stats[route] = {
                    "count": len(latencies),
                    "avg_ms": round(sum(latencies) / len(latencies) * 1000, 2) if latencies else 0,
                    "max_ms": round(max(latencies) * 1000, 2) if latencies else 0,
                }
        return {
            "uptime_seconds": int(time.time() - _start_time),
            "background_tasks": sum(1 for t in _background_tasks if not t.done()),
            "routes": route_stats,
        }

    @app.get("/scheduler/status")
    async def scheduler_status():
        return get_job_status()

    @app.get("/scheduler/history")
    async def scheduler_history(job: str = "", limit: int = 20):
        return get_run_history(job_name=job or None, limit=limit)

    return app


app = create_app()
