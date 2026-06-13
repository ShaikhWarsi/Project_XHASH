"""
Expiry Date Extraction Example for X_KA_HASH
---------------------------------------------
Demonstrates extracting expiry dates via the OpenAlgo-compatible API.

Weekly: current_week, next_week, current_month, next_month
Monthly: current_month, next_month, far_month
"""

from datetime import datetime
import httpx

API_KEY = "your_api_key_here"
HOST = "http://127.0.0.1:8000"

symbol = "NIFTY"
exchange = "NFO"
instrumenttype = "options"
expirytype = "weekly"


def get_expiry_dates(symbol, exchange, instrumenttype, expirytype):
    resp = httpx.post(f"{HOST}/api/v1/expiry", json={
        "apikey": API_KEY, "symbol": symbol, "exchange": exchange,
        "instrumenttype": instrumenttype,
    })
    resp.raise_for_status()
    response = resp.json()
    if response.get("status") != "success":
        raise Exception(f"Failed to fetch expiries: {response.get('message')}")
    expiries = response.get("data", [])
    if not expiries:
        raise Exception(f"No expiries available for {symbol}")

    def parse_expiry(exp_str):
        formats = ["%d-%b-%y", "%d%b%y", "%d-%B-%y", "%d%B%y"]
        exp_upper = exp_str.upper().strip()
        for fmt in formats:
            try:
                return datetime.strptime(exp_upper, fmt)
            except ValueError:
                continue
        return datetime.max

    sorted_expiries = sorted(expiries, key=parse_expiry)
    now = datetime.now()
    current_month = now.month
    current_year = now.year
    next_month = (current_month % 12) + 1
    next_year = current_year + 1 if next_month == 1 else current_year
    far_month = (next_month % 12) + 1
    far_year = next_year + 1 if far_month == 1 else next_year

    if expirytype == "weekly":
        result = {"current_week": None, "next_week": None, "current_month": None, "next_month": None}
        if sorted_expiries:
            result["current_week"] = sorted_expiries[0]
        if len(sorted_expiries) > 1:
            result["next_week"] = sorted_expiries[1]
        for exp_str in sorted_expiries:
            exp_date = parse_expiry(exp_str)
            if exp_date.month == current_month and exp_date.year == current_year:
                result["current_month"] = exp_str
        for exp_str in sorted_expiries:
            exp_date = parse_expiry(exp_str)
            if exp_date.month == next_month and exp_date.year == next_year:
                result["next_month"] = exp_str
    else:
        result = {"current_month": None, "next_month": None, "far_month": None}
        for exp_str in sorted_expiries:
            exp_date = parse_expiry(exp_str)
            if exp_date.month == current_month and exp_date.year == current_year:
                result["current_month"] = exp_str
        for exp_str in sorted_expiries:
            exp_date = parse_expiry(exp_str)
            if exp_date.month == next_month and exp_date.year == next_year:
                result["next_month"] = exp_str
        for exp_str in sorted_expiries:
            exp_date = parse_expiry(exp_str)
            if exp_date.month == far_month and exp_date.year == far_year:
                result["far_month"] = exp_str

    return result


if __name__ == "__main__":
    expiries = get_expiry_dates(symbol, exchange, instrumenttype, expirytype)
    print(f"{symbol} Expiry Dates ({expirytype}):")
    if expirytype == "weekly":
        print(f"  Current Week : {expiries['current_week']}")
        print(f"  Next Week    : {expiries['next_week']}")
        print(f"  Current Month: {expiries['current_month']}")
        print(f"  Next Month   : {expiries['next_month']}")
    else:
        print(f"  Current Month: {expiries['current_month']}")
        print(f"  Next Month   : {expiries['next_month']}")
        print(f"  Far Month    : {expiries['far_month']}")
