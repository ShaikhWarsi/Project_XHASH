class TradingEngineError(Exception):
    """Base exception for all trading-engine errors."""


class DataError(TradingEngineError):
    """Data fetching, caching, or provider errors."""


class SignalError(TradingEngineError):
    """Signal computation or aggregation errors."""


class RiskError(TradingEngineError):
    """Risk limit breaches or validation failures."""


class ExecutionError(TradingEngineError):
    """Order execution or broker errors."""


class ConfigError(TradingEngineError):
    """Configuration or settings errors."""


class IntegrationError(TradingEngineError):
    """External integration or notification errors."""


class ServiceUnavailableError(TradingEngineError):
    """A required service (LLM, broker, DB) is not available."""

    def __init__(self, service_name: str, detail: str = "", suggestion: str = ""):
        self.service_name = service_name
        self.suggestion = suggestion
        super().__init__(f"{service_name} is not available: {detail}" if detail else service_name)


class ConfigurationError(TradingEngineError):
    """Missing or invalid configuration."""

    def __init__(self, key: str, detail: str = "", suggestion: str = ""):
        self.key = key
        self.suggestion = suggestion
        super().__init__(f"Configuration error for {key}: {detail}" if detail else key)


class AuthenticationError(TradingEngineError):
    """Authentication or authorization failures."""


class RateLimitError(TradingEngineError):
    """Rate limit exceeded."""


ERROR_CATEGORIES = {
    ServiceUnavailableError: "service_unavailable",
    ConfigurationError: "configuration_error",
    AuthenticationError: "authentication_error",
    RateLimitError: "rate_limit",
    DataError: "data_error",
    SignalError: "signal_error",
    RiskError: "risk_error",
    ExecutionError: "execution_error",
    IntegrationError: "integration_error",
    TradingEngineError: "unknown",
}


def classify_error(error: Exception) -> str:
    for exc_cls, category in ERROR_CATEGORIES.items():
        if isinstance(error, exc_cls):
            return category
    return "unknown"
