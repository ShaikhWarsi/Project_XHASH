from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
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
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    reject_reason: str = ""
    order_id: str = ""


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


class OrderManager:
    def __init__(self, executor: ExecutionProvider):
        self._executor = executor
        self._orders: dict[str, OrderRecord] = {}
        self._order_timeout_sec: float = 300.0

    def submit(self, order: Order) -> OrderRecord:
        record = OrderRecord(order=order)
        try:
            fill = self._executor.submit_order(order)
            if fill:
                record.status = OrderStatus.FILLED
                record.filled_quantity = fill.quantity
                record.filled_price = fill.price
                record.order_id = fill.order_id
            else:
                record.status = OrderStatus.SUBMITTED
                record.order_id = order.order_id or ""
        except Exception as e:
            record.status = OrderStatus.REJECTED
            record.reject_reason = str(e)
        record.updated_at = datetime.utcnow()
        self._orders[record.order_id or record.created_at.isoformat()] = record
        return record

    def cancel(self, order_id: str) -> bool:
        record = self._orders.get(order_id)
        if record and record.status in (OrderStatus.SUBMITTED, OrderStatus.PENDING):
            if self._executor.cancel_order(order_id):
                record.status = OrderStatus.CANCELLED
                record.updated_at = datetime.utcnow()
                return True
        return False

    def get_order(self, order_id: str) -> Optional[OrderRecord]:
        return self._orders.get(order_id)

    def get_open(self) -> list[OrderRecord]:
        return [r for r in self._orders.values() if r.status in (OrderStatus.SUBMITTED, OrderStatus.PENDING, OrderStatus.PARTIAL)]

    def get_all(self) -> list[OrderRecord]:
        return list(self._orders.values())

    def check_timeouts(self):
        now = datetime.utcnow()
        for record in self.get_open():
            elapsed = (now - record.updated_at).total_seconds()
            if elapsed > self._order_timeout_sec:
                self.cancel(record.order_id)
                record.status = OrderStatus.EXPIRED
                record.reject_reason = f"Timed out after {elapsed:.0f}s"
                record.updated_at = now
