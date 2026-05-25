from itertools import chain
from typing import Optional

import numpy as np
import pandas as pd

from core.enums import AgentRole
from core.types import AnalystSignal, PortfolioState

from .base import RenaissanceAgent


class ResearchTeam:
    def __init__(self, agents: list[RenaissanceAgent]):
        self.agents = agents

    @property
    def agent_list(self) -> list[RenaissanceAgent]:
        return self.agents


class SignalScientistAgent(RenaissanceAgent):
    """Statistical arbitrage and signal discovery agent.

    Uses factor models, correlation analysis, and statistical
    tests to discover tradable signals in market data.
    """

    def __init__(self, agent_id: str = "signal_scientist"):
        super().__init__(
            agent_id=agent_id,
            name="Signal Scientist",
            role=AgentRole.TECHNICAL,
            description="Statistical arbitrage and factor model signal discovery",
        )

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
        if df is None or len(df) < 60:
            return AnalystSignal(agent=self.agent_id, ticker=ticker, signal="neutral", confidence=0.0,
                                 reasoning="insufficient data")

        returns = df["close"].pct_change().dropna()
        score = 0.0
        reasons = []

        hurst = self._compute_hurst(df["close"])
        if hurst < 0.4:
            score += 0.3
            reasons.append(f"mean-reverting(H={hurst:.2f})")
        elif hurst > 0.6:
            score += 0.2
            reasons.append(f"trending(H={hurst:.2f})")

        skew = float(returns.skew())
        if skew > 1.0:
            score += 0.15
            reasons.append(f"pos-skew({skew:.2f})")
        elif skew < -1.0:
            score -= 0.15
            reasons.append(f"neg-skew({skew:.2f})")

        kurt = float(returns.kurtosis())
        if kurt > 5:
            score -= 0.2
            reasons.append(f"fat-tail({kurt:.1f})")

        half_life = self._compute_half_life(df["close"])
        if half_life and 5 < half_life < 30:
            score += 0.25
            reasons.append(f"mean-rev-halflife={half_life:.0f}")

        for s in quant_signals:
            if hasattr(s, "strength") and hasattr(s, "confidence"):
                if s.strength > 0.5 and s.confidence > 0.5:
                    score += 0.05 * min(s.strength * s.confidence, 1.0)
                    reasons.append(f"sig({s.type})")

        score = max(-1.0, min(1.0, score))
        signal = "bullish" if score > 0.2 else "bearish" if score < -0.2 else "neutral"
        return AnalystSignal(
            agent=self.agent_id, ticker=ticker, signal=signal,
            confidence=min(abs(score), 1.0),
            reasoning="; ".join(reasons) if reasons else "no signal",
            metadata={"hurst": hurst, "skew": skew, "kurt": kurt, "half_life": half_life},
        )

    @staticmethod
    def _compute_hurst(price: pd.Series, max_lag: int = 20) -> float:
        try:
            lags = range(2, max_lag)
            tau = [max(1e-8, np.std(np.subtract(price[lags[lag]:].values if lags[lag] < len(price) else price[:1].values,
                                                  price[:-lags[lag]].values if lags[lag] < len(price) else price[:1].values)))
                   for lag in [lag for lag in lags if lag < len(price) // 2]]
            if len(tau) < 2:
                return 0.5
            reg = np.polyfit(np.log(list(range(2, 2 + len(tau)))), np.log(tau), 1)
            return float(reg[0])
        except Exception:
            return 0.5

    @staticmethod
    def _compute_half_life(price: pd.Series) -> Optional[float]:
        try:
            y = price.diff().dropna().values
            x = price.shift(1).dropna().values
            if len(x) < 2 or len(y) < 2:
                return None
            n = min(len(x), len(y))
            x, y = x[:n], y[:n]
            reg = np.polyfit(x, y, 1)
            if reg[0] >= 0:
                return None
            half_life = -np.log(2) / reg[0]
            return float(half_life) if 0 < half_life < 1000 else None
        except Exception:
            return None


class QuantResearcherAgent(RenaissanceAgent):
    """Quantitative research and alpha factor discovery.

    Tests and validates alpha factors, portfolio construction
    techniques, and market microstructure patterns.
    """

    def __init__(self, agent_id: str = "quant_researcher"):
        super().__init__(
            agent_id=agent_id,
            name="Quant Researcher",
            role=AgentRole.TECHNICAL,
            description="Alpha factor research and portfolio construction",
        )

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
        if df is None or len(df) < 100:
            return AnalystSignal(agent=self.agent_id, ticker=ticker, signal="neutral", confidence=0.0,
                                 reasoning="insufficient data")

        score = composite_score * 0.3
        reasons = [f"composite={composite_score:.2f}"]

        ma_50 = self._sma(df, 50)
        ma_200 = self._sma(df, 200)
        price = self._price(df)

        if price and ma_50 and ma_200:
            if price > ma_50 > ma_200:
                score += 0.3
                reasons.append("golden-cross")
            elif price < ma_50 < ma_200:
                score -= 0.3
                reasons.append("death-cross")
            if price < ma_200 * 0.8:
                score += 0.25
                reasons.append("deep-value")

        volume = df["volume"].values
        if len(volume) > 20:
            vol_ratio = volume[-1] / np.mean(volume[-21:-1]) if np.mean(volume[-21:-1]) > 0 else 1.0
            if vol_ratio > 2.0 and price and price > (ma_50 or 0):
                score += 0.2
                reasons.append(f"vol-surge({vol_ratio:.1f}x)")

        rsi = self._safe_rsi(df)
        if rsi < 30:
            score += 0.15
            reasons.append(f"oversold(rsi={rsi:.0f})")
        elif rsi > 70:
            score -= 0.15
            reasons.append(f"overbought(rsi={rsi:.0f})")

        score = max(-1.0, min(1.0, score))
        signal = "bullish" if score > 0.2 else "bearish" if score < -0.2 else "neutral"
        return AnalystSignal(
            agent=self.agent_id, ticker=ticker, signal=signal,
            confidence=min(abs(score), 1.0),
            reasoning="; ".join(reasons),
            metadata={"composite_score": composite_score},
        )


class RenaissancePortfolioManager(RenaissanceAgent):
    """Portfolio construction and optimization agent.

    Implements Markowitz mean-variance optimization, risk parity,
    and Kelly criterion-based position sizing.
    """

    def __init__(self, agent_id: str = "renaissance_pm"):
        super().__init__(
            agent_id=agent_id,
            name="Renaissance PM",
            role=AgentRole.PORTFOLIO_MANAGER,
            description="Portfolio construction, optimization, and position sizing",
        )

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
        if df is None or len(df) < 50:
            return AnalystSignal(agent=self.agent_id, ticker=ticker, signal="neutral", confidence=0.0,
                                 reasoning="insufficient data")

        returns = df["close"].pct_change().dropna().values
        win_rate = float(np.mean(returns > 0))
        avg_win = float(np.mean(returns[returns > 0])) if np.any(returns > 0) else 0.0
        avg_loss = float(abs(np.mean(returns[returns < 0]))) if np.any(returns < 0) else 0.0

        kelly = self._kelly_size(win_rate, avg_win, avg_loss)
        sharp_ratio = float(np.mean(returns) / max(np.std(returns), 1e-10)) * np.sqrt(252)

        score = composite_score * 0.4 + kelly * 0.3 + min(sharp_ratio / 2, 0.3)
        reasons = [f"kelly={kelly:.2f}", f"sharpe={sharp_ratio:.2f}", f"wr={win_rate:.0%}"]

        signal = "bullish" if score > 0.2 else "bearish" if score < -0.2 else "neutral"
        return AnalystSignal(
            agent=self.agent_id, ticker=ticker, signal=signal,
            confidence=min(abs(score), 1.0),
            reasoning="; ".join(reasons),
            metadata={"kelly_fraction": kelly, "sharpe_ratio": sharp_ratio, "win_rate": win_rate},
        )
