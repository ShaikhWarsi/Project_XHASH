"""Example: Get Last Traded Price using the OpenAlgo-compatible API"""
import httpx
import json

API_KEY = "your_api_key_here"
HOST = "http://127.0.0.1:8000"


def get_quote(symbol, exchange):
    resp = httpx.post(f"{HOST}/api/v1/quote", json={
        "apikey": API_KEY, "symbol": symbol, "exchange": exchange
    })
    return resp.json()


if __name__ == "__main__":
    data = get_quote("BTC/USDT", "binance")
    print(json.dumps(data, indent=2))
