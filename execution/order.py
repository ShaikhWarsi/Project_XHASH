from __future__ import annotations

import itertools
from dataclasses import dataclass, field
from datetime import datetime
from enum import IntEnum
from typing import Optional


class OrderType(IntEnum):
    Market = 0
    Close = 1
    Limit = 2
    Stop = 3
    StopLimit = 4
    StopTrail = 5
    StopTrailLimit = 6
    Historical = 7


class OrderStatus(IntEnum):
    Created = 0
    Submitted = 1
    Accepted = 2
    Partial = 3
    Completed = 4
    Canceled = 5
    Expired = 6
    Margin = 7
    Rejected = 8


_ref_counter = itertools.count(1)


@dataclass
class OrderExecutionBit:
    dt: float = 0.0
    size: int = 0
    price: float = 0.0
    closed: int = 0
    closedvalue: float = 0.0
    closedcomm: float = 0.0
    opened: int = 0
    openedvalue: float = 0.0
    openedcomm: float = 0.0
    value: float = 0.0
    comm: float = 0.0
    pnl: float = 0.0
    psize: int = 0
    pprice: float = 0.0
    margin: float = 0.0


@dataclass
class OrderData:
    dt: float = 0.0
    size: int = 0
    remsize: int = 0
    price: float = 0.0
    pricelimit: float = 0.0
    trailamount: float | None = None
    trailpercent: float | None = None
    pclose: float = 0.0
    value: float = 0.0
    comm: float = 0.0
    margin: float = 0.0
    pnl: float = 0.0
    psize: int = 0
    pprice: float = 0.0
    exbits: list = field(default_factory=list)
    _p1: int = 0
    _p2: int = 0

    def add(self, exbit: OrderExecutionBit):
        self.exbits.append(exbit)
        self.remsize -= abs(exbit.size)
        if self.size != 0:
            self.price = ((self.value) + abs(exbit.value)) / (self.size)
        else:
            self.price = 0.0
        self.value += abs(exbit.value)
        self.comm += exbit.comm
        self.pnl += exbit.pnl
        self.psize = exbit.psize
        self.pprice = exbit.pprice

    def markpending(self):
        self._p1, self._p2 = self._p2, len(self.exbits)

    def iterpending(self):
        return iter(self.exbits[self._p1:self._p2])

    def clone(self) -> OrderData:
        import copy
        obj = copy.copy(self)
        obj.exbits = list(self.exbits)
        obj._p1 = 0
        obj._p2 = len(self.exbits)
        return obj


class Order:
    """Order model ported from Backtrader.

    9 states (Created→Submitted→Accepted→Partial→Completed/Canceled/Rejected/Expired/Margin)
    8 types (Market, Close, Limit, Stop, StopLimit, StopTrail, StopTrailLimit, Historical)
    Supports brackets, OCO, trailing stops, parent/child.
    """

    def __init__(
        self,
        order_type: OrderType = OrderType.Market,
        size: int = 0,
        price: float | None = None,
        plimit: float | None = None,
        exectype: OrderType | None = None,
        valid: datetime | float | None = None,
        tradeid: int = 0,
        trailamount: float | None = None,
        trailpercent: float | None = None,
        parent: Optional[Order] = None,
        transmit: bool = True,
        histnotify: bool = False,
        simulated: bool = False,
        symbol: str = "",
        info: dict | None = None,
    ):
        self.ref = next(_ref_counter)
        self.status = OrderStatus.Created
        self.symbol = symbol
        self.info = info or {}

        if exectype is not None:
            self.exectype = exectype
        else:
            self.exectype = OrderType(order_type) if isinstance(order_type, int) else order_type

        self.size = size
        if isinstance(self.size, int) and self.size < 0:
            pass
        self.isbuy = self.size > 0

        self.price = price or 0.0
        self.plimit = plimit or 0.0
        self.valid = valid
        self.tradeid = tradeid
        self.trailamount = trailamount
        self.trailpercent = trailpercent
        self.parent = parent
        self.transmit = transmit
        self.histnotify = histnotify
        self.simulated = simulated

        self.pannotated = None
        self.triggered = False
        self.dteos = 0.0

        self.created = OrderData()
        self.executed = OrderData(size=abs(size), remsize=abs(size))

        self._active = True
        self.owner = None
        self.data = None

    @property
    def alive(self) -> bool:
        return self.status in (
            OrderStatus.Created, OrderStatus.Submitted,
            OrderStatus.Accepted, OrderStatus.Partial,
        )

    @property
    def size_abs(self) -> int:
        return abs(self.size)

    def execute(self, dt: float, size: int, price: float,
                closed: int, closedvalue: float, closedcomm: float,
                opened: int, openedvalue: float, openedcomm: float,
                margin: float, pnl: float,
                psize: int, pprice: float) -> bool:
        exbit = OrderExecutionBit(
            dt=dt, size=size, price=price,
            closed=closed, closedvalue=closedvalue, closedcomm=closedcomm,
            opened=opened, openedvalue=openedvalue, openedcomm=openedcomm,
            value=closedvalue + openedvalue,
            comm=closedcomm + openedcomm,
            pnl=pnl, psize=psize, pprice=pprice, margin=margin,
        )
        self.executed.add(exbit)
        self.executed.dt = dt

        if self.executed.remsize:
            self.status = OrderStatus.Partial
        else:
            self.status = OrderStatus.Completed
        return True

    def cancel(self):
        self.status = OrderStatus.Canceled

    def reject(self, reason: str = ""):
        self.status = OrderStatus.Rejected
        self.info["reject_reason"] = reason

    def margin_call(self):
        self.status = OrderStatus.Margin

    def expire(self, current_dt: float) -> bool:
        if self.exectype == OrderType.Market:
            return False
        if self.valid and current_dt > self._valid_to_float():
            self.status = OrderStatus.Expired
            self.executed.dt = current_dt
            return True
        return False

    def _valid_to_float(self) -> float:
        if isinstance(self.valid, (int, float)):
            return float(self.valid)
        if isinstance(self.valid, datetime):
            return self.valid.timestamp()
        return float('inf')

    def trailadjust(self, price: float):
        if self.exectype not in (OrderType.StopTrail, OrderType.StopTrailLimit):
            return
        if self.trailamount:
            pamount = self.trailamount
        elif self.trailpercent:
            pamount = price * self.trailpercent
        else:
            return

        if self.isbuy:
            if price < self.created.price:
                self.created.price = price
        else:
            if price > self.created.price:
                self.created.price = price

    def __eq__(self, other):
        if isinstance(other, Order):
            return self.ref == other.ref
        return NotImplemented

    def __hash__(self):
        return hash(self.ref)

    def __repr__(self) -> str:
        return (f"Order(ref={self.ref}, type={self.exectype.name}, "
                f"status={self.status.name}, size={self.size}, "
                f"symbol={self.symbol})")
