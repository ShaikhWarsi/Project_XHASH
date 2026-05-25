from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from core.enums import OrderSide, OrderType
from core.types import Fill, Order, PortfolioState, Position
from execution.interfaces import ExecutionProvider

logger = logging.getLogger(__name__)


class AlpacaExecutor(ExecutionProvider):
    """Alpaca Markets live/paper execution adapter.

    Requires alpaca-py: pip install alpaca-py
    Uses environment variables: APCA_API_KEY_ID, APCA_API_SECRET_KEY
    """

    def __init__(self, api_key: str = "", secret_key: str = "", paper: bool = True):
        self._api_key = api_key
        self._secret_key = secret_key
        self._paper = paper
        self._connected = False
        self._client = None

    def connect(self) -> bool:
        try:
            from alpaca.trading.client import TradingClient
            self._client = TradingClient(self._api_key, self._secret_key, paper=self._paper)
            self._connected = True
            return True
        except Exception as e:
            logger.warning("Alpaca connect failed: %s", e)
            self._connected = False
            return False

    def submit_order(self, order: Order) -> Optional[Fill]:
        if not self._connected or self._client is None:
            return None
        try:
            from alpaca.trading.enums import OrderSide as AlpacaSide
            from alpaca.trading.enums import TimeInForce
            from alpaca.trading.requests import LimitOrderRequest, MarketOrderRequest

            side = AlpacaSide.BUY if order.side in (OrderSide.BUY, OrderSide.COVER) else AlpacaSide.SELL

            if order.order_type == OrderType.MARKET:
                req = MarketOrderRequest(
                    symbol=order.symbol,
                    qty=order.quantity,
                    side=side,
                    time_in_force=TimeInForce.DAY,
                )
            elif order.order_type == OrderType.LIMIT:
                req = LimitOrderRequest(
                    symbol=order.symbol,
                    qty=order.quantity,
                    side=side,
                    limit_price=order.price,
                    time_in_force=TimeInForce.DAY,
                )
            else:
                return None

            resp = self._client.submit_order(req)
            return Fill(
                order_id=resp.id,
                symbol=resp.symbol,
                side=order.side,
                quantity=int(resp.qty),
                price=float(resp.filled_avg_price or resp.limit_price or 0.0),
                timestamp=datetime.utcnow(),
            )
        except Exception as e:
            logger.warning("Alpaca submit_order failed: %s", e)
            return None

    def cancel_order(self, order_id: str) -> bool:
        if not self._connected or self._client is None:
            return False
        try:
            self._client.cancel_order_by_id(order_id)
            return True
        except Exception as e:
            logger.warning("Alpaca cancel_order failed: %s", e)
            return False

    def get_open_orders(self) -> list[Order]:
        if not self._connected or self._client is None:
            return []
        from alpaca.trading.enums import OrderSide as AlpacaSide
        orders = self._client.get_orders()
        result: list[Order] = []
        for o in orders:
            side = OrderSide.BUY if o.side == AlpacaSide.BUY else OrderSide.SELL
            result.append(Order(
                symbol=o.symbol,
                side=side,
                quantity=float(o.qty),
                price=float(o.limit_price) if o.limit_price else None,
                order_id=o.id,
            ))
        return result

    def get_portfolio(self) -> PortfolioState:
        if not self._connected or self._client is None:
            from core.types import PortfolioState
            return PortfolioState(cash=0.0, positions={}, total_value=0.0)
        account = self._client.get_account()
        positions = self._client.get_all_positions()
        pos_dict: dict[str, Position] = {}
        for p in positions:
            qty = int(float(p.qty))
            if qty == 0:
                continue
            side = OrderSide.BUY if qty > 0 else OrderSide.SHORT
            pos_dict[p.symbol] = Position(
                symbol=p.symbol,
                quantity=abs(qty),
                side=side,
                entry_price=float(p.avg_entry_price),
                current_price=float(p.current_price),
            )
        return PortfolioState(
            cash=float(account.cash),
            positions=pos_dict,
            total_value=float(account.equity),
            margin_used=float(account.long_market_value + account.short_market_value),
        )

    @property
    def is_connected(self) -> bool:
        return self._connected

    def disconnect(self):
        self._connected = False
        self._client = None
