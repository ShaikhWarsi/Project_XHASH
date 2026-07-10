from __future__ import annotations

import logging
from abc import abstractmethod
from typing import Optional

import pandas as pd

from agents.base import TradingAgent
from core.enums import AgentRole
from core.types import AnalystSignal, PortfolioState, RiskLimits, SignalMatrix

logger = logging.getLogger(__name__)


class PersonaAgent(TradingAgent):
    """Base class for investing-legends persona agents.

    Each persona implements its own scoring methodology on top of the
    trading-engine signal pipeline, without requiring LangGraph or
    ai-hedge-fund infrastructure.
    """

    def __init__(self, agent_id: str, name: str, persona: str):
        super().__init__(agent_id=agent_id, role=AgentRole.VALUATION)
        self.name = name
        self.persona = persona

    def analyze(
        self,
        tickers: list[str],
        portfolio: PortfolioState,
        signals: SignalMatrix,
        risk_limits: RiskLimits,
        **kwargs,
    ) -> dict[str, AnalystSignal]:
        prices_df: dict[str, pd.DataFrame] = kwargs.get("prices_df", {})
        results: dict[str, AnalystSignal] = {}

        for ticker in tickers:
            df = prices_df.get(ticker)
            ticker_signals = signals.get_signals(ticker)
            score = signals.get_score(ticker)
            regime = signals.regime

            signal = self._score_ticker(ticker, df, ticker_signals, score, regime, portfolio)
            results[ticker] = signal

        return results

    @abstractmethod
    def _score_ticker(
        self,
        ticker: str,
        df: Optional[pd.DataFrame],
        quant_signals: list,
        composite_score: float,
        regime: object,
        portfolio: PortfolioState,
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

    def _price(self, df: Optional[pd.DataFrame]) -> Optional[float]:
        if df is None or len(df) == 0:
            return None
        return float(df["close"].iloc[-1])

    def _safe_complete(self, prompt: str, fallback: str = "neutral", max_retries: int = 2) -> str:
        for attempt in range(max_retries):
            try:
                from llm.client import LLMClient
                client = LLMClient()
                import asyncio
                result = asyncio.run(client.generate(prompt, temperature=0.1, max_tokens=1024))
                if result:
                    return result
            except Exception as e:
                logger.warning("_safe_complete attempt %d/%d failed: %s", attempt + 1, max_retries, e)
                if attempt < max_retries - 1:
                    import time
                    time.sleep(1)
        return fallback
