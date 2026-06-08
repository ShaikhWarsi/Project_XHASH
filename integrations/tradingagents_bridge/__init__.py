"""Bridge layer: wraps vendored TradingAgents for the core app."""
from .report_bundle import ReportBundle, PortfolioDecisionOut, AnalystReport, DebateRound, ScrapeBundle, ScrapeSource
from .run_pipeline import run_pipeline
from .config import build_ta_config

__all__ = [
    "ReportBundle", "PortfolioDecisionOut", "AnalystReport", "DebateRound",
    "ScrapeBundle", "ScrapeSource",
    "run_pipeline", "build_ta_config",
]
