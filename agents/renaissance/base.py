from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

import numpy as np
import pandas as pd

from agents.base import TradingAgent
from core.enums import AgentRole
from core.types import AnalystSignal, PortfolioState, RiskLimits, SignalMatrix


class RenaissanceAgent(TradingAgent, ABC):
    """Base class for Renaissance Technologies-style quant agents.

    Each agent implements a specific quant strategy:
    statistical arbitrage, mean reversion, momentum, etc.
    """

    def __init__(self, agent_id: str, name: str, role: AgentRole, description: str = ""):
        super().__init__(agent_id=agent_id, role=role)
        self.name = name
        self.description = description

    def analyze(
        self,
        tickers: list[str],
        portfolio: PortfolioState,
        signals: SignalMatrix,
        risk_limits: RiskLimits,
        **kwargs,
    ) -> dict[str, AnalystSignal]:
        prices_df: dict[str, pd.DataFrame] = kwargs.get("prices_df", {})
        llm_enhanced: bool = kwargs.get("llm_enhanced", False)
        results: dict[str, AnalystSignal] = {}

        for ticker in tickers:
            df = prices_df.get(ticker)
            ticker_signals = signals.get_signals(ticker)
            score = signals.get_score(ticker)
            regime = signals.regime

            signal = self._compute_signal(ticker, df, ticker_signals, score, regime, portfolio, llm_enhanced)
            results[ticker] = signal

        return results

    @abstractmethod
    def _compute_signal(
        self,
        ticker: str,
        df: Optional[pd.DataFrame],
        quant_signals: list,
        composite_score: float,
        regime: object,
        portfolio: PortfolioState,
        llm_enhanced: bool,
    ) -> AnalystSignal:
        ...

    def _safe_rsi(self, df: Optional[pd.DataFrame], period: int = 14) -> float:
        if df is None or len(df) < period + 1:
            return 50.0
        delta = df["close"].diff()
        gain = delta.where(delta > 0, 0).fillna(0)
        loss = (-delta.where(delta < 0, 0)).fillna(0)
        avg_gain = gain.rolling(period).mean().iloc[-1]
        avg_loss = loss.rolling(period).mean().iloc[-1]
        rs = avg_gain / max(avg_loss, 1e-10)
        return 100 - (100 / (1 + rs))

    def _sma(self, df: Optional[pd.DataFrame], period: int) -> Optional[float]:
        if df is None or len(df) < period:
            return None
        return float(df["close"].rolling(period).mean().iloc[-1])

    def _ema(self, df: Optional[pd.DataFrame], period: int) -> Optional[float]:
        if df is None or len(df) < period:
            return None
        return float(df["close"].ewm(span=period, adjust=False).mean().iloc[-1])

    def _price(self, df: Optional[pd.DataFrame]) -> Optional[float]:
        if df is None or len(df) == 0:
            return None
        return float(df["close"].iloc[-1])

    def _atr(self, df: Optional[pd.DataFrame], period: int = 14) -> float:
        if df is None or len(df) < period + 1:
            return 0.0
        high, low, close = df["high"].values, df["low"].values, df["close"].values
        tr = np.maximum(high[1:] - low[1:],
                        np.maximum(np.abs(high[1:] - close[:-1]),
                                   np.abs(low[1:] - close[:-1])))
        return float(np.mean(tr[-period:]))

    def _kelly_size(self, win_rate: float, avg_win: float, avg_loss: float, fraction: float = 0.25) -> float:
        if avg_loss == 0:
            return 0.0
        b = avg_win / avg_loss
        p = win_rate
        q = 1 - p
        kelly = (p * b - q) / b if b > 0 else 0.0
        return max(0.0, kelly * fraction)
