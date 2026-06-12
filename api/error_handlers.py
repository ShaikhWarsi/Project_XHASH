import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from core.errors import (
    TradingEngineError,
    ServiceUnavailableError,
    ConfigurationError,
    AuthenticationError,
    RateLimitError,
    classify_error,
)

logger = logging.getLogger(__name__)

USER_FRIENDLY_MESSAGES = {
    "service_unavailable": {
        "title": "Service Not Available",
        "message": "A required service is not running or unreachable.",
        "suggestion": "Check if the service is running and properly configured.",
    },
    "configuration_error": {
        "title": "Configuration Issue",
        "message": "A required setting or API key is missing or invalid.",
        "suggestion": "Go to Settings and check your configuration.",
    },
    "authentication_error": {
        "title": "Authentication Failed",
        "message": "Your API key or credentials are invalid.",
        "suggestion": "Check your API key in Settings or contact support.",
    },
    "rate_limit": {
        "title": "Too Many Requests",
        "message": "You are making too many requests too quickly.",
        "suggestion": "Please wait a moment before trying again.",
    },
    "data_error": {
        "title": "Data Error",
        "message": "Could not fetch or process market data.",
        "suggestion": "Check your data provider API keys and internet connection.",
    },
    "signal_error": {
        "title": "Signal Error",
        "message": "Failed to compute trading signals.",
        "suggestion": "Check if market data is available for the selected symbols.",
    },
    "risk_error": {
        "title": "Risk Check Failed",
        "message": "The order was rejected by risk management.",
        "suggestion": "Review your position limits and risk parameters.",
    },
    "execution_error": {
        "title": "Order Execution Failed",
        "message": "Could not execute the order.",
        "suggestion": "Check if your broker is connected and properly configured.",
    },
    "integration_error": {
        "title": "Integration Error",
        "message": "An external service integration failed.",
        "suggestion": "Check the service status and your API keys.",
    },
    "unknown": {
        "title": "Something Went Wrong",
        "message": "An unexpected error occurred.",
        "suggestion": "Please try again. If the problem persists, check the logs.",
    },
}


SERVICE_SPECIFIC_SUGGESTIONS = {
    "lm_studio": {
        "title": "LM Studio Not Running",
        "message": "LM Studio is required for AI agent features but is not running.",
        "suggestion": "Please start LM Studio and ensure it's running on localhost:1234.",
        "docs_url": "/docs/troubleshooting#lm-studio",
    },
    "openai": {
        "title": "OpenAI API Key Missing",
        "message": "OpenAI is required for LLM features but no API key is configured.",
        "suggestion": "Go to Settings and add your OpenAI API key.",
        "docs_url": "/docs/troubleshooting#api-keys",
    },
    "database": {
        "title": "Database Error",
        "message": "The database is not responding or is corrupted.",
        "suggestion": "Restart the API server. If the problem persists, delete the database file.",
        "docs_url": "/docs/troubleshooting#database",
    },
    "market_data": {
        "title": "Market Data Unavailable",
        "message": "Could not fetch market data from any provider.",
        "suggestion": "Check your internet connection and data provider API keys.",
        "docs_url": "/docs/troubleshooting#market-data",
    },
    "websocket": {
        "title": "WebSocket Disconnected",
        "message": "Real-time data connection was lost.",
        "suggestion": "Check your internet connection. The system will auto-reconnect.",
        "docs_url": "/docs/troubleshooting#websocket",
    },
}


def build_error_response(
    status_code: int,
    code: str,
    message: str,
    suggestion: str = "",
    details: str = "",
    docs_url: str = "",
):
    return JSONResponse(
        status_code=status_code,
        content={
            "error": True,
            "code": code,
            "message": message,
            "suggestion": suggestion,
            "details": details,
            "docs_url": docs_url,
        },
    )


def get_service_help(service_key: str) -> dict:
    return SERVICE_SPECIFIC_SUGGESTIONS.get(service_key, USER_FRIENDLY_MESSAGES.get("unknown"))


async def global_error_handler(request: Request, exc: Exception):
    category = classify_error(exc)

    if isinstance(exc, ServiceUnavailableError):
        info = SERVICE_SPECIFIC_SUGGESTIONS.get(exc.service_name, USER_FRIENDLY_MESSAGES[category])
        return build_error_response(
            status_code=503,
            code=exc.service_name.upper() + "_UNAVAILABLE",
            message=exc.args[0] if exc.args else info["message"],
            suggestion=exc.suggestion or info["suggestion"],
            docs_url=info.get("docs_url", ""),
        )

    if isinstance(exc, ConfigurationError):
        return build_error_response(
            status_code=400,
            code="CONFIGURATION_ERROR",
            message=exc.args[0] if exc.args else USER_FRIENDLY_MESSAGES[category]["message"],
            suggestion=exc.suggestion or USER_FRIENDLY_MESSAGES[category]["suggestion"],
        )

    if isinstance(exc, AuthenticationError):
        return build_error_response(
            status_code=401,
            code="AUTHENTICATION_ERROR",
            message=str(exc) or USER_FRIENDLY_MESSAGES[category]["message"],
            suggestion=USER_FRIENDLY_MESSAGES[category]["suggestion"],
        )

    if isinstance(exc, RateLimitError):
        return build_error_response(
            status_code=429,
            code="RATE_LIMIT",
            message=str(exc) or USER_FRIENDLY_MESSAGES[category]["message"],
            suggestion=USER_FRIENDLY_MESSAGES[category]["suggestion"],
        )

    if isinstance(exc, TradingEngineError):
        info = USER_FRIENDLY_MESSAGES.get(category, USER_FRIENDLY_MESSAGES["unknown"])
        return build_error_response(
            status_code=500,
            code=category.upper(),
            message=str(exc) or info["message"],
            suggestion=info["suggestion"],
        )

    logger.exception("Unhandled error: %s", exc)
    return build_error_response(
        status_code=500,
        code="INTERNAL_ERROR",
        message=f"{type(exc).__name__}: {exc}"[:300],
        suggestion="Please try again. If the problem persists, restart the API server.",
    )
