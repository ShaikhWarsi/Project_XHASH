from __future__ import annotations

import logging
from typing import Any, Callable, Dict, List, Optional

from api.models.schemas import AgentModelConfig, GraphNode

logger = logging.getLogger(__name__)


AGENT_REGISTRY: Dict[str, Dict[str, Any]] = {
    "ben_graham": {
        "name": "Ben Graham",
        "description": "The Father of Value Investing. Emphasizes a margin of safety and invests in undervalued companies with strong fundamentals through systematic value analysis.",
        "investing_style": "Deep value investing using Graham Number and net-net approach",
    },
    "charlie_munger": {
        "name": "Charlie Munger",
        "description": "The Rational Thinker. Advocates for value investing with a focus on quality businesses and long-term growth through rational decision-making.",
        "investing_style": "Mental models, moat analysis, and business predictability",
    },
    "warren_buffett": {
        "name": "Warren Buffett",
        "description": "The Oracle of Omaha. Seeks wonderful companies at fair prices with durable competitive advantages and excellent management.",
        "investing_style": "Moat analysis, financial health, and long-term value",
    },
    "michael_burry": {
        "name": "Michael Burry",
        "description": "The Big Short Contrarian. Makes contrarian bets, often shorting overvalued markets and investing in undervalued assets through deep fundamental analysis.",
        "investing_style": "Deep value with contrarian and short thesis analysis",
    },
    "bill_ackman": {
        "name": "Bill Ackman",
        "description": "The Activist Investor. Seeks to influence management and unlock value through strategic activism and concentrated investment positions.",
        "investing_style": "Activist investing with concentrated bets",
    },
    "stanley_druckenmiller": {
        "name": "Stanley Druckenmiller",
        "description": "The Macro Investor. Follows macro trends and makes large asymmetric bets at inflection points.",
        "investing_style": "Macro trading with momentum inflection points",
    },
    "rakesh_jhunjhunwala": {
        "name": "Rakesh Jhunjhunwala",
        "description": "The Big Bull of India. Combines macro insights with high-growth emerging market opportunities.",
        "investing_style": "Emerging market value investing",
    },
    "mohnish_pabrai": {
        "name": "Mohnish Pabrai",
        "description": "The Dhandho Investor. Clones successful strategies with asymmetric risk/reward profiles and deep margin of safety.",
        "investing_style": "Clone investing with asymmetric risk/reward",
    },
    "nassim_taleb": {
        "name": "Nassim Taleb",
        "description": "The Black Swan. Focuses on tail risk hedging, antifragility, and the barbell strategy to protect against catastrophic losses.",
        "investing_style": "Tail risk hedging and barbell strategy",
    },
    "peter_lynch": {
        "name": "Peter Lynch",
        "description": "The 10-Bagger Investor. Invests in growth at a reasonable price (GARP), leveraging PEG ratio and 'buy what you know' approach.",
        "investing_style": "GARP investing with PEG ratio and story-based analysis",
    },
    "phil_fisher": {
        "name": "Phil Fisher",
        "description": "The Scuttlebutt Investor. Uses qualitative research, management quality assessment, and growth durability analysis.",
        "investing_style": "Scuttlebutt methodology and growth quality",
    },
    "cathie_wood": {
        "name": "Cathie Wood",
        "description": "The Queen of Growth Investing. Focuses on disruptive innovation, AI, genomics, and technological transformation.",
        "investing_style": "Disruptive innovation at ARK-style conviction",
    },
    "aswath_damodaran": {
        "name": "Aswath Damodaran",
        "description": "The Dean of Valuation. Focuses on intrinsic value and financial metrics through rigorous DCF and valuation analysis.",
        "investing_style": "DCF-driven intrinsic valuation",
    },
    "technicals": {
        "name": "Technical Analyst",
        "description": "Chart patterns, technical indicators, and quantitative analysis of price action for trading signals.",
        "investing_style": "Chart patterns and technical indicators",
    },
    "sentiment": {
        "name": "Sentiment Analyst",
        "description": "Market and news sentiment analysis combining insider trading patterns with NLP-driven news signals.",
        "investing_style": "Market and news sentiment analysis",
    },
    "fundamentals": {
        "name": "Fundamentals Analyst",
        "description": "Financial statement and ratio analysis including profitability, growth, liquidity, and valuation metrics.",
        "investing_style": "Financial metrics and ratio analysis",
    },
    "valuation": {
        "name": "Valuation Analyst",
        "description": "Multi-method valuation including DCF, owner earnings, EV/EBITDA, and residual income approaches.",
        "investing_style": "DCF and comparable company valuation",
    },
    "news_sentiment": {
        "name": "News Sentiment",
        "description": "NLP-powered news sentiment analysis for real-time market-moving event detection.",
        "investing_style": "News-driven NLP sentiment analysis",
    },
    "growth_agent": {
        "name": "Growth Agent",
        "description": "Growth stock analysis focusing on revenue acceleration, R&D intensity, and total addressable market.",
        "investing_style": "Growth stock analysis and momentum",
    },
    "risk_manager": {
        "name": "Risk Manager",
        "description": "Portfolio risk assessment, volatility-adjusted position sizing, and drawdown controls.",
        "investing_style": "Portfolio risk assessment and sizing",
    },
    "portfolio_manager": {
        "name": "Portfolio Manager",
        "description": "Final decision maker aggregating analyst signals into weighted portfolio allocations.",
        "investing_style": "Final decision maker and allocation",
    },
}


def get_agent_display_name(agent_key: str) -> str:
    agent = AGENT_REGISTRY.get(agent_key)
    return agent["name"] if agent else agent_key.replace("_", " ").title()


def get_agent_description(agent_key: str) -> str:
    agent = AGENT_REGISTRY.get(agent_key)
    return agent["description"] if agent else ""


def get_agent_investing_style(agent_key: str) -> str:
    agent = AGENT_REGISTRY.get(agent_key)
    return agent.get("investing_style", agent["description"]) if agent else ""


def resolve_agent_model(
    agent_id: str,
    agent_model_configs: Optional[List[AgentModelConfig]] = None,
    default_model: str = "gpt-4o",
    default_provider: str = "openai",
) -> tuple[str, str]:
    if agent_model_configs:
        for cfg in agent_model_configs:
            if cfg.agent_id == agent_id:
                return cfg.model_name or default_model, (cfg.model_provider.value if cfg.model_provider else default_provider)
    return default_model, default_provider
