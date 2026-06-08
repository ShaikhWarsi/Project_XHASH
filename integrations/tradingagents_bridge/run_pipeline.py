"""Run the full TradingAgents pipeline and return a ReportBundle."""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, date
from typing import Any, Callable, Optional

from integrations.tradingagents.graph.trading_graph import TradingAgentsGraph
from integrations.tradingagents.dataflows.interface import route_to_vendor
from integrations.tradingagents.dataflows.stocktwits import fetch_stocktwits_messages
from integrations.tradingagents.dataflows.reddit import fetch_reddit_posts
from integrations.tradingagents.dataflows.yfinance_news import get_news_yfinance as get_yfinance_news
from integrations.tradingagents.dataflows.config import get_config

from integrations.tradingagents.agents.utils.agent_states import InvestDebateState, RiskDebateState

from .config import build_ta_config
from .model_autodetect import auto_detect_model
from .report_bundle import (
    ReportBundle, ScrapeBundle, ScrapeSource,
    AnalystReport, DebateRound, PortfolioDecisionOut,
)
from .callback_emitter import (
    TradingAgentsCallbackHandler, SSEEvent,
    build_scrape_event, build_analyst_event,
    build_debate_round_event, build_decision_event, build_run_complete_event,
    build_stage_event, build_analyst_started_event, build_debate_started_event,
)

logger = logging.getLogger(__name__)

_ANALYST_NAMES = {
    "market": "Market Analyst",
    "social": "Sentiment Analyst",
    "news": "News Analyst",
    "fundamentals": "Fundamentals Analyst",
}


async def run_pipeline(
    ticker: str,
    trade_date: str | None = None,
    max_debate_rounds: int = 1,
    max_risk_rounds: int = 1,
    push_event: Callable[[SSEEvent], None] | None = None,
    config_overrides: dict[str, Any] | None = None,
) -> ReportBundle:
    """Execute the full TradingAgents pipeline for a ticker.

    Args:
        ticker: Stock symbol (e.g. "NVDA").
        trade_date: ISO date string. Defaults to today.
        max_debate_rounds: Bull/bear debate rounds.
        max_risk_rounds: Risk discussion rounds.
        push_event: Optional SSE callback for streaming progress.
        config_overrides: Extra config keys to override.

    Returns:
        A ReportBundle with all scraped data, analyst reports, debates, and final decision.
    """
    trade_date = trade_date or date.today().isoformat()

    # Build config with env-var overrides + explicit overrides
    overrides = dict(config_overrides or {})
    overrides.setdefault("max_debate_rounds", max_debate_rounds)
    overrides.setdefault("max_risk_discuss_rounds", max_risk_rounds)
    cfg = build_ta_config(overrides)

    # Auto-detect LM Studio model if none specified
    if not cfg.get("deep_think_llm"):
        detected = auto_detect_model(cfg.get("backend_url"))
        if detected:
            cfg["deep_think_llm"] = detected
    if not cfg.get("quick_think_llm"):
        cfg["quick_think_llm"] = cfg.get("deep_think_llm") or "local-model"

    bundle = ReportBundle(ticker=ticker)

    # ── Phase 1: Scrape raw data ─────────────────────────────────────
    if push_event:
        push_event(SSEEvent("pipeline_start", {"ticker": ticker, "phase": "scrape"}))
        push_event(build_stage_event(ticker, "scraping", "Scraping StockTwits, Reddit, and Yahoo Finance data"))

    ticker_upper = ticker.upper()

    # StockTwits
    try:
        st_text = await asyncio.to_thread(fetch_stocktwits_messages, ticker_upper, 30)
        bundle.scrape.sources.append(ScrapeSource("stocktwits", [{"text": st_text}]))
        if push_event:
            push_event(build_scrape_event(ticker, "stocktwits", 1))
    except Exception as e:
        logger.warning("StockTwits fetch failed: %s", e)

    # Reddit
    try:
        reddit_text = await asyncio.to_thread(fetch_reddit_posts, ticker_upper, ("wallstreetbets", "stocks", "investing"), 5)
        bundle.scrape.sources.append(ScrapeSource("reddit", [{"text": reddit_text}]))
        if push_event:
            push_event(build_scrape_event(ticker, "reddit", 1))
    except Exception as e:
        logger.warning("Reddit fetch failed: %s", e)

    # Yahoo Finance news
    try:
        news_items = await asyncio.to_thread(get_yfinance_news, ticker_upper)
        bundle.scrape.sources.append(ScrapeSource("yahoo_news", news_items or []))
        if push_event:
            push_event(build_scrape_event(ticker, "yahoo_news", len(news_items or [])))
    except Exception as e:
        logger.warning("Yahoo news fetch failed: %s", e)

    # Yahoo Finance global news
    try:
        global_news = await asyncio.to_thread(
            get_yfinance_news, "^GSPC"
        )
        bundle.scrape.sources.append(ScrapeSource("yahoo_global", global_news or []))
        if push_event:
            push_event(build_scrape_event(ticker, "yahoo_global", len(global_news or [])))
    except Exception as e:
        logger.warning("Yahoo global news fetch failed: %s", e)

    # ── Phase 2: Run the TradingAgents graph ────────────────────────
    if push_event:
        push_event(build_stage_event(ticker, "analysts", "Running 4 analysts (Market, Sentiment, News, Fundamentals)"))

    callbacks = [TradingAgentsCallbackHandler(push_event or _noop, ticker=ticker)] if push_event else []

    try:
        graph = TradingAgentsGraph(
            selected_analysts=["market", "social", "news", "fundamentals"],
            debug=False,
            config=cfg,
            callbacks=callbacks,
        )

        final_state, signal = await asyncio.to_thread(
            graph.propagate, ticker, trade_date, "stock"
        )

        if push_event:
            push_event(build_decision_event(ticker, "research_manager",
                                             final_state.get("investment_plan", "")))

    except Exception as exc:
        logger.exception("TradingAgents pipeline failed for %s: %s", ticker, exc)
        if push_event:
            push_event(SSEEvent("pipeline_error", {"ticker": ticker, "error": str(exc)}))
        return _bundle_from_partial(bundle, final_state if 'final_state' in dir() else None)

    # ── Phase 3: Extract structured report from final state ─────────
    if push_event:
        push_event(build_stage_event(ticker, "analysts", "Extracting analyst reports"))

    _extract_analyst_reports(bundle, final_state)

    if push_event:
        push_event(build_stage_event(ticker, "debate", "Extracting investment debate"))

    _extract_debates(bundle, final_state)

    if push_event:
        push_event(build_stage_event(ticker, "risk", "Extracting risk debate"))

    _extract_trader_plan(bundle, final_state)
    _extract_decision(bundle, final_state, signal)

    if push_event:
        push_event(build_stage_event(ticker, "final", "Finalizing decision"))
        push_event(build_run_complete_event(ticker, bundle.final.rating))

    return bundle


def _noop(_event: SSEEvent):
    pass


def _extract_analyst_reports(bundle: ReportBundle, state: dict):
    for key, name in _ANALYST_NAMES.items():
        report_key = f"{key}_report"
        content = state.get(report_key, "")
        if key == "social":
            content = state.get("sentiment_report", "")
        if content:
            bundle.analysts.append(AnalystReport(name=name, content=content))


def _extract_debates(bundle: ReportBundle, state: dict):
    invest_debate = state.get("investment_debate_state", {})
    if isinstance(invest_debate, dict):
        if invest_debate.get("bull_history"):
            bundle.invest_debate.append(DebateRound(
                speaker="Bull Researcher", round=1,
                content=invest_debate["bull_history"][:2000],
            ))
        if invest_debate.get("bear_history"):
            bundle.invest_debate.append(DebateRound(
                speaker="Bear Researcher", round=1,
                content=invest_debate["bear_history"][:2000],
            ))
        if invest_debate.get("judge_decision"):
            bundle.invest_debate.append(DebateRound(
                speaker="Research Manager", round=0,
                content=invest_debate["judge_decision"][:2000],
            ))

    risk_debate = state.get("risk_debate_state", {})
    if isinstance(risk_debate, dict):
        for speaker, key, round_num in [
            ("Aggressive Analyst", "aggressive_history", 1),
            ("Conservative Analyst", "conservative_history", 1),
            ("Neutral Analyst", "neutral_history", 1),
        ]:
            content = risk_debate.get(key)
            if content:
                bundle.risk_debate.append(DebateRound(
                    speaker=speaker, round=round_num, content=content[:2000],
                ))
        if risk_debate.get("judge_decision"):
            bundle.risk_debate.append(DebateRound(
                speaker="Portfolio Manager", round=0,
                content=risk_debate["judge_decision"][:2000],
            ))


def _extract_trader_plan(bundle: ReportBundle, state: dict):
    bundle.research_plan = state.get("investment_plan", "")
    bundle.trader_plan = state.get("trader_investment_plan", "")


def _extract_decision(bundle: ReportBundle, state: dict, signal: str = ""):
    final_text = state.get("final_trade_decision", "")
    bundle.final.raw = final_text

    from integrations.tradingagents.agents.utils.rating import parse_rating
    bundle.final.rating = parse_rating(final_text) or parse_rating(signal) or "Hold"

    # Try to extract structured fields from the text
    import re
    for pattern, field, target in [
        (r"\*\*Executive Summary\*\*\s*:\s*(.*?)(?=\n\*\*|\Z)", "executive_summary", None),
        (r"\*\*Investment Thesis\*\*\s*:\s*(.*?)(?=\n\*\*|\Z)", "investment_thesis", None),
        (r"\*\*Price Target\*\*\s*:\s*\$?([\d,.]+)", "price_target", float),
        (r"\*\*Time Horizon\*\*\s*:\s*(.*?)(?=\n\*\*|\Z)", "time_horizon", None),
    ]:
        m = re.search(pattern, final_text, re.DOTALL)
        if m:
            val = m.group(1).strip()
            if target:
                try:
                    val = target(val.replace(",", ""))
                except (ValueError, TypeError):
                    continue
            setattr(bundle.final, field, val)


def _bundle_from_partial(bundle: ReportBundle, state: dict | None) -> ReportBundle:
    """Build a best-effort bundle when the pipeline failed mid-run."""
    if state:
        _extract_analyst_reports(bundle, state)
        _extract_debates(bundle, state)
    return bundle
