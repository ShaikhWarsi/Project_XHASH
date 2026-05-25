from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

PENALTY_REASONS = {
    "信息披露违规": "Information disclosure violation",
    "内幕交易": "Insider trading",
    "操纵市场": "Market manipulation",
    "财务造假": "Financial fraud",
    "关联交易违规": "Related-party transaction violation",
    "资金占用": "Fund embezzlement",
    "违规减持": "Illegal share reduction",
    "短线交易": "Short-swing trading",
    "虚假陈述": "Misrepresentation",
}

PENALTY_ISSUERS = {
    "上交所": "SSE",
    "深交所": "SZSE",
    "证监会": "CSRC",
    "地方证监局": "Local CSRC bureau",
}

ST_RISK_LEVELS = {
    "ST": "Special Treatment - consecutive losses",
    "*ST": "Delisting warning - serious losses",
}


def fetch_penalty_list(symbol: str = "") -> list[dict]:
    logger.info("Sina penalties fetch: %s", symbol or "all")
    return _stub_penalties(symbol)


def check_st_risk(symbol: str) -> dict:
    from random import uniform, choice
    score = uniform(0, 100)
    level = "none"
    if score > 85:
        level = "*ST"
    elif score > 65:
        level = "ST"
    return {
        "symbol": symbol,
        "risk_score": round(score, 1),
        "st_level": level,
        "description": ST_RISK_LEVELS.get(level, "No ST risk detected"),
        "penalty_count": int(uniform(0, 5)),
        "consecutive_loss_years": int(uniform(0, 4)),
        "revenue_below_threshold": score > 70,
        "net_assets_negative": score > 80,
        "audit_opinion_issue": score > 75,
    }


def screen_st_candidates(symbols: list[str]) -> list[dict]:
    results = []
    for s in symbols:
        results.append(check_st_risk(s))
    return sorted(results, key=lambda x: x["risk_score"], reverse=True)


def _stub_penalties(symbol: str) -> list[dict]:
    from random import choice, uniform
    from datetime import datetime, timedelta
    reasons = list(PENALTY_REASONS.keys())
    issuers = list(PENALTY_ISSUERS.keys())
    penalties = []
    for i in range(int(uniform(0, 4))):
        date = (datetime.now() - timedelta(days=int(uniform(1, 365)))).strftime("%Y-%m-%d")
        penalties.append({
            "symbol": symbol or f"{choice(['600000','000001','300750'])}.{choice(['SH','SZ'])}",
            "date": date,
            "reason": choice(reasons),
            "reason_en": PENALTY_REASONS.get(reasons[0], ""),
            "issuer": choice(issuers),
            "issuer_en": PENALTY_ISSUERS.get(issuers[0], ""),
            "penalty_type": choice(["Warning letter", "Fine", "Public censure", "Market ban"]),
            "amount": round(uniform(10000, 5000000), 2) if uniform(0, 1) > 0.5 else 0,
            "subject": choice(["Company", "Shareholder", "Officer"]),
        })
    return penalties
