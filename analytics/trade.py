from __future__ import annotations

import itertools
from dataclasses import dataclass, field
from typing import Optional

from .metrics import PerformanceMetrics

_trade_refs = itertools.count(1)


class TradeStatus:
    Created = 0
    Open = 1
    Closed = 2


class Trade:
    """Trade lifecycle tracking ported from Backtrader.

    Tracks a complete position lifecycle: open → add → reduce → close.
    Maintains cumulative P&L, commission, value, bar timing, and history.
    """

    def __init__(self, data=None, tradeid: int = 0, historyon: bool = False):
        self.ref = next(_trade_refs)
        self.data = data
        self.tradeid = tradeid
        self.historyon = historyon

        self.size: int = 0
        self.price: float = 0.0
        self.value: float = 0.0
        self.commission: float = 0.0
        self.pnl: float = 0.0
        self.pnlcomm: float = 0.0

        self.justopened: bool = False
        self.isopen: bool = False
        self.isclosed: bool = False
        self.long: bool = True

        self.baropen: int = 0
        self.dtopen: float = 0.0
        self.barclose: int = 0
        self.dtclose: float = 0.0
        self.barlen: int = 0

        self.status: int = TradeStatus.Created
        self.history: list = []

    def update(self, size: int, price: float, comminfo, order, dt: float = 0.0, barindex: int = 0):
        if not size:
            return

        oldsize = self.size
        self.size += size

        self.justopened = bool(not oldsize and size)
        if self.justopened:
            self.baropen = barindex
            self.dtopen = dt if not getattr(order, 'simulated', False) else 0.0
            self.long = self.size > 0

        self.isopen = bool(self.size)
        self.barlen = (barindex - self.baropen) if self.baropen else 0
        self.isclosed = bool(oldsize and not self.size)

        if self.isclosed:
            self.isopen = False
            self.barclose = barindex
            self.dtclose = dt
            self.status = TradeStatus.Closed
        elif self.isopen:
            self.status = TradeStatus.Open

        if abs(self.size) > abs(oldsize):
            self.price = (oldsize * self.price + size * price) / self.size if self.size else 0.0
            pnl = 0.0
        else:
            pnl = comminfo.profit_and_loss(-size, self.price, price) if comminfo else 0.0

        self.pnl += pnl
        self.pnlcomm = self.pnl - self.commission
        self.value = comminfo.get_value_size(self.size, self.price) if comminfo else abs(size) * price

        if self.historyon:
            import copy
            entry = type('TradeHistory', (), {})()
            entry.status = type('Status', (), {})()
            entry.status.status = self.status
            entry.status.dt = dt
            entry.status.barlen = self.barlen
            entry.status.size = self.size
            entry.status.price = self.price
            entry.status.value = self.value
            entry.status.pnl = self.pnl
            entry.status.pnlcomm = self.pnlcomm
            entry.event = type('Event', (), {})()
            entry.event.order = order if not isinstance(order, dict) else None
            entry.event.size = size
            entry.event.price = price
            entry.event.commission = self.commission
            self.history.append(entry)


class TradeAnalyzer:
    """Aggregate trade statistics from a list of Trades."""

    @staticmethod
    def analyze(trades: list[Trade]) -> dict:
        total = len(trades)
        if total == 0:
            return {"total": 0}

        closed = [t for t in trades if t.isclosed]
        winners = [t for t in closed if t.pnlcomm > 0]
        losers = [t for t in closed if t.pnlcomm <= 0]

        total_pnl = sum(t.pnlcomm for t in closed)
        avg_pnl = total_pnl / len(closed) if closed else 0.0
        win_rate = len(winners) / len(closed) if closed else 0.0

        avg_win = sum(t.pnlcomm for t in winners) / len(winners) if winners else 0.0
        avg_loss = abs(sum(t.pnlcomm for t in losers)) / len(losers) if losers else 0.0
        profit_factor = (sum(t.pnlcomm for t in winners) /
                         max(abs(sum(t.pnlcomm for t in losers)), 1e-10)) if losers else float('inf')

        avg_bars = sum(t.barlen for t in closed) / len(closed) if closed else 0.0
        avg_commission = sum(t.commission for t in closed) / len(closed) if closed else 0.0

        return {
            "total": total,
            "closed": len(closed),
            "winners": len(winners),
            "losers": len(losers),
            "win_rate": win_rate,
            "total_pnl": total_pnl,
            "avg_pnl": avg_pnl,
            "avg_win": avg_win,
            "avg_loss": avg_loss,
            "profit_factor": profit_factor,
            "avg_bars_held": avg_bars,
            "avg_commission": avg_commission,
            "total_commission": sum(t.commission for t in closed),
            "total_pnl_net": total_pnl - sum(t.commission for t in closed),
        }
