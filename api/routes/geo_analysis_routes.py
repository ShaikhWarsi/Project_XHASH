from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta
from typing import Any

import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/geo", tags=["geopolitical"])

_GEO_SEVERE_PATTERNS = [
    re.compile(r"\b(?:war|wars|warfare|wartime)\b", re.I),
    re.compile(r"\b(?:invasion|invaded|invading|invade)\b", re.I),
    re.compile(r"\b(?:airstrike|air\s*strikes?|missile\s+strike|drone\s+strike)\b", re.I),
    re.compile(r"\b(?:military\s+attack|armed\s+attack|troops?\s+(?:fire|attack|invade))\b", re.I),
    re.compile(r"\b(?:declare[sd]?\s+war|state\s+of\s+war|act\s+of\s+war)\b", re.I),
    re.compile(r"\b(?:martial\s+law|military\s+coup|coup\s+d['\u2019]?etat)\b", re.I),
    re.compile(r"\b(?:terror(?:ist)?\s+attack|mass\s+shooting\s+at)\b", re.I),
]
_GEO_MODERATE_PATTERNS = [
    re.compile(r"\bgeopolitical\b", re.I),
    re.compile(r"\b(?:armed|military)\s+conflict\b", re.I),
    re.compile(r"\b(?:international\s+)?sanctions?\s+(?:on|against|targeting|hit)\b", re.I),
    re.compile(r"\b(?:naval\s+blockade|border\s+clash|ceasefire\s+(?:broken|violated))\b", re.I),
    re.compile(r"\b(?:evacuat\w+\s+(?:the\s+)?embassy|embassy\s+evacuation)\b", re.I),
    re.compile(r"\b(?:nuclear\s+(?:threat|strike|weapon)|nuclear\s+war)\b", re.I),
]
_GEO_CONTEXT_MODERATE = [
    re.compile(r"\b(?:geopolitical|diplomatic|border)\s+(?:crisis|tension|standoff)\b", re.I),
    re.compile(r"\b(?:tensions?\s+(?:rise|escalat|flare|mount)\s+(?:with|between))\b", re.I),
    re.compile(r"\b(?:middle\s+east|south\s+china\s+sea|taiwan\s+strait)\s+(?:crisis|tension|conflict)\b", re.I),
]
_GEO_REGION_CONFLICT = [
    re.compile(
        r"\b(?:russia|ukraine|iran|israel|gaza|hamas|taiwan|north\s+korea|dprk|"
        r"syria|yemen|lebanon|nato)\b.{0,40}\b(?:invade|attack|strike|war|conflict|sanction)\b",
        re.I,
    ),
    re.compile(
        r"\b(?:invade|attack|strike|war|conflict|sanction)\b.{0,40}\b(?:russia|ukraine|iran|israel|"
        r"gaza|hamas|taiwan|north\s+korea|dprk|syria|nato)\b",
        re.I,
    ),
]
_GEO_ZH_SEVERE = ("宣战", "战争爆发", "全面战争", "武装冲突", "军事打击", "军事入侵", "空袭", "导弹袭击", "开战", "交火", "战火")
_GEO_ZH_MODERATE = ("地缘政治危机", "国际制裁升级", "断交", "撤侨", "军事对峙", "地区冲突升级")


def _geopolitical_match_level(text: str) -> tuple[str, str | None]:
    for pat in _GEO_SEVERE_PATTERNS:
        if m := pat.search(text):
            return "severe", m.group()
    for kw in _GEO_ZH_SEVERE:
        if kw in text:
            return "severe", kw
    for pat in _GEO_REGION_CONFLICT:
        if m := pat.search(text):
            return "severe", m.group()
    for pat in _GEO_MODERATE_PATTERNS:
        if m := pat.search(text):
            return "moderate", m.group()
    for pat in _GEO_CONTEXT_MODERATE:
        if m := pat.search(text):
            return "moderate", m.group()
    for kw in _GEO_ZH_MODERATE:
        if kw in text:
            return "moderate", kw
    return "none", None


class GeoAnalysisRequest(BaseModel):
    symbol: str
    lookback_days: int = 7
    region: str = "global"


@router.post("/analyze")
async def geo_analysis(req: GeoAnalysisRequest):
    today = datetime.now()
    start = today - timedelta(days=req.lookback_days)

    try:
        news = yf.Search(req.symbol, news_count=20).news or []
    except Exception as e:
        logger.warning("Failed to fetch news for %s: %s", req.symbol, e)
        news = []

    detections: list[dict[str, Any]] = []
    total_penalty = 0
    for item in news:
        title = item.get("title", "")
        summary = item.get("summary", "")
        combined = f"{title} {summary}"
        level, match = _geopolitical_match_level(combined)
        if level != "none":
            penalty = -42 if level == "severe" else -18
            total_penalty += penalty
            detections.append({
                "title": title[:200],
                "level": level,
                "matched": str(match)[:100],
                "penalty": penalty,
                "source": item.get("link", ""),
                "date": str(item.get("providerPublishTime", "")),
            })

    total_penalty = max(total_penalty, -55)

    ticker = yf.Ticker(req.symbol)
    df = ticker.history(period="1mo")
    if not df.empty:
        close = df["Close"]
        change_1d = float(close.pct_change().iloc[-1] * 100 if len(close) > 1 else 0)
        change_5d = float(close.pct_change(5).iloc[-1] * 100 if len(close) > 5 else 0)
        rsi = _calc_rsi(close)
        vol = float(close.std() / close.mean() * 100) if close.mean() > 0 else 0
    else:
        change_1d = change_5d = rsi = vol = 0

    base_score = 60.0
    if rsi is not None:
        if rsi > 70:
            base_score -= 15
        elif rsi < 30:
            base_score += 10
    sentiment_score = max(-100, min(100, base_score + total_penalty))

    def _trend(s: float) -> str:
        if s >= 20: return "BUY"
        if s <= -20: return "SELL"
        return "HOLD"

    def _strength(s: float) -> str:
        a = abs(s)
        if a >= 70: return "strong"
        if a >= 40: return "moderate"
        if a >= 20: return "mild"
        return "neutral"

    trend_outlook = {
        "next_24h": {"score": round(sentiment_score, 1), "trend": _trend(sentiment_score), "strength": _strength(sentiment_score)},
        "next_3d": {"score": round(sentiment_score + change_5d * 0.5, 1), "trend": _trend(sentiment_score + change_5d * 0.5), "strength": _strength(sentiment_score + change_5d * 0.5)},
        "next_1w": {"score": round(change_5d * 1.5, 1), "trend": _trend(change_5d * 1.5), "strength": _strength(change_5d * 1.5)},
    }

    return {
        "symbol": req.symbol,
        "analyzed_at": str(today),
        "region": req.region,
        "geo_detections": detections,
        "geo_count": len(detections),
        "geo_penalty": total_penalty,
        "sentiment_score": round(sentiment_score, 1),
        "indicators": {"rsi_14": rsi, "change_1d_pct": round(change_1d, 2), "change_5d_pct": round(change_5d, 2), "volatility_pct": round(vol, 2)},
        "trend_outlook": trend_outlook,
        "alerts": _build_alerts(detections, sentiment_score),
    }


def _calc_rsi(series: pd.Series, period: int = 14) -> float | None:
    if len(series) < period + 1:
        return None
    delta = series.diff()
    gain = delta.where(delta > 0, 0).rolling(period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(period).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return float(rsi.iloc[-1]) if not np.isnan(rsi.iloc[-1]) else None


def _build_alerts(detections: list[dict], score: float) -> list[str]:
    alerts = []
    severe = [d for d in detections if d["level"] == "severe"]
    if severe:
        alerts.append(f"⚠️ SEVERE: {severe[0]['matched']} detected — geopolitical risk elevated")
    if score < -30:
        alerts.append("🔴 Bearish sentiment: geopolitical penalty dragging score negative")
    elif score > 30:
        alerts.append("🟢 Bullish: no significant geopolitical risk detected")
    if len(detections) > 5:
        alerts.append(f"📊 High event density: {len(detections)} geopolitical events in lookback window")
    return alerts
