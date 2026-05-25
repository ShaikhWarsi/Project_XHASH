from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class DebateArgument:
    agent_name: str
    stance: str  # bull / bear / neutral
    thesis: str
    confidence: float
    evidence: list[str] = field(default_factory=list)
    counter_args: list[str] = field(default_factory=list)


@dataclass
class DebateRound:
    round_number: int
    symbol: str
    bull_arguments: list[DebateArgument] = field(default_factory=list)
    bear_arguments: list[DebateArgument] = field(default_factory=list)
    neutral_arguments: list[DebateArgument] = field(default_factory=list)
    consensus: str = ""
    consensus_confidence: float = 0.0
    summary: str = ""


@dataclass
class DebateConfig:
    symbol: str
    max_rounds: int = 3
    min_confidence: float = 0.3
    bull_agents: list[str] = field(default_factory=lambda: ["momentum", "technicals", "sentiment"])
    bear_agents: list[str] = field(default_factory=lambda: ["value", "risk", "fundamentals"])
    neutral_agents: list[str] = field(default_factory=list)


class DebateService:
    def __init__(self, config: DebateConfig):
        self.config = config
        self.rounds: list[DebateRound] = []

    async def run_debate(self) -> DebateRound:
        final = DebateRound(
            round_number=len(self.rounds) + 1,
            symbol=self.config.symbol,
        )
        price_data = await self._fetch_price_data(self.config.symbol)
        for agent in self.config.bull_agents:
            arg = await self._generate_argument(agent, "bull", price_data)
            final.bull_arguments.append(arg)
        for agent in self.config.bear_agents:
            arg = await self._generate_argument(agent, "bear", price_data)
            final.bear_arguments.append(arg)
        for agent in self.config.neutral_agents:
            arg = await self._generate_argument(agent, "neutral", price_data)
            final.neutral_arguments.append(arg)
        final = self._build_consensus(final)
        self.rounds.append(final)
        return final

    async def debate_round(self, round_num: int, previous_round: DebateRound | None = None) -> DebateRound:
        r = DebateRound(round_number=round_num, symbol=self.config.symbol)
        price_data = await self._fetch_price_data(self.config.symbol)
        prev_bull = [a.thesis for a in previous_round.bull_arguments] if previous_round else []
        prev_bear = [a.thesis for a in previous_round.bear_arguments] if previous_round else []
        for agent in self.config.bull_agents:
            arg = await self._generate_argument(agent, "bull", price_data, prev_bear)
            r.bull_arguments.append(arg)
        for agent in self.config.bear_agents:
            arg = await self._generate_argument(agent, "bear", price_data, prev_bull)
            r.bear_arguments.append(arg)
        for agent in self.config.neutral_agents:
            arg = await self._generate_argument(agent, "neutral", price_data, prev_bull + prev_bear)
            r.neutral_arguments.append(arg)
        return self._build_consensus(r)

    def _build_consensus(self, r: DebateRound) -> DebateRound:
        all_args = r.bull_arguments + r.bear_arguments + r.neutral_arguments
        if not all_args:
            r.consensus = "neutral"
            r.consensus_confidence = 0.5
            r.summary = "No arguments available"
            return r
        bull_conf = sum(a.confidence * (1 if a.stance == "bull" else 0) for a in all_args)
        bear_conf = sum(a.confidence * (1 if a.stance == "bear" else 0) for a in all_args)
        if bull_conf > bear_conf and bull_conf > self.config.min_confidence:
            r.consensus = "bullish"
            r.consensus_confidence = bull_conf / (bull_conf + bear_conf) if (bull_conf + bear_conf) > 0 else 0.5
            r.summary = f"Bullish consensus ({len(r.bull_arguments)} bull vs {len(r.bear_arguments)} bear)"
        elif bear_conf > self.config.min_confidence:
            r.consensus = "bearish"
            r.consensus_confidence = bear_conf / (bull_conf + bear_conf) if (bull_conf + bear_conf) > 0 else 0.5
            r.summary = f"Bearish consensus ({len(r.bear_arguments)} bear vs {len(r.bull_arguments)} bull)"
        else:
            r.consensus = "neutral"
            r.consensus_confidence = 0.5
            r.summary = "No clear consensus"
        return r

    async def _fetch_price_data(self, symbol: str) -> dict:
        try:
            import yfinance as yf
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="3mo")
            if hist.empty:
                return {"price": 100, "volume": 1_000_000}
            return {
                "price": float(hist["Close"].iloc[-1]),
                "volume": float(hist["Volume"].iloc[-1]),
                "high_52w": float(hist["High"].max()),
                "low_52w": float(hist["Low"].min()),
                "sma_20": float(hist["Close"].rolling(20).mean().iloc[-1]) if len(hist) >= 20 else 0,
                "sma_50": float(hist["Close"].rolling(50).mean().iloc[-1]) if len(hist) >= 50 else 0,
                "rsi_14": self._calc_rsi(hist["Close"]),
            }
        except Exception as e:
            logger.warning("Failed to fetch data for %s: %s", symbol, e)
            return {"price": 100, "volume": 1_000_000}

    def _calc_rsi(self, prices) -> float:
        if len(prices) < 15:
            return 50.0
        delta = prices.diff()
        gain = delta.where(delta > 0, 0).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / loss.replace(0, float("inf"))
        return float(100 - (100 / (1 + rs.iloc[-1]))) if rs.iloc[-1] != float("inf") else 50.0

    async def _generate_argument(self, agent: str, stance: str, price_data: dict, counter: list[str] | None = None) -> DebateArgument:
        p = price_data.get("price", 100)
        v = price_data.get("volume", 1_000_000)
        sma20 = price_data.get("sma_20", p)
        sma50 = price_data.get("sma_50", p)
        rsi = price_data.get("rsi_14", 50)
        high52 = price_data.get("high_52w", p)
        low52 = price_data.get("low_52w", p)
        evidence = [f"Price: ${p:.2f}", f"Volume: {v:,.0f}", f"RSI(14): {rsi:.1f}"]
        if sma20 > sma50:
            evidence.append(f"SMA20 ({sma20:.2f}) > SMA50 ({sma50:.2f}) — bullish cross")
        else:
            evidence.append(f"SMA20 ({sma20:.2f}) < SMA50 ({sma50:.2f}) — bearish cross")
        pct_from_high = (high52 - p) / high52 * 100
        pct_from_low = (p - low52) / low52 * 100
        evidence.append(f"{pct_from_high:.1f}% from 52w high, {pct_from_low:.1f}% from 52w low")
        if stance == "bull":
            conf = min(0.95, max(0.3, (rsi / 100) if rsi < 70 else (100 - rsi) / 100))
            thesis = f"{agent.upper()}: Bullish — price momentum and technicals supportive"
            if counter:
                thesis += f" | Rebuttal: {'; '.join(counter[:2])}"
        elif stance == "bear":
            conf = min(0.95, max(0.3, (100 - rsi) / 100 if rsi > 30 else rsi / 100))
            thesis = f"{agent.upper()}: Bearish — overbought conditions and mean reversion risk"
            if counter:
                thesis += f" | Rebuttal: {'; '.join(counter[:2])}"
        else:
            conf = 0.5
            thesis = f"{agent.upper()}: Neutral — mixed signals, awaiting clearer direction"
        return DebateArgument(
            agent_name=agent,
            stance=stance,
            thesis=thesis,
            confidence=round(conf, 2),
            evidence=evidence,
        )
