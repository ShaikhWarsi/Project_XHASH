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
