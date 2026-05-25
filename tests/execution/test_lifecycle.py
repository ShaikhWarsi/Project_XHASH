import pytest
from execution.strategy_lifecycle import (
    is_fatal_exchange_error,
    should_skip_position_sync,
    auto_stop_live_strategy,
)


class TestStrategyLifecycle:
    def test_fatal_401(self):
        assert is_fatal_exchange_error("binance http 401 invalid api-key") is True

    def test_fatal_invalid_api_key(self):
        assert is_fatal_exchange_error("invalid api-key") is True

    def test_fatal_connection_refused(self):
        assert is_fatal_exchange_error("connection refused") is True

    def test_fatal_authentication(self):
        assert is_fatal_exchange_error("authentication failed") is True

    def test_fatal_unauthorized(self):
        assert is_fatal_exchange_error("unauthorized request") is True

    def test_fatal_forbidden(self):
        assert is_fatal_exchange_error("forbidden access") is True

    def test_fatal_ip_blocked(self):
        assert is_fatal_exchange_error("invalid ip") is True

    def test_fatal_signature_mismatch(self):
        assert is_fatal_exchange_error("signature mismatch") is True

    def test_fatal_ibkr_failed(self):
        assert is_fatal_exchange_error("failed to connect to ibkr") is True

    def test_fatal_connect_call_failed(self):
        assert is_fatal_exchange_error("connect call failed") is True

    def test_not_fatal_market_closed(self):
        assert is_fatal_exchange_error("market is closed") is False

    def test_not_fatal_insufficient_balance(self):
        assert is_fatal_exchange_error("insufficient balance") is False

    def test_not_fatal_rate_limit(self):
        assert is_fatal_exchange_error("rate limit exceeded") is False

    def test_not_fatal_empty(self):
        assert is_fatal_exchange_error("") is False

    def test_not_fatal_none(self):
        assert is_fatal_exchange_error(None) is False

    def test_not_fatal_order_rejected(self):
        assert is_fatal_exchange_error("Order rejected: price out of range") is False

    def test_not_fatal_network_timeout(self):
        assert is_fatal_exchange_error("Network timeout") is False
