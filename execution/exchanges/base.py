from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class LiveTradingError(Exception):
    pass


class LiveOrderResult:
    def __init__(
        self,
        order_id: str,
        client_order_id: Optional[str] = None,
        symbol: str = "",
        side: str = "",
        quantity: float = 0.0,
        price: float = 0.0,
        status: str = "filled",
        filled_quantity: float = 0.0,
        average_fill_price: float = 0.0,
        commission: float = 0.0,
        raw: Optional[Dict[str, Any]] = None,
    ):
        self.order_id = order_id
        self.client_order_id = client_order_id
        self.symbol = symbol
        self.side = side
        self.quantity = quantity
        self.price = price
        self.status = status
        self.filled_quantity = filled_quantity
        self.average_fill_price = average_fill_price
        self.commission = commission
        self.raw = raw or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "order_id": self.order_id,
            "client_order_id": self.client_order_id,
            "symbol": self.symbol,
            "side": self.side,
            "quantity": self.quantity,
            "price": self.price,
            "status": self.status,
            "filled_quantity": self.filled_quantity,
            "average_fill_price": self.average_fill_price,
            "commission": self.commission,
        }


class BaseRestClient(ABC):
    @abstractmethod
    def place_market_order(
        self,
        symbol: str,
        side: str,
        quantity: float,
        reduce_only: bool = False,
        position_side: Optional[str] = None,
        client_order_id: Optional[str] = None,
    ) -> LiveOrderResult:
        ...

    @abstractmethod
    def get_ticker(self, symbol: str) -> Dict[str, Any]:
        ...

    @abstractmethod
    def get_balance(self) -> Dict[str, Any]:
        ...

    @abstractmethod
    def cancel_order(self, order_id: str) -> bool:
        ...

    @abstractmethod
    def get_open_orders(self, symbol: Optional[str] = None) -> list:
        ...

    @abstractmethod
    def get_positions(self) -> list:
        ...
