from fastapi import APIRouter
import os
import time
import logging

router = APIRouter(tags=["health"])
logger = logging.getLogger(__name__)

_start_time = time.time()


def _check_env_var(name: str) -> dict:
    value = os.getenv(name)
    if value:
        masked = value[:4] + "****" if len(value) > 4 else "****"
        return {"status": "configured", "key_preview": masked}
    return {"status": "not_configured"}


def _check_lm_studio() -> dict:
    base_url = os.getenv("LMSTUDIO_BASE_URL", "http://localhost:1234/v1")
    try:
        import httpx
        r = httpx.get(f"{base_url}/models", timeout=3)
        if r.status_code == 200:
            data = r.json()
            models = [m.get("id", "unknown") for m in (data if isinstance(data, list) else data.get("data", []))]
            return {"status": "running", "models": models[:5], "url": base_url}
        return {"status": "error", "detail": f"HTTP {r.status_code}", "url": base_url}
    except ImportError:
        return {"status": "unknown", "detail": "httpx not installed"}
    except Exception as e:
        return {"status": "not_running", "detail": str(e)[:100], "suggestion": "Start LM Studio and load a model on port 1234", "url": base_url}


def _check_llm_providers() -> dict:
    providers = {}
    for key, name in [
        ("OPENAI_API_KEY", "OpenAI"),
        ("ANTHROPIC_API_KEY", "Anthropic"),
        ("GROQ_API_KEY", "Groq"),
        ("DEEPSEEK_API_KEY", "DeepSeek"),
        ("GOOGLE_API_KEY", "Google"),
        ("XAI_API_KEY", "xAI"),
    ]:
        providers[name.lower()] = _check_env_var(key)
    return providers


def _check_data_providers() -> dict:
    return {
        "finnhub": _check_env_var("FINNHUB_API_KEY"),
        "fred": _check_env_var("FRED_API_KEY"),
        "alpha_vantage": _check_env_var("ALPHA_VANTAGE_API_KEY"),
    }


def _check_brokers() -> dict:
    alpaca_key = os.getenv("APCA_API_KEY_ID")
    return {
        "alpaca": {"status": "configured" if alpaca_key else "not_configured"},
        "paper_trading": {"status": "available"},
    }


@router.get("/health/llm")
async def health_llm():
    return {
        "lm_studio": _check_lm_studio(),
        "providers": _check_llm_providers(),
    }


@router.get("/health/data")
async def health_data():
    return {
        "providers": _check_data_providers(),
        "yfinance": "available",
    }


@router.get("/health/connections")
async def health_connections():
    from api.app import _shutting_down
    return {
        "server": {
            "status": "shutting_down" if _shutting_down else "running",
            "uptime_seconds": int(time.time() - _start_time),
        },
        "brokers": _check_brokers(),
        "background_tasks": [], 
    }


@router.get("/health/detailed")
async def health_detailed():
    from api.app import _shutting_down, _background_tasks
    llm_status = _check_llm_providers()
    lm_studio = _check_lm_studio()
    data_providers = _check_data_providers()
    brokers = _check_brokers()
    n_tasks = sum(1 for t in _background_tasks if not t.done()) if _background_tasks else 0

    issues = []
    if lm_studio["status"] == "not_running":
        issues.append({
            "severity": "warning",
            "service": "lm_studio",
            "title": "LM Studio is not running",
            "message": "LM Studio is required for AI agent features but is not running.",
            "suggestion": "Start LM Studio and load a model on port 1234.",
            "docs_url": "/docs/troubleshooting#lm-studio",
        })
    if llm_status.get("openai", {}).get("status") != "configured":
        issues.append({
            "severity": "info",
            "service": "openai",
            "title": "OpenAI API key not configured",
            "message": "Some AI features require an OpenAI API key.",
            "suggestion": "Go to Settings to add your OpenAI API key.",
            "docs_url": "/docs/troubleshooting#api-keys",
        })
    if data_providers.get("finnhub", {}).get("status") != "configured":
        issues.append({
            "severity": "info",
            "service": "finnhub",
            "title": "Finnhub API key not configured",
            "message": "Market data features work without it, but some will be limited.",
            "suggestion": "Add your Finnhub API key for full market data.",
        })
    if _shutting_down:
        issues.append({
            "severity": "error",
            "service": "server",
            "title": "Server is shutting down",
            "message": "The API server is in the process of shutting down.",
            "suggestion": "Wait a moment and refresh the page.",
        })

    return {
        "status": "healthy" if not issues else "warning" if all(i["severity"] == "info" for i in issues) else "degraded",
        "uptime_seconds": int(time.time() - _start_time),
        "background_tasks_running": n_tasks,
        "issues": issues,
        "dependencies": {
            "llm_providers": llm_status,
            "lm_studio": lm_studio,
            "data_providers": data_providers,
            "brokers": brokers,
        },
    }


@router.get("/health/status")
async def health_status():
    return {
        "api": True,
        "version": "0.4.0",
        "status": "running",
    }
