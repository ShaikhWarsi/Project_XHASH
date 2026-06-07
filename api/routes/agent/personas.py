from __future__ import annotations

import logging

from fastapi import APIRouter

from api.routes.agent import agent_v1

logger = logging.getLogger(__name__)

AGENT_REGISTRY = [
    {
        "id": "warren_buffett",
        "name": "Warren Buffett",
        "description": "Value investor focused on intrinsic value, competitive moats, and long-term holdings. Prefers simple, understandable businesses with consistent earnings.",
        "investing_style": "value",
        "color": "#3b82f6",
        "icon": "building",
    },
    {
        "id": "ray_dalio",
        "name": "Ray Dalio",
        "description": "Macro-focused investor using economic principles and cycles. Emphasizes diversification, risk parity, and understanding market correlations.",
        "investing_style": "macro",
        "color": "#ef4444",
        "icon": "globe",
    },
    {
        "id": "george_soros",
        "name": "George Soros",
        "description": "Reflexivity-based trader who exploits market feedback loops and crowd psychology. Takes bold contrarian positions.",
        "investing_style": "contrarian",
        "color": "#f59e0b",
        "icon": "repeat",
    },
    {
        "id": "jim_simons",
        "name": "Jim Simons",
        "description": "Quantitative/statistical arbitrageur. Relies on data mining, pattern recognition, and mathematical models. Ignores fundamentals entirely.",
        "investing_style": "quant",
        "color": "#8b5cf6",
        "icon": "sigma",
    },
    {
        "id": "cathie_wood",
        "name": "Cathie Wood",
        "description": "Innovation-focused growth investor. Bets on disruptive technologies with high growth potential. High conviction, long time horizon.",
        "investing_style": "growth",
        "color": "#ec4899",
        "icon": "rocket",
    },
    {
        "id": "ben_graham",
        "name": "Ben Graham",
        "description": "Father of value investing. Looks for margin of safety, net-nets, and low P/E ratios. Deeply conservative and risk-averse.",
        "investing_style": "deep_value",
        "color": "#10b981",
        "icon": "shield",
    },
    {
        "id": "paul_tudor_jones",
        "name": "Paul Tudor Jones",
        "description": "Macro trader focused on inflection points and asymmetrical risk/reward. Uses technical analysis and macro themes.",
        "investing_style": "macro_tactical",
        "color": "#06b6d4",
        "icon": "activity",
    },
    {
        "id": "peter_lynch",
        "name": "Peter Lynch",
        "description": "Growth-at-a-reasonable-price investor. Believes in buying what you know and looking for everyday opportunities. Prefers companies with simple stories.",
        "investing_style": "gap",
        "color": "#84cc16",
        "icon": "trending-up",
    },
]


@agent_v1.get("/personas")
async def list_personas():
    return {"personas": AGENT_REGISTRY}
