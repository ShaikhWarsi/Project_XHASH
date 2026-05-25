from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

import pandas as pd

from .evaluator import ConditionGroup, ConditionOperator
from .scanner import Scanner

logger = logging.getLogger(__name__)


@dataclass
class StrategySignal:
    symbol: str
    action: str
    quantity: float
    price: float
    timestamp: datetime = field(default_factory=datetime.utcnow)
    reason: str = ""


@dataclass
class StrategyConfig:
    name: str
    entry_conditions: list[ConditionGroup]
    exit_conditions: list[ConditionGroup]
    symbols: list[str]
    timeframe: str = "1d"
    lookback: int = 100
    quantity: float = 1.0
    poll_interval_seconds: int = 300
    stop_loss_pct: Optional[float] = None
    take_profit_pct: Optional[float] = None
    trailing_stop_pct: Optional[float] = None


class LiveRunner:
    def __init__(self, config: StrategyConfig):
        self.config = config
        self.scanner = Scanner()
        self.active_positions: dict[str, dict[str, Any]] = {}
        self._running = False
        self._signals: list[StrategySignal] = []
        self._last_prices: dict[str, float] = {}

    def start(self):
        self._running = True
        logger.info(f"LiveRunner started: {self.config.name}")
        while self._running:
            try:
                self._tick()
            except Exception as e:
                logger.error(f"LiveRunner tick error: {e}")
            time.sleep(self.config.poll_interval_seconds)

    def stop(self):
        self._running = False
        logger.info(f"LiveRunner stopped: {self.config.name}")

    def tick_once(self) -> list[StrategySignal]:
        return self._tick()

    def get_signals(self) -> list[StrategySignal]:
        return list(self._signals)

    def get_positions(self) -> dict[str, dict[str, Any]]:
        return dict(self.active_positions)

    def _tick(self) -> list[StrategySignal]:
        new_signals: list[StrategySignal] = []
        for symbol in self.config.symbols:
            df = self._fetch_latest(symbol)
            if df is None or len(df) < 30:
                continue

            price = float(df["close"].iloc[-1])
            self._last_prices[symbol] = price
            in_position = symbol in self.active_positions

            self._check_stops(symbol, price, new_signals)

            if in_position:
                for group in self.config.exit_conditions:
                    if group.evaluate(df):
                        sig = StrategySignal(
                            symbol=symbol, action="exit", quantity=self.active_positions[symbol].get("quantity", 0),
                            price=price, reason=f"exit condition: {group.logic}",
                        )
                        new_signals.append(sig)
                        self._signals.append(sig)
                        del self.active_positions[symbol]
                        break
            else:
                for group in self.config.entry_conditions:
                    if group.evaluate(df):
                        sig = StrategySignal(
                            symbol=symbol, action="buy", quantity=self.config.quantity,
                            price=price, reason=f"entry condition: {group.logic}",
                        )
                        new_signals.append(sig)
                        self._signals.append(sig)
                        self.active_positions[symbol] = {
                            "entry_price": price,
                            "quantity": self.config.quantity,
                            "entry_time": datetime.utcnow().isoformat(),
                            "highest_price": price,
                        }
                        break

        return new_signals

    def _check_stops(self, symbol: str, price: float, signals: list[StrategySignal]):
        pos = self.active_positions.get(symbol)
        if pos is None:
            return

        entry = pos["entry_price"]
        highest = max(pos.get("highest_price", entry), price)
        pos["highest_price"] = highest

        if self.config.stop_loss_pct is not None:
            stop = entry * (1 - self.config.stop_loss_pct)
            if price <= stop:
                signals.append(StrategySignal(
                    symbol=symbol, action="exit", quantity=pos["quantity"],
                    price=price, reason=f"stop-loss hit ({self.config.stop_loss_pct:.1%})",
                ))
                del self.active_positions[symbol]
                return

        if self.config.take_profit_pct is not None:
            target = entry * (1 + self.config.take_profit_pct)
            if price >= target:
                signals.append(StrategySignal(
                    symbol=symbol, action="exit", quantity=pos["quantity"],
                    price=price, reason=f"take-profit hit ({self.config.take_profit_pct:.1%})",
                ))
                del self.active_positions[symbol]
                return

        if self.config.trailing_stop_pct is not None:
            trail = highest * (1 - self.config.trailing_stop_pct)
            if price <= trail:
                signals.append(StrategySignal(
                    symbol=symbol, action="exit", quantity=pos["quantity"],
                    price=price, reason=f"trailing-stop hit ({self.config.trailing_stop_pct:.1%})",
                ))
                del self.active_positions[symbol]
                return

    def _fetch_latest(self, symbol: str) -> Optional[pd.DataFrame]:
        return self.scanner._fetch_data(symbol, self.config.timeframe, self.config.lookback)
