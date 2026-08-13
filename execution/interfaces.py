from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from core.types import Fill, Order, PortfolioState


class OrderStatus(Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    PARTIAL = "partial"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    EXPIRED = "expired"


@dataclass
class OrderRecord:
    order: Order
    status: OrderStatus = OrderStatus.PENDING
    filled_quantity: float = 0.0
    filled_price: float = 0.0
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    reject_reason: str = ""
    order_id: str = ""
    record_id: str = field(default_factory=lambda: str(__import__("uuid").uuid4()))


class ExecutionProvider(ABC):
    @abstractmethod
    def connect(self) -> bool: ...

    @abstractmethod
    def submit_order(self, order: Order) -> Optional[Fill]: ...

    @abstractmethod
    def cancel_order(self, order_id: str) -> bool: ...

    @abstractmethod
    def get_open_orders(self) -> list[Order]: ...

    @abstractmethod
    def get_portfolio(self) -> PortfolioState: ...

    @property
    @abstractmethod
    def is_connected(self) -> bool: ...

    @abstractmethod
    def disconnect(self): ...


class CircuitBreakerState:
    """Per-symbol circuit breaker that halts trading after N consecutive failures."""

    def __init__(self, max_consecutive_failures: int = 5):
        self.max_consecutive_failures = max_consecutive_failures
        self._failures: dict[str, int] = {}
        self._halted: dict[str, bool] = {}

    def record_failure(self, symbol: str):
        self._failures[symbol] = self._failures.get(symbol, 0) + 1
        if self._failures[symbol] >= self.max_consecutive_failures:
            self._halted[symbol] = True

    def record_success(self, symbol: str):
        self._failures[symbol] = 0

    def is_halted(self, symbol: str) -> bool:
        return self._halted.get(symbol, False)

    def reset(self, symbol: Optional[str] = None):
        if symbol:
            self._failures.pop(symbol, None)
            self._halted.pop(symbol, None)
        else:
            self._failures.clear()
            self._halted.clear()


class OrderManager:
    def __init__(self, executor: ExecutionProvider):
        self._executor = executor
        self._orders: dict[str, OrderRecord] = {}
        self._order_timeout_sec: float = 300.0
        self.circuit_breaker = CircuitBreakerState()

    def submit(self, order: Order) -> OrderRecord:
        if self.circuit_breaker.is_halted(order.symbol):
            record = OrderRecord(order=order, status=OrderStatus.REJECTED)
            record.reject_reason = f"Circuit breaker active for {order.symbol}"
            record.updated_at = datetime.now(timezone.utc)
            self._orders[record.record_id] = record
            return record

        record = OrderRecord(order=order)
        try:
            fill = self._executor.submit_order(order)
            if fill:
                record.status = OrderStatus.FILLED
                record.filled_quantity = fill.quantity
                record.filled_price = fill.price
                record.order_id = fill.order_id
                self.circuit_breaker.record_success(order.symbol)
            else:
                record.status = OrderStatus.SUBMITTED
                record.order_id = order.order_id or ""
        except Exception as e:
            record.status = OrderStatus.REJECTED
            record.reject_reason = str(e)
            self.circuit_breaker.record_failure(order.symbol)
        record.updated_at = datetime.now(timezone.utc)
        self._orders[record.record_id] = record
        return record

    def cancel(self, order_id: str) -> bool:
        for record in self._orders.values():
            if record.order_id == order_id and record.status in (OrderStatus.SUBMITTED, OrderStatus.PENDING):
                if self._executor.cancel_order(order_id):
                    record.status = OrderStatus.CANCELLED
                    record.updated_at = datetime.now(timezone.utc)
                    return True
        return False

    def get_order(self, order_id: str) -> Optional[OrderRecord]:
        for record in self._orders.values():
            if record.order_id == order_id or record.record_id == order_id:
                return record
        return None

    def get_open(self) -> list[OrderRecord]:
        return [r for r in self._orders.values() if r.status in (OrderStatus.SUBMITTED, OrderStatus.PENDING, OrderStatus.PARTIAL)]

    def get_all(self) -> list[OrderRecord]:
        return list(self._orders.values())

    def check_timeouts(self):
        now = datetime.now(timezone.utc)
        for record in self.get_open():
            elapsed = (now - record.updated_at).total_seconds()
            if elapsed > self._order_timeout_sec:
                self.cancel(record.order_id)
                record.status = OrderStatus.EXPIRED
                record.reject_reason = f"Timed out after {elapsed:.0f}s"
                record.updated_at = now
