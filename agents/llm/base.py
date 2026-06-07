from __future__ import annotations

import asyncio
import concurrent.futures
import logging
from typing import Optional

from agents.base import TradingAgent
from core.enums import AgentRole
from core.language import translate_output
from core.types import AnalystSignal, PortfolioState, RiskLimits, SignalMatrix
from llm.client import LLMClient

from .schemas import ResearchPlan, TraderProposal, PortfolioDecision

logger = logging.getLogger(__name__)
_SYNC_POOL = concurrent.futures.ThreadPoolExecutor(max_workers=1)

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
        return _SYNC_POOL.submit(lambda: asyncio.run(self._analyze_async(tickers, portfolio, signals, **kwargs))).result()

    async def _fetch_fundamentals(self, ticker: str) -> str:
        try:
            import yfinance as yf
            t = yf.Ticker(ticker)
            info = t.info or {}
            financials = t.financials
            balance_sheet = t.balance_sheet
            parts = []
            fast = info.get
            parts.append(f"Market Cap: ${fast('marketCap', 'N/A')}")
            parts.append(f"P/E: {fast('trailingPE', 'N/A')}")
            parts.append(f"Forward P/E: {fast('forwardPE', 'N/A')}")
            parts.append(f"P/B: {fast('priceToBook', 'N/A')}")
            parts.append(f"EV/EBITDA: {fast('enterpriseToEbitda', 'N/A')}")
            parts.append(f"Revenue (TTM): ${fast('totalRevenue', 'N/A')}")
            parts.append(f"Revenue Growth: {fast('revenueGrowth', 'N/A')}")
            parts.append(f"Net Margin: {fast('profitMargins', 'N/A')}")
            parts.append(f"ROE: {fast('returnOnEquity', 'N/A')}")
            parts.append(f"D/E: {fast('debtToEquity', 'N/A')}")
            parts.append(f"Current Ratio: {fast('currentRatio', 'N/A')}")
            parts.append(f"FCF: ${fast('freeCashflow', 'N/A')}")
            parts.append(f"Dividend Yield: {fast('dividendYield', 'N/A')}")
            parts.append(f"Beta: {fast('beta', 'N/A')}")
            parts.append(f"52W High: ${fast('fiftyTwoWeekHigh', 'N/A')}")
            parts.append(f"52W Low: ${fast('fiftyTwoWeekLow', 'N/A')}")
            parts.append(f"Avg Volume: {fast('averageVolume', 'N/A')}")
            return "Real fundamental data (yfinance):\n" + "\n".join(parts)
        except Exception as e:
            logger.debug("Failed to fetch fundamentals for %s: %s", ticker, e)
            return "Real fundamental data: unavailable"

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

            fundamentals = await self._fetch_fundamentals(ticker)

            prompt = (
                f"Analyze {ticker} (current price: ${price:.2f}).\n\n"
                f"=== PROVIDED PRICE DATA (only source of truth for price) ===\n"
                f"Current Price: ${price:.2f}\n"
                f"Technical signals:\n{signal_summary or 'No signals available'}\n\n"
                f"Market regime: {regime.primary if regime else 'Unknown'}\n\n"
                f"{position_info}\n\n"
                f"Portfolio context: ${portfolio.total_value:.2f} total value, ${portfolio.cash:.2f} cash.\n\n"
                f"=== REAL FUNDAMENTAL DATA (yfinance) ===\n{fundamentals}\n\n"
                f"Return JSON with: signal (bullish/bearish/neutral), confidence (0-1), reasoning, risk_factors (list).\n\n"
                f"REMINDER: Only cite data from the sections above. Do not invent financial figures."
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
