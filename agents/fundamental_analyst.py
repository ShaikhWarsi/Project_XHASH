from __future__ import annotations

from core.enums import AgentRole
from core.types import AnalystSignal, PortfolioState, RiskLimits, SignalMatrix

from .base import TradingAgent


class FundamentalAnalystAgent(TradingAgent):
    """Fundamental analysis agent.

    Ported from ai-hedge-fund/src/agents/fundamentals.py.

    Evaluates financial health using provided fundamental metrics.
    """

    def __init__(self, agent_id: str = "fundamental_analyst_agent"):
        super().__init__(agent_id=agent_id, role=AgentRole.FUNDAMENTALS)

    def analyze(
        self,
        tickers: list[str],
        portfolio: PortfolioState,
        signals: SignalMatrix,
        risk_limits: RiskLimits,
        **kwargs,
    ) -> dict[str, AnalystSignal]:
        fundamentals = kwargs.get("fundamentals", {})
        results: dict[str, AnalystSignal] = {}

        for ticker in tickers:
            fd = fundamentals.get(ticker, {})
            if not fd:
                results[ticker] = self._make_signal(ticker, "neutral", 0.3, "No fundamental data")
                continue

            score = 0.0
            reasons = []

            pe = fd.get("pe_ratio")
            if pe and 5 < pe < 25:
                score += 0.5
                reasons.append(f"PE={pe:.1f}")
            elif pe and pe <= 5:
                score += 0.8
                reasons.append(f"PE={pe:.1f}(undervalued)")
            elif pe and pe > 25:
                score -= 0.3
                reasons.append(f"PE={pe:.1f}(overvalued)")

            pb = fd.get("pb_ratio")
            if pb and pb < 1.5:
                score += 0.3
                reasons.append(f"PB={pb:.2f}")
            elif pb and pb > 3:
                score -= 0.2
                reasons.append(f"PB={pb:.2f}(high)")

            de = fd.get("debt_equity")
            if de is not None:
                if de < 0.5:
                    score += 0.3
                    reasons.append(f"D/E={de:.2f}")
                elif de > 2.0:
                    score -= 0.4
                    reasons.append(f"D/E={de:.2f}(high)")

            roe = fd.get("roe")
            if roe and roe > 0.15:
                score += 0.3
                reasons.append(f"ROE={roe:.1%}")

            revenue_growth = fd.get("revenue_growth")
            if revenue_growth and revenue_growth > 0.1:
                score += 0.4
                reasons.append(f"growth={revenue_growth:.1%}")

            score = max(-1.0, min(1.0, score))

            if score > 0.3:
                signal = "bullish"
                conf = min(score, 1.0)
            elif score < -0.3:
                signal = "bearish"
                conf = min(abs(score), 1.0)
            else:
                signal = "neutral"
                conf = 0.5

            results[ticker] = self._make_signal(
                ticker=ticker,
                signal=signal,
                confidence=conf,
                reasoning="; ".join(reasons) if reasons else "No clear signals",
                metadata=fd,
            )

        return results
