from __future__ import annotations

import asyncio
from typing import Optional

from agents.base import TradingAgent
from core.enums import AgentRole
from core.language import translate_output
from core.types import AnalystSignal, PortfolioState, RiskLimits, SignalMatrix
from llm.client import LLMClient

from .schemas import ResearchPlan, TraderProposal, PortfolioDecision


class LLMAgent(TradingAgent):
    def __init__(
        self,
        agent_id: str,
        name: str,
        personality_prompt: str,
        llm_client: Optional[LLMClient] = None,
        model: str = "gpt-4",
        language: str = "en",
        tier: str = "quick",
    ):
        super().__init__(agent_id=agent_id, role=AgentRole.TECHNICAL)
        self.name = name
        self.personality_prompt = personality_prompt
        self.llm = llm_client or LLMClient(model=model, tier=tier)
        self.model = model
        self.language = language

    def analyze(
        self,
        tickers: list[str],
        portfolio: PortfolioState,
        signals: SignalMatrix,
        risk_limits: RiskLimits,
        **kwargs,
    ) -> dict[str, AnalystSignal]:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(self._analyze_async(tickers, portfolio, signals, **kwargs))
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(lambda: asyncio.run(self._analyze_async(tickers, portfolio, signals, **kwargs))).result()

    async def _analyze_async(
        self,
        tickers: list[str],
        portfolio: PortfolioState,
        signals: SignalMatrix,
        **kwargs,
    ) -> dict[str, AnalystSignal]:
        results = {}
        current_prices = kwargs.get("current_prices", {})

        for ticker in tickers:
            price = current_prices.get(ticker, 0)
            ticker_signals = signals.signals.get(ticker, [])
            regime = signals.regime

            signal_summary = "\n".join(
                f"- {s.type}: {'bullish' if s.direction > 0 else 'bearish' if s.direction < 0 else 'neutral'} "
                f"(strength={s.strength:.2f}, confidence={s.confidence:.2f})"
                for s in ticker_signals[:5]
            )

            pos = portfolio.positions.get(ticker)
            position_info = f"Current position: {pos.quantity} shares at ${pos.entry_price:.2f} (current: ${pos.current_price:.2f})" if pos else "No current position"

            prompt = (
                f"Analyze {ticker} (current price: ${price:.2f}).\n\n"
                f"Technical signals:\n{signal_summary or 'No signals available'}\n\n"
                f"Market regime: {regime.primary if regime else 'Unknown'}\n\n"
                f"{position_info}\n\n"
                f"Portfolio context: ${portfolio.total_value:.2f} total value, ${portfolio.cash:.2f} cash.\n\n"
                f"Return JSON with: signal (bullish/bearish/neutral), confidence (0-1), reasoning, risk_factors (list)."
            )

            result = await self.llm.generate_structured(prompt, system=self.personality_prompt, timeout=30.0)
            reasoning = result.get("reasoning", "")
            if self.language != "en":
                reasoning = translate_output(reasoning, self.language)

            results[ticker] = self._make_signal(
                ticker=ticker,
                signal=result.get("signal", "neutral"),
                confidence=float(result.get("confidence", 0.5)),
                reasoning=reasoning,
                metadata=result.get("risk_factors", []),
            )

        return results
