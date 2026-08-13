from __future__ import annotations

import random
from typing import Any


def generate_heatmap_data(category: str | None = None) -> dict[str, Any]:
    categories = {
        "crypto": ["BTC", "ETH", "SOL", "XRP", "ADA", "DOT", "AVAX", "LINK", "MATIC", "ATOM"],
        "sectors": ["SPY", "QQQ", "IWM", "XLF", "XLE", "XLV", "XLK", "XLI", "XLP", "XLU"],
        "forex": ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD"],
        "commodities": ["GC=F", "SI=F", "CL=F", "NG=F", "HG=F", "ZC=F", "ZW=F", "ZS=F"],
        "indices": ["^GSPC", "^DJI", "^IXIC", "^RUT", "^VIX", "DX-Y.NYB"],
    }
    if category and category in categories:
        symbols = {s: round(random.uniform(-5, 5), 2) for s in categories[category]}
        return {category: symbols}
    result = {}
    for cat, syms in categories.items():
        result[cat] = {s: round(random.uniform(-5, 5), 2) for s in syms}
    return result
