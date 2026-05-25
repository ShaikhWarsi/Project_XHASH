from __future__ import annotations

from typing import Optional

from core.enums import AgentRole, OrderSide, OrderType
from core.types import (
    AnalystSignal,
    Decision,
    Order,
    PortfolioState,
    RiskLimits,
    SignalMatrix,
)

from .base import TradingAgent


class PortfolioManagerAgent(TradingAgent):
    """Portfolio management agent.

    Ported from ai-hedge-fund/src/agents/portfolio_manager.py.

    Consumes all analyst signals and risk data, produces final
    trading decisions (Order objects).
    """

    def __init__(self, agent_id: str = "portfolio_manager"):
        super().__init__(agent_id=agent_id, role=AgentRole.PORTFOLIO_MANAGER)

    def analyze(
        self,
        tickers: list[str],
        portfolio: PortfolioState,
        signals: SignalMatrix,
        risk_limits: RiskLimits,
        **kwargs,
    ) -> dict[str, AnalystSignal]:
        analyst_signals: dict[str, dict[str, AnalystSignal]] = kwargs.get("analyst_signals", {})
        current_prices: dict[str, float] = kwargs.get("current_prices", {})

        decisions: dict[str, Decision] = {}
        for ticker in tickers:
            risk_signal = analyst_signals.get("risk_management_agent", {}).get(ticker)
            remaining_limit = 0.0
            price = current_prices.get(ticker, 0.0)

            if risk_signal:
                remaining_limit = risk_signal.metadata.get("remaining_position_limit", 0.0)
                price = risk_signal.metadata.get("current_price", price)

            max_qty = int(remaining_limit // max(price, 1.0)) if price > 0 else 0

            if max_qty <= 0:
                decisions[ticker] = Decision(ticker=ticker, action="hold", quantity=0, confidence=1.0, reasoning="No valid trade available")
                continue

            weighted_score = self._aggregate_signals(ticker, analyst_signals, risk_signal)

            if weighted_score > 0.2:
                action = "buy"
                qty = min(max_qty, int(max_qty * min(weighted_score, 1.0)))
                decisions[ticker] = Decision(
                    ticker=ticker,
                    action=action,
                    quantity=max(1, qty),
                    confidence=min(weighted_score, 1.0),
                    reasoning=f"Aggregate score {weighted_score:.2f}, limit ${remaining_limit:.0f}",
                )
            elif weighted_score < -0.2:
                pos = portfolio.positions.get(ticker)
                action = "short" if pos is None or pos.quantity == 0 else "sell"
                qty = min(max_qty, int(max_qty * min(abs(weighted_score), 1.0)))
                decisions[ticker] = Decision(
                    ticker=ticker,
                    action=action,
                    quantity=max(1, qty),
                    confidence=min(abs(weighted_score), 1.0),
                    reasoning=f"Aggregate score {weighted_score:.2f}, limit ${remaining_limit:.0f}",
                )
            else:
                decisions[ticker] = Decision(
                    ticker=ticker, action="hold", quantity=0, confidence=0.5, reasoning="No clear signal"
                )

        return {
            ticker: AnalystSignal(
                agent=self.agent_id,
                ticker=ticker,
                signal=d.action,
                confidence=d.confidence,
                reasoning=d.reasoning,
                metadata={"quantity": d.quantity},
            )
            for ticker, d in decisions.items()
        }

    def to_orders(self, decisions: dict[str, AnalystSignal], current_prices: dict[str, float]) -> list[Order]:
        """Convert portfolio decisions into executable orders."""
        orders: list[Order] = []
        for ticker, signal in decisions.items():
            if signal.signal in ("hold", "neutral"):
                continue

            action = signal.signal
            qty = signal.metadata.get("quantity", 0)
            if qty <= 0:
                continue

            price = current_prices.get(ticker, 0.0)

            if action == "buy":
                side = OrderSide.BUY
            elif action == "sell":
                side = OrderSide.SELL
            elif action == "short":
                side = OrderSide.SHORT
            elif action == "cover":
                side = OrderSide.COVER
            else:
                continue

            orders.append(Order(
                symbol=ticker,
                side=side,
                quantity=float(qty),
                order_type=OrderType.MARKET,
                price=price,
                reason=signal.reasoning,
            ))

        return orders

    @staticmethod
    def _aggregate_signals(
        ticker: str,
        analyst_signals: dict[str, dict[str, AnalystSignal]],
        risk_signal: Optional[AnalystSignal],
    ) -> float:
        signal_values = {"bullish": 1.0, "neutral": 0.0, "bearish": -1.0}
        weighted_sum = 0.0
        total_weight = 0.0

        weights = {
            "technical_analyst_agent": 0.25,
            "sentiment_analyst_agent": 0.15,
            "fundamental_analyst_agent": 0.20,
            "valuation_analyst_agent": 0.15,
        }

        for agent_name, weight in weights.items():
            sig = analyst_signals.get(agent_name, {}).get(ticker)
            if sig and sig.signal in signal_values:
                weighted_sum += signal_values[sig.signal] * weight * sig.confidence
                total_weight += weight

        if risk_signal:
            limit = risk_signal.metadata.get("remaining_position_limit", 0.0)
            if limit <= 0:
                weighted_sum *= 0.5

        return weighted_sum / max(total_weight, 0.01)
