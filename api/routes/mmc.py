from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import HTMLResponse
import yfinance as yf

from analyzers.mmc import MMCAnalyzer

router = APIRouter(prefix="/mmc", tags=["mmc"])


@router.get("/analyze")
async def analyze_mmc(
    symbol: str = Query("BTC-USD", description="Ticker symbol"),
    period: str = Query("1mo", description="Data period (1d, 5d, 1mo, 3mo, 6mo, 1y)"),
    interval: str = Query("15m", description="Bar interval (1m, 5m, 15m, 30m, 1h, 4h, 1d)"),
):
    """Run MMC analysis and return probabilities + layers."""
    analyzer = MMCAnalyzer(symbol=symbol, period=period, interval=interval)

    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval=interval)
        if df.empty:
            return {"error": f"No data returned for {symbol}"}
        result = analyzer.analyze(df)
        return result.to_dict()
    except Exception as e:
        return {"error": str(e)}


@router.get("/chart", response_class=HTMLResponse)
async def mmc_chart(
    symbol: str = Query("BTC-USD", description="Ticker symbol"),
    period: str = Query("1mo", description="Data period"),
    interval: str = Query("15m", description="Bar interval"),
):
    """Generate and return MMC chart as HTML page."""
    analyzer = MMCAnalyzer(symbol=symbol, period=period, interval=interval)

    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval=interval)
        if df.empty:
            return HTMLResponse(f"<h2>No data returned for {symbol}</h2>", status_code=404)
        analyzer.analyze(df)
        html = analyzer.generate_chart_html()
        return HTMLResponse(html)
    except Exception as e:
        return HTMLResponse(f"<h2>Error: {str(e)}</h2>", status_code=500)
