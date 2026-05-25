from __future__ import annotations

import re
from typing import Dict, List, Optional, Tuple

_GEO_SEVERE_PATTERNS: List[re.Pattern] = [
    re.compile(r"\b(?:war|wars|warfare|wartime)\b", re.I),
    re.compile(r"\b(?:invasion|invaded|invading|invade)\b", re.I),
    re.compile(r"\b(?:airstrike|air\s*strikes?|missile\s+strike|drone\s+strike)\b", re.I),
    re.compile(r"\b(?:military\s+attack|armed\s+attack|troops?\s+(?:fire|attack|invade))\b", re.I),
    re.compile(r"\b(?:declare[sd]?\s+war|state\s+of\s+war|act\s+of\s+war)\b", re.I),
    re.compile(r"\b(?:martial\s+law|military\s+coup|coup\s+d['\u2019]?etat)\b", re.I),
    re.compile(r"\b(?:terror(?:ist)?\s+attack|mass\s+shooting\s+at)\b", re.I),
]

_GEO_MODERATE_PATTERNS: List[re.Pattern] = [
    re.compile(r"\bgeopolitical\b", re.I),
    re.compile(r"\b(?:armed|military)\s+conflict\b", re.I),
    re.compile(r"\b(?:international\s+)?sanctions?\s+(?:on|against|targeting|hit)\b", re.I),
    re.compile(r"\b(?:naval\s+blockade|border\s+clash|ceasefire\s+(?:broken|violated))\b", re.I),
    re.compile(r"\b(?:evacuat\w+\s+(?:the\s+)?embassy|embassy\s+evacuation)\b", re.I),
    re.compile(r"\b(?:nuclear\s+(?:threat|strike|weapon)|nuclear\s+war)\b", re.I),
]

_GEO_CONTEXT_MODERATE: List[re.Pattern] = [
    re.compile(r"\b(?:geopolitical|diplomatic|border)\s+(?:crisis|tension|standoff)\b", re.I),
    re.compile(r"\b(?:tensions?\s+(?:rise|escalat|flare|mount)\s+(?:with|between))\b", re.I),
    re.compile(r"\b(?:middle\s+east|south\s+china\s+sea|taiwan\s+strait)\s+(?:crisis|tension|conflict)\b", re.I),
]

_GEO_REGION_CONFLICT: List[re.Pattern] = [
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

_GEO_MAJOR_NEWS_SEVERE = [
    re.compile(r"\b(?:war|wars|warfare)\b", re.I),
    re.compile(r"\b(?:invasion|invaded|military\s+attack|airstrike)\b", re.I),
    re.compile(r"\b(?:armed\s+conflict|military\s+conflict)\b", re.I),
]


def geopolitical_match_level(combined_text: str) -> Tuple[str, Optional[str]]:
    if not combined_text or len(combined_text.strip()) < 4:
        return "none", None
    low = combined_text.lower()
    for pat in _GEO_SEVERE_PATTERNS:
        if pat.search(low):
            return "severe", pat.pattern[:48]
    for pat in _GEO_REGION_CONFLICT:
        if pat.search(low):
            return "severe", "region+conflict"
    for pat in _GEO_MODERATE_PATTERNS:
        if pat.search(low):
            return "moderate", pat.pattern[:48]
    for pat in _GEO_CONTEXT_MODERATE:
        if pat.search(low):
            return "moderate", pat.pattern[:48]
    return "none", None


def geopolitical_sentiment_penalty(level: str) -> int:
    if level == "severe":
        return -42
    if level == "moderate":
        return -18
    return 0


def is_major_geopolitical_news(combined_text: str) -> bool:
    if not combined_text:
        return False
    low = combined_text.lower()
    for pat in _GEO_MAJOR_NEWS_SEVERE:
        if pat.search(low):
            return True
    if any(p.search(low) for p in _GEO_REGION_CONFLICT):
        return True
    return False


def analyze_geopolitical_risk(news_items: List[Dict[str, str]]) -> Dict[str, any]:
    if not news_items:
        return {"level": "none", "reason": None, "affected_news_count": 0, "severity_score": 0}

    max_level = "none"
    max_reason = None
    affected = 0

    for item in news_items:
        text = f"{item.get('title', '')} {item.get('summary', '')}"
        level, reason = geopolitical_match_level(text)
        if level == "severe":
            max_level = "severe"
            max_reason = reason
            affected += 1
        elif level == "moderate" and max_level == "none":
            max_level = "moderate"
            max_reason = reason
            affected += 1

    return {
        "level": max_level,
        "reason": max_reason,
        "affected_news_count": affected,
        "severity_score": geopolitical_sentiment_penalty(max_level),
    }
