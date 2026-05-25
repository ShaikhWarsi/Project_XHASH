from __future__ import annotations

import json
import logging
import time
from typing import Any, Dict, List, Optional

from analytics.geopolitical import analyze_geopolitical_risk
from data.collector import get_market_data_collector

logger = logging.getLogger(__name__)


def _build_trend_outlook_summary(trend_outlook: Dict[str, Any]) -> str:
    if not trend_outlook:
        return ""

    def _lbl(trend: str) -> str:
        t = str(trend or "HOLD").upper()
        return {"BUY": "bullish", "SELL": "bearish", "HOLD": "neutral / range"}.get(t, "neutral / range")

    n24 = trend_outlook.get("next_24h") or {}
    d3 = trend_outlook.get("next_3d") or {}
    w1 = trend_outlook.get("next_1w") or {}
    m1 = trend_outlook.get("next_1m") or {}

    parts = [
        f"~24h: {_lbl(n24.get('trend'))} ({n24.get('strength', 'neutral')})",
        f"~3d: {_lbl(d3.get('trend'))} ({d3.get('strength', 'neutral')})",
        f"~1w: {_lbl(w1.get('trend'))} ({w1.get('strength', 'neutral')})",
        f"~1m: {_lbl(m1.get('trend'))} ({m1.get('strength', 'neutral')})",
    ]
    return " | ".join(parts)


class FastAnalysisService:
    def __init__(self):
        self.data_collector = get_market_data_collector()
        self._llm = None

    def _get_llm(self):
        if self._llm is None:
            try:
                from llm.client import LLMClient
                self._llm = LLMClient()
            except Exception as e:
                logger.warning("LLM client init failed: %s", e)
        return self._llm

    def _build_analysis_prompt(
        self, data: Dict[str, Any], geopolitical: Dict[str, Any]
    ) -> str:
        market = data.get("market", "")
        symbol = data.get("symbol", "")
        price = data.get("price") or {}
        indicators = data.get("indicators") or {}
        macro = data.get("macro") or {}
        news_items = data.get("news", [])
        geo = geopolitical or {}

        news_summary = ""
        for item in news_items[:5]:
            news_summary += f"- {item.get('title', '')}\n"

        return f"""Analyze {symbol} ({market}) for trading.

Current Price: {price.get('price', 'N/A')}
Change: {price.get('change_pct', 'N/A')}%

Technical Indicators:
- SMA20: {indicators.get('sma20', 'N/A')}
- SMA50: {indicators.get('sma50', 'N/A')}
- RSI14: {indicators.get('rsi14', 'N/A')}

Macro:
- VIX: {macro.get('vix', 'N/A')}
- DXY: {macro.get('dxy', 'N/A')}
- TNX: {macro.get('tnx', 'N/A')}

Geopolitical Risk: {geo.get('level', 'none')} ({geo.get('reason', 'N/A')})

Recent News:
{news_summary}

Return a JSON with:
1. "signal": "BUY"/"SELL"/"HOLD"
2. "confidence": 0-100
3. "reasoning": 2 sentence max
4. "trend_outlook": {{"next_24h": {{"trend": "BUY"/"SELL"/"HOLD", "strength": "strong"/"moderate"/"weak"}}, "next_3d": ..., "next_1w": ..., "next_1m": ...}}
5. "key_levels": {{"support": price, "resistance": price}}"""

    def analyze(
        self, market: str, symbol: str, timeframe: str = "1d"
    ) -> Dict[str, Any]:
        start = time.time()

        data = self.data_collector.collect_all(
            market=market, symbol=symbol, timeframe=timeframe
        )

        geo_risk = analyze_geopolitical_risk(data.get("news", []))

        llm = self._get_llm()
        llm_analysis = None
        if llm:
            try:
                prompt = self._build_analysis_prompt(data, geo_risk)
                response = llm.generate_structured(
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a professional market analyst. Return valid JSON only.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    response_model=None,
                )
                if isinstance(response, str):
                    llm_analysis = json.loads(response)
                else:
                    llm_analysis = response
            except Exception as e:
                logger.warning("LLM analysis failed: %s", e)

        result = {
            "market": market,
            "symbol": symbol,
            "timeframe": timeframe,
            "analyzed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "price": data.get("price"),
            "indicators": data.get("indicators"),
            "macro": data.get("macro"),
            "geopolitical_risk": geo_risk,
            "news_headlines": [n.get("title", "") for n in (data.get("news") or [])[:5]],
            "llm_analysis": llm_analysis,
            "trend_outlook_summary": _build_trend_outlook_summary(
                (llm_analysis or {}).get("trend_outlook", {})
            ),
            "duration_ms": int((time.time() - start) * 1000),
            "_meta": data.get("_meta", {}),
        }

        return result


_analysis_service: Optional[FastAnalysisService] = None


def get_fast_analysis_service() -> FastAnalysisService:
    global _analysis_service
    if _analysis_service is None:
        _analysis_service = FastAnalysisService()
    return _analysis_service
