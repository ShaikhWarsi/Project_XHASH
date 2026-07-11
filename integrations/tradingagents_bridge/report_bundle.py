"""Data classes for pipeline output consumed by the API and frontend."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, List, Optional


class ScrapeSource:
    source: str
    items: list[dict]
    fetched_at: str

    def __init__(self, source: str, items: list[dict], fetched_at: str | None = None):
        self.source = source
        self.items = items
        self.fetched_at = fetched_at or datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        return {"source": self.source, "items": self.items, "fetched_at": self.fetched_at}


class ScrapeBundle:
    ticker: str
    sources: list[ScrapeSource]

    def __init__(self, ticker: str, sources: list[ScrapeSource] | None = None):
        self.ticker = ticker
        self.sources = sources or []

    def to_dict(self) -> dict:
        return {"ticker": self.ticker, "sources": [s.to_dict() for s in self.sources]}


class AnalystReport:
    name: str
    content: str
    at: str

    def __init__(self, name: str, content: str, at: str | None = None):
        self.name = name
        self.content = content
        self.at = at or datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        return {"name": self.name, "content": self.content, "at": self.at}


class DebateRound:
    speaker: str
    round: int
    content: str
    at: str

    def __init__(self, speaker: str, round: int, content: str, at: str | None = None):
        self.speaker = speaker
        self.round = round
        self.content = content
        self.at = at or datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        return {"speaker": self.speaker, "round": self.round, "content": self.content, "at": self.at}


class PortfolioDecisionOut:
    rating: str
    executive_summary: str
    investment_thesis: str
    price_target: float | None
    time_horizon: str | None
    raw: str

    def __init__(
        self, rating: str = "", executive_summary: str = "", investment_thesis: str = "",
        price_target: float | None = None, time_horizon: str | None = None, raw: str = "",
    ):
        self.rating = rating
        self.executive_summary = executive_summary
        self.investment_thesis = investment_thesis
        self.price_target = price_target
        self.time_horizon = time_horizon
        self.raw = raw

    def to_dict(self) -> dict:
        return {
            "rating": self.rating,
            "executive_summary": self.executive_summary,
            "investment_thesis": self.investment_thesis,
            "price_target": self.price_target,
            "time_horizon": self.time_horizon,
            "raw": self.raw,
        }


class ReportBundle:
    ticker: str
    scrape: ScrapeBundle | None
    analysts: list[AnalystReport]
    invest_debate: list[DebateRound]
    research_plan: str
    trader_plan: str
    risk_debate: list[DebateRound]
    final: PortfolioDecisionOut

    def __init__(self, ticker: str):
        self.ticker = ticker
        self.scrape = None
        self.analysts = []
        self.invest_debate = []
        self.research_plan = ""
        self.trader_plan = ""
        self.risk_debate = []
        self.final = PortfolioDecisionOut()

    def to_dict(self) -> dict:
        return {
            "ticker": self.ticker,
            "scrape": self.scrape.to_dict() if self.scrape else None,
            "analysts": [a.to_dict() for a in self.analysts],
            "invest_debate": [r.to_dict() for r in self.invest_debate],
            "research_plan": self.research_plan,
            "trader_plan": self.trader_plan,
            "risk_debate": [r.to_dict() for r in self.risk_debate],
            "final": self.final.to_dict(),
        }
