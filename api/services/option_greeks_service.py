from __future__ import annotations

import logging
import math
import re
from datetime import datetime, date
from typing import Any

logger = logging.getLogger(__name__)

OPENGREEKS_AVAILABLE = False
try:
    import opengreeks as og
    OPENGREEKS_AVAILABLE = True
except ImportError:
    pass

OPTION_SYMBOL_PATTERNS = {
    "NSE": re.compile(
        r"^(?P<symbol>[A-Z]+)\s*(?P<expiry>\d{2}(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d{2,4})"
        r"(?P<strike>\d+(?:\.\d+)?)\s*(?P<type>CE|PE)$",
        re.IGNORECASE,
    ),
    "BSE": re.compile(
        r"^(?P<symbol>[A-Z]+)\s*(?P<expiry>\d{2}(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d{2,4})"
        r"(?P<strike>\d+(?:\.\d+)?)\s*(?P<type>CE|PE)$",
        re.IGNORECASE,
    ),
    "NFO": re.compile(
        r"^(?P<symbol>[A-Z]+)\s*(?P<expiry>\d{2}(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d{2,4})"
        r"(?P<strike>\d+(?:\.\d+)?)\s*(?P<type>CE|PE)$",
        re.IGNORECASE,
    ),
    "BFO": re.compile(
        r"^(?P<symbol>[A-Z]+)\s*(?P<expiry>\d{2}(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d{2,4})"
        r"(?P<strike>\d+(?:\.\d+)?)\s*(?P<type>CE|PE)$",
        re.IGNORECASE,
    ),
    "MCX": re.compile(
        r"^(?P<symbol>[A-Z]+)\s*(?P<expiry>\d{2}(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d{2,4})"
        r"(?P<strike>\d+(?:\.\d+)?)\s*(?P<type>CE|PE)$",
        re.IGNORECASE,
    ),
}

MONTH_MAP = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4,
    "MAY": 5, "JUN": 6, "JUL": 7, "AUG": 8,
    "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}


def _get_current_year_short() -> int:
    return datetime.now().year % 100


def _get_current_year_full() -> int:
    return datetime.now().year


def parse_option_symbol(symbol: str, exchange: str = "NFO") -> dict[str, Any] | None:
    pattern = OPTION_SYMBOL_PATTERNS.get(exchange) or OPTION_SYMBOL_PATTERNS["NFO"]
    m = pattern.match(symbol.strip())
    if not m:
        return None

    base_symbol = m.group("symbol").upper()
    raw_expiry = m.group("expiry").upper()
    strike = float(m.group("strike"))
    opt_type = m.group("type").upper()

    day = int(raw_expiry[:2])
    month_str = raw_expiry[2:5]
    year_part = raw_expiry[5:]
    month = MONTH_MAP.get(month_str)

    if month is None:
        return None

    if len(year_part) == 2:
        year = 2000 + int(year_part)
    else:
        year = int(year_part)

    expiry_str = f"{year:04d}-{month:02d}-{day:02d}"

    return {
        "base_symbol": base_symbol,
        "expiry": expiry_str,
        "strike": strike,
        "option_type": opt_type,
        "exchange": exchange,
    }


def calculate_time_to_expiry(expiry: str) -> dict[str, float]:
    try:
        expiry_date = datetime.strptime(expiry, "%Y-%m-%d").date()
    except ValueError:
        try:
            expiry_date = datetime.strptime(expiry, "%d-%m-%Y").date()
        except ValueError:
            expiry_date = datetime.strptime(expiry, "%d%b%Y").date()

    today = datetime.now().date()
    days = (expiry_date - today).days
    days = max(days, 0)
    years = days / 365.0

    return {"years": years, "days": float(days)}


def _norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def _norm_pdf(x: float) -> float:
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)


def _black76_greeks(
    F: float, K: float, T: float, r: float, sigma: float, option_type: str
) -> dict[str, float]:
    if T <= 0:
        intrinsic = max(F - K, 0) if option_type == "CE" else max(K - F, 0)
        return {
            "delta": 1.0 if (option_type == "CE" and F > K) else (0.0 if option_type == "CE" else -1.0 if (option_type == "PE" and F < K) else 0.0),
            "gamma": 0.0,
            "theta": 0.0,
            "vega": 0.0,
            "rho": 0.0,
            "iv": sigma,
            "option_price": intrinsic,
        }

    d1 = (math.log(F / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)

    if option_type == "CE":
        delta = _norm_cdf(d1)
        theta = (-(F * _norm_pdf(d1) * sigma) / (2 * math.sqrt(T)) - r * K * math.exp(-r * T) * _norm_cdf(d2)) / 365.0
        price = F * _norm_cdf(d1) - K * math.exp(-r * T) * _norm_cdf(d2)
    else:
        delta = _norm_cdf(d1) - 1.0
        theta = (-(F * _norm_pdf(d1) * sigma) / (2 * math.sqrt(T)) + r * K * math.exp(-r * T) * _norm_cdf(-d2)) / 365.0
        price = K * math.exp(-r * T) * _norm_cdf(-d2) - F * _norm_cdf(-d1)

    gamma = _norm_pdf(d1) / (F * sigma * math.sqrt(T))
    vega = F * _norm_pdf(d1) * math.sqrt(T) / 100.0
    rho = K * T * math.exp(-r * T) * (_norm_cdf(d2) if option_type == "CE" else -_norm_cdf(-d2)) / 100.0

    return {
        "delta": round(delta, 4),
        "gamma": round(gamma, 4),
        "theta": round(theta, 4),
        "vega": round(vega, 4),
        "rho": round(rho, 4),
        "iv": round(sigma, 4),
        "option_price": round(price, 2),
    }


def _estimate_iv(F: float, K: float, T: float, r: float, market_price: float, option_type: str) -> float:
    sigma = 0.3
    for _ in range(100):
        greeks = _black76_greeks(F, K, T, r, sigma, option_type)
        diff = greeks["option_price"] - market_price
        if abs(diff) < 1e-6:
            break
        vega = greeks.get("vega", 0.0) * 100
        if vega < 1e-10:
            break
        sigma -= diff / vega
        sigma = max(sigma, 0.01)
    return sigma


def calculate_greeks(
    option_symbol: str,
    exchange: str = "NFO",
    spot_price: float | None = None,
    option_price: float | None = None,
    interest_rate: float = 0.0,
) -> tuple[bool, dict[str, Any], int]:
    try:
        parsed = parse_option_symbol(option_symbol, exchange)
        if not parsed:
            return False, {"status": "error", "message": f"Could not parse option symbol: {option_symbol}"}, 400

        te = calculate_time_to_expiry(parsed["expiry"])
        T = te["years"]

        if spot_price is None:
            return False, {"status": "error", "message": "spot_price is required"}, 400

        F = spot_price
        K = parsed["strike"]
        r = interest_rate / 100.0 if interest_rate > 1 else interest_rate
        opt_type = parsed["option_type"]

        sigma = 0.3
        if option_price is not None and option_price > 0 and T > 0:
            sigma = _estimate_iv(F, K, T, r, option_price, opt_type)

        if OPENGREEKS_AVAILABLE:
            try:
                g = og.BlackScholesGreeks(
                    option_type="call" if opt_type == "CE" else "put",
                    underlying_price=F,
                    strike_price=K,
                    time_to_expiry=T,
                    risk_free_rate=r,
                    volatility=sigma,
                )
                result = {
                    "delta": round(g.delta, 4),
                    "gamma": round(g.gamma, 4),
                    "theta": round(g.theta, 4),
                    "vega": round(g.vega, 4),
                    "rho": round(g.rho, 4),
                    "iv": round(sigma, 4),
                    "option_price": round(g.option_price, 2) if hasattr(g, "option_price") else 0,
                }
            except Exception:
                result = _black76_greeks(F, K, T, r, sigma, opt_type)
        else:
            result = _black76_greeks(F, K, T, r, sigma, opt_type)

        return True, {
            "status": "success",
            "data": {
                "symbol": option_symbol,
                "exchange": exchange,
                "base_symbol": parsed["base_symbol"],
                "expiry": parsed["expiry"],
                "strike": parsed["strike"],
                "option_type": parsed["option_type"],
                "spot_price": spot_price,
                "option_price": option_price,
                "time_to_expiry": te,
                "greeks": result,
            },
        }, 200
    except Exception as e:
        logger.exception("Error calculating greeks: %s", e)
        return False, {"status": "error", "message": str(e)}, 500


def get_multi_option_greeks(
    symbols: list[dict[str, Any]],
    interest_rate: float | None = None,
) -> tuple[bool, dict[str, Any], int]:
    try:
        if not symbols:
            return False, {"status": "error", "message": "symbols list is required"}, 400

        results = []
        errors = []
        rate = interest_rate if interest_rate is not None else 7.0

        for item in symbols:
            opt_symbol = item.get("symbol", "")
            exchange = item.get("exchange", "NFO")
            spot = item.get("spot_price")
            opt_price = item.get("option_price")
            ir = item.get("interest_rate", rate)

            if not opt_symbol:
                errors.append({"symbol": opt_symbol, "error": "symbol is required"})
                continue

            success, resp, code = calculate_greeks(opt_symbol, exchange, spot, opt_price, ir)
            if success:
                results.append(resp["data"])
            else:
                errors.append({"symbol": opt_symbol, "error": resp.get("message", "Unknown error")})

        return True, {
            "status": "success",
            "results": results,
            "errors": errors if errors else None,
            "total": len(results),
            "failed": len(errors),
        }, 200
    except Exception as e:
        logger.exception("Error fetching multi option greeks: %s", e)
        return False, {"status": "error", "message": str(e)}, 500
