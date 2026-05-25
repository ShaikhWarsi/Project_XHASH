from __future__ import annotations

import logging
import math
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class GridBot:
    def __init__(
        self,
        symbol: str,
        upper_price: float,
        lower_price: float,
        grid_count: int = 10,
        total_investment: float = 1000.0,
        atr_period: int = 14,
        update_interval_bars: int = 100,
    ):
        self.symbol = symbol
        self.upper_price = upper_price
        self.lower_price = lower_price
        self.grid_count = max(2, grid_count)
        self.total_investment = total_investment
        self.atr_period = atr_period
        self.update_interval_bars = update_interval_bars

        self.grid_levels: List[float] = []
        self.grid_orders: Dict[float, Dict[str, Any]] = {}
        self.filled_levels: Dict[float, str] = {}
        self._bars_since_update = 0
        self._initial_upper = upper_price
        self._initial_lower = lower_price
        self._recalc_grid()

    def _recalc_grid(self):
        step = (self.upper_price - self.lower_price) / (self.grid_count - 1) if self.grid_count > 1 else 0
        self.grid_levels = [self.lower_price + i * step for i in range(self.grid_count)]
        per_grid = self.total_investment / max(1, self.grid_count - 1)
        self._per_grid_amount = per_grid

    def get_grid_levels(self) -> List[float]:
        return self.grid_levels

    def get_status(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "upper_price": self.upper_price,
            "lower_price": self.lower_price,
            "grid_count": self.grid_count,
            "levels": self.grid_levels,
            "active_orders": len(self.grid_orders),
            "filled_positions": len(self.filled_levels),
            "total_investment": self.total_investment,
            "per_grid_amount": self._per_grid_amount,
        }

    def update_adaptive_bounds(self, current_price: float, atr_value: float) -> bool:
        self._bars_since_update += 1
        if self._bars_since_update < self.update_interval_bars:
            return False
        self._bars_since_update = 0

        if atr_value <= 0 or current_price <= 0:
            return False

        atr_pct = atr_value / current_price
        atr_multiplier = max(2.0, self.grid_count / 2.0)
        new_half_range = current_price * atr_pct * atr_multiplier

        new_upper = current_price + new_half_range
        new_lower = max(0.001, current_price - new_half_range)

        max_expansion = 3.0
        if new_upper > self._initial_upper * max_expansion:
            new_upper = self._initial_upper * max_expansion
        if new_lower < self._initial_lower / max_expansion:
            new_lower = self._initial_lower / max_expansion

        min_range = current_price * 0.02
        if new_upper - new_lower < min_range:
            new_upper = current_price + min_range / 2
            new_lower = current_price - min_range / 2

        old_upper, old_lower = self.upper_price, self.lower_price
        self.upper_price = new_upper
        self.lower_price = new_lower

        if abs(self.upper_price - old_upper) / max(old_upper, 0.001) > 0.01 or \
           abs(self.lower_price - old_lower) / max(old_lower, 0.001) > 0.01:
            old_levels = set(self.grid_levels)
            self._recalc_grid()
            new_levels = set(self.grid_levels)
            logger.info(
                "Grid bounds adapted: %.4f-%.4f → %.4f-%.4f (levels: %d→%d)",
                old_lower, old_upper, new_lower, new_upper,
                len(old_levels), len(new_levels),
            )
            return True
        return False

    def waterfall_protection(self, fill_price: float, side: str) -> Optional[float]:
        if not self.grid_levels:
            return None

        idx = None
        for i, level in enumerate(self.grid_levels):
            if side == "buy" and fill_price >= level:
                idx = i
            elif side == "sell" and fill_price <= level:
                idx = i

        if idx is None:
            return None

        cascade_count = 0
        if side == "buy":
            for level in self.grid_levels[idx:]:
                if level not in self.filled_levels:
                    cascade_count += 1
                else:
                    break
        else:
            for level in reversed(self.grid_levels[: idx + 1]):
                if level not in self.filled_levels:
                    cascade_count += 1
                else:
                    break

        if cascade_count >= 3:
            logger.warning(
                "Waterfall protection triggered: %s at %.4f could cascade %d levels",
                side, fill_price, cascade_count,
            )
            return fill_price * (0.99 if side == "buy" else 1.01)

        return None

    def on_fill(self, level: float, side: str) -> None:
        self.filled_levels[level] = side

    def should_place_order(self, current_price: float, level: float) -> bool:
        if level in self.filled_levels:
            return False
        if level in self.grid_orders:
            return False

        if level < current_price:
            return True
        return False

    def reset(self):
        self.grid_orders.clear()
        self.filled_levels.clear()
        self._bars_since_update = 0
        self.upper_price = self._initial_upper
        self.lower_price = self._initial_lower
        self._recalc_grid()
