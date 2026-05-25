from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

REGIMES = {
    "bull_trend": {
        "label": "Bull Trend",
        "strategy_families": ["trend_following", "breakout", "pullback_continuation"],
    },
    "bear_trend": {
        "label": "Bear Trend",
        "strategy_families": ["trend_following", "breakdown", "short_pullback"],
    },
    "high_volatility": {
        "label": "High Volatility",
        "strategy_families": ["volatility_breakout", "reduced_risk_trend"],
    },
    "range_compression": {
        "label": "Range Compression",
        "strategy_families": ["mean_reversion", "bollinger_reversion"],
    },
    "transition": {
        "label": "Transition",
        "strategy_families": ["hybrid", "wait_and_see"],
    },
}


class MarketRegimeService:
    @staticmethod
    def detect(symbol: str, timeframe: str = "1d", period_days: int = 90) -> dict[str, Any]:
        df = yf.download(symbol, period=f"{period_days}d", interval=timeframe, progress=False)
        if df.empty or len(df) < 30:
            return {"regime": "transition", "confidence": 0.0, "features": {}, "strategy_families": REGIMES["transition"]["strategy_families"]}

        close = df["Close"].squeeze()
        high = df["High"].squeeze()
        low = df["Low"].squeeze()

        ema_fast = close.ewm(span=10).mean()
        ema_slow = close.ewm(span=30).mean()
        ema_gap_pct = float(((ema_fast - ema_slow) / ema_slow).abs().iloc[-1] * 100)

        returns = close.pct_change().dropna()
        realized_vol_pct = float(returns.std() * np.sqrt(252) * 100)

        atr = (high - low).rolling(14).mean().iloc[-1]
        atr_pct = float(atr / close.iloc[-1] * 100)

        price_change_pct = float((close.iloc[-1] - close.iloc[-20]) / close.iloc[-20] * 100) if len(close) >= 20 else 0

        direction = (close.diff() > 0).astype(int)
        efficiency = float(direction.rolling(20).mean().iloc[-1]) if len(close) >= 20 else 0.5

        features = {
            "priceChangePct": round(price_change_pct, 2),
            "emaGapPct": round(ema_gap_pct, 2),
            "realizedVolPct": round(realized_vol_pct, 2),
            "atrPct": round(atr_pct, 2),
            "directionalEfficiency": round(efficiency, 3),
        }

        if ema_gap_pct >= 1.0 and efficiency >= 0.55 and price_change_pct > 1.0:
            regime = "bull_trend"
            confidence = min(0.99, 0.5 + efficiency * 0.4 + price_change_pct / 50)
        elif ema_gap_pct >= 1.0 and efficiency >= 0.55 and price_change_pct < -1.0:
            regime = "bear_trend"
            confidence = min(0.99, 0.5 + (1 - efficiency) * 0.4 + abs(price_change_pct) / 50)
        elif realized_vol_pct >= 30 or atr_pct >= 3.5:
            regime = "high_volatility"
            confidence = min(0.95, 0.3 + realized_vol_pct / 100 + atr_pct / 10)
        elif ema_gap_pct <= 0.45 and efficiency <= 0.38 and atr_pct <= 2.0:
            regime = "range_compression"
            confidence = min(0.9, 0.4 + (1 - efficiency) * 0.3 + (1 - ema_gap_pct / 0.45) * 0.2)
        else:
            regime = "transition"
            confidence = 0.3

        return {
            "regime": regime,
            "label": REGIMES[regime]["label"],
            "confidence": round(confidence, 2),
            "features": features,
            "strategy_families": REGIMES[regime]["strategy_families"],
        }
