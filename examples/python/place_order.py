"""Example: Place an order via the OpenAlgo-compatible API"""
import httpx
import json

API_KEY = "your_api_key_here"
HOST = "http://127.0.0.1:8000"


def place_order(symbol, exchange, action, quantity, price_type, price=0):
    payload = {
        "apikey": API_KEY,
        "symbol": symbol,
        "exchange": exchange,
        "action": action,
        "quantity": quantity,
        "pricetype": price_type,
        "price": price,
    }
    resp = httpx.post(f"{HOST}/api/v1/placeorder", json=payload)
    return resp.json()


if __name__ == "__main__":
    result = place_order("BTC/USDT", "binance", "BUY", 1, "MARKET")
    print(json.dumps(result, indent=2))
