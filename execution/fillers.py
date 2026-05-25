from __future__ import annotations
from abc import ABC, abstractmethod

MAXINT = 2**31 - 1


class FillerBase(ABC):
    """Base class for fill volume limiters, ported from Backtrader."""

    @abstractmethod
    def __call__(self, order, price: float, ago: int) -> int:
        ...


class FixedSize(FillerBase):
    """Fill at most `size` units per bar, limited by bar volume."""

    def __init__(self, size: int = 0):
        self.size = size

    def __call__(self, order, price: float, ago: int) -> int:
        maxsize = self.size or MAXINT
        volume = 0
        if hasattr(order.data, 'volume'):
            volume = order.data.volume[ago]
        elif hasattr(order, '_bar_volume'):
            volume = order._bar_volume
        else:
            volume = MAXINT
        return min(volume, abs(order.executed.remsize), maxsize)


class FixedBarPerc(FillerBase):
    """Fill at most `perc`% of the bar's volume."""

    def __init__(self, perc: float = 100.0):
        self.perc = perc

    def __call__(self, order, price: float, ago: int) -> int:
        volume = 0
        if hasattr(order.data, 'volume'):
            volume = order.data.volume[ago]
        elif hasattr(order, '_bar_volume'):
            volume = order._bar_volume
        else:
            return abs(order.executed.remsize)
        maxsize = (volume * self.perc) // 100
        return min(int(maxsize), abs(order.executed.remsize))


class BarPointPerc(FillerBase):
    """Distribute volume proportionally across the bar's price range.

    Simulates a limit order ladder: divides the high-low range into
    `minmov`-sized buckets and takes `perc`% of volume at the execution price level.
    """

    def __init__(self, minmov: float = 0.01, perc: float = 100.0):
        self.minmov = minmov
        self.perc = perc

    def __call__(self, order, price: float, ago: int) -> int:
        volume = 0
        high = 0.0
        low = 0.0
        if hasattr(order.data, 'volume') and hasattr(order.data, 'high') and hasattr(order.data, 'low'):
            volume = order.data.volume[ago]
            high = order.data.high[ago]
            low = order.data.low[ago]
        elif hasattr(order, '_bar_volume'):
            volume = order._bar_volume
            high = getattr(order, '_bar_high', price + 0.01)
            low = getattr(order, '_bar_low', price - 0.01)
        else:
            return abs(order.executed.remsize)

        parts = 1
        if self.minmov:
            parts = int((high - low + self.minmov) // self.minmov)
        if parts < 1:
            parts = 1

        alloc_vol = int(((volume / parts) * self.perc) // 100.0)
        return min(alloc_vol, abs(order.executed.remsize))
