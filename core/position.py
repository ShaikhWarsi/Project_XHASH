from __future__ import annotations


class Position:
    """8-case position math ported from Backtrader.

    Handles: open from zero, increase, reduce, reverse (long->short),
    close, and their short-side mirrors. Reversals decompose into
    close + open components for correct P&L.
    """

    def __init__(self, size: int = 0, price: float = 0.0):
        self.size: int = size
        self.price: float = price
        self.price_orig: float = price
        self.adjbase: float = 0.0
        self.upopened: int = 0
        self.upclosed: int = 0
        self.updt: float = 0.0

    def update(self, size: int, price: float) -> tuple[int, float, int, int]:
        """Apply a trade of `size` at `price`. Returns (new_size, new_price, opened, closed).

        Cases:
        1. size becomes 0 (close)
        2. oldsize was 0 (open)
        3. long increase (oldsize>0, size>0)
        4. long reduce (oldsize>0, size<0, newsize>0)
        5. long reverse (oldsize>0, newsize<0)
        6. short increase (oldsize<0, size<0)
        7. short reduce (oldsize<0, size>0, newsize<0)
        8. short reverse (oldsize<0, newsize>0)
        """
        oldsize = self.size
        self.price_orig = self.price
        self.size += size

        if not self.size:
            opened, closed = 0, size
            self.price = 0.0
        elif not oldsize:
            opened, closed = size, 0
            self.price = price
        elif oldsize > 0:
            if self.size > 0:
                opened, closed = size, 0
                self.price = (self.price * oldsize + size * price) / self.size
            elif not self.size:
                opened, closed = 0, size
                self.price = 0.0
            else:
                opened, closed = self.size, -oldsize
                self.price = price
        else:
            if self.size < 0:
                opened, closed = size, 0
                self.price = (self.price * oldsize + size * price) / self.size
            elif not self.size:
                opened, closed = 0, size
                self.price = 0.0
            else:
                opened, closed = self.size, -oldsize
                self.price = price

        self.upopened = opened
        self.upclosed = closed
        return self.size, self.price, opened, closed

    def pseudoupdate(self, size: int, price: float) -> tuple[int, float, int, int]:
        """Clone, update clone, return result without modifying self."""
        p = Position(self.size, self.price)
        p.price_orig = self.price
        return p.update(size, price)

    def clone(self) -> Position:
        return Position(size=self.size, price=self.price)

    def __repr__(self) -> str:
        return f"Position(size={self.size}, price={self.price:.2f})"
