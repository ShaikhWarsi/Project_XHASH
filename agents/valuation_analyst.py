from __future__ import annotations

from core.enums import AgentRole
from core.types import AnalystSignal, PortfolioState, RiskLimits, SignalMatrix

from .base import TradingAgent


class ValuationAnalystAgent(TradingAgent):
    """Valuation analysis agent.

    Ported from ai-hedge-fund/src/agents/valuation.py.

    Compares current price to intrinsic/fair value estimates.
    """

    def __init__(self, agent_id: str = "valuation_analyst_agent"):
        super().__init__(agent_id=agent_id, role=AgentRole.VALUATION)

    def analyze(
        self,
        tickers: list[str],
        portfolio: PortfolioState,
        signals: SignalMatrix,
        risk_limits: RiskLimits,
        **kwargs,
    ) -> dict[str, AnalystSignal]:
        valuations = kwargs.get("valuations", {})
        prices = kwargs.get("current_prices", {})
        results: dict[str, AnalystSignal] = {}

        for ticker in tickers:
            val = valuations.get(ticker, {})
            price = prices.get(ticker, 0.0)

            if not val or price <= 0:
                results[ticker] = self._make_signal(ticker, "neutral", 0.3, "No valuation data")
                continue

            fair_value = val.get("fair_value", 0.0)
            if fair_value <= 0:
                results[ticker] = self._make_signal(ticker, "neutral", 0.3, "No fair value estimate")
                continue

            discount = (fair_value - price) / fair_value

            if discount > 0.15:
                signal = "bullish"
                confidence = min(discount * 2, 1.0)
                reasoning = f"Trading at {discount:.1%} below fair value (${fair_value:.2f})"
            elif discount < -0.15:
                signal = "bearish"
                confidence = min(abs(discount) * 2, 1.0)
                reasoning = f"Trading at {abs(discount):.1%} above fair value (${fair_value:.2f})"
            else:
                signal = "neutral"
                confidence = 0.5
                reasoning = f"Near fair value (${fair_value:.2f})"

            results[ticker] = self._make_signal(
                ticker=ticker,
                signal=signal,
                confidence=confidence,
                reasoning=reasoning,
                metadata={"fair_value": fair_value, "current_price": price, "discount": discount},
            )

        return results
