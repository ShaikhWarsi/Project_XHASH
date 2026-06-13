"""Example: Simple webhook server for TradingView/ChartInk alerts"""
from fastapi import FastAPI, Request
import uvicorn
import logging

app = FastAPI(title="Webhook Receiver")
logger = logging.getLogger(__name__)


@app.post("/webhook")
async def receive_webhook(request: Request):
    body = await request.json()
    logger.info("Received webhook: %s", body)

    symbol = body.get("symbol")
    action = body.get("action")
    price = body.get("price")

    if not symbol or not action:
        return {"status": "error", "message": "Missing symbol or action"}

    # TODO: route to order execution
    print(f"Signal: {action} {symbol} @ {price}")

    return {"status": "success", "symbol": symbol, "action": action}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9000)
