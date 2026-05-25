from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

from core.events import EventBus
from core.types import (
    AnalystSignal,
    Order,
    PortfolioState,
    RiskLimits,
    SignalMatrix,
)
from execution.interfaces import OrderManager

from .base import TradingAgent
from .fundamental_analyst import FundamentalAnalystAgent
from .portfolio_manager import PortfolioManagerAgent
from .risk_manager import RiskManagerAgent
from .sentiment_analyst import SentimentAnalystAgent
from .technical_analyst import TechnicalAnalystAgent
from .valuation_analyst import ValuationAnalystAgent


class TradingOrchestrator:
    def __init__(
        self,
        event_bus: Optional[EventBus] = None,
        analysts: Optional[list[TradingAgent]] = None,
        risk_manager: Optional[RiskManagerAgent] = None,
        portfolio_manager: Optional[PortfolioManagerAgent] = None,
        order_manager: Optional[OrderManager] = None,
        max_workers: int = 4,
    ):
        self.event_bus = event_bus or EventBus()
        self.analysts = analysts or [
            TechnicalAnalystAgent(),
            SentimentAnalystAgent(),
            FundamentalAnalystAgent(),
            ValuationAnalystAgent(),
        ]
        self.risk_manager = risk_manager or RiskManagerAgent()
        self.portfolio_manager = portfolio_manager or PortfolioManagerAgent()
        self.order_manager = order_manager
        self.max_workers = max_workers

    def run(
        self,
        tickers: list[str],
        portfolio: PortfolioState,
        signals: SignalMatrix,
        risk_limits: Optional[RiskLimits] = None,
        **kwargs,
    ) -> list[Order]:
        if risk_limits is None:
            risk_limits = RiskLimits()

        all_analyst_signals: dict[str, dict[str, AnalystSignal]] = {}

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {
                executor.submit(
                    analyst.analyze,
                    tickers=tickers,
                    portfolio=portfolio,
                    signals=signals,
                    risk_limits=risk_limits,
                    **kwargs,
                ): analyst
                for analyst in self.analysts
            }
            for future in as_completed(futures):
                analyst = futures[future]
                try:
                    result = future.result()
                    all_analyst_signals[analyst.agent_id] = result
                    if self.event_bus:
                        for ticker, sig in result.items():
                            self.event_bus.emit("analyst_signal", {"agent": analyst.agent_id, "ticker": ticker, "signal": sig})
                except Exception as e:
                    if self.event_bus:
                        self.event_bus.emit("analyst_error", {"agent": analyst.agent_id, "error": str(e)})

        risk_results = self.risk_manager.analyze(
            tickers=tickers,
            portfolio=portfolio,
            signals=signals,
            risk_limits=risk_limits,
            analyst_signals=all_analyst_signals,
            **kwargs,
        )
        all_analyst_signals[self.risk_manager.agent_id] = risk_results

        portfolio_results = self.portfolio_manager.analyze(
            tickers=tickers,
            portfolio=portfolio,
            signals=signals,
            risk_limits=risk_limits,
            analyst_signals=all_analyst_signals,
            current_prices=kwargs.get("current_prices", {}),
        )

        orders = self.portfolio_manager.to_orders(
            portfolio_results,
            kwargs.get("current_prices", {}),
        )

        if self.event_bus:
            for order in orders:
                self.event_bus.emit("order_generated", order.to_dict())

        return orders

    def add_analyst(self, analyst: TradingAgent):
        self.analysts.append(analyst)
