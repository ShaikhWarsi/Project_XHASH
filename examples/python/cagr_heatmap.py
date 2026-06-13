"""
NIFTY 50 Rolling CAGR Heatmap (1Y, 3Y, 5Y)
-------------------------------------------
Fetches daily historical data for NIFTY 50 symbols via X_KA_HASH API,
computes rolling CAGRs, and generates three Plotly heatmaps as PNG.

Based on OpenAlgo CAGR heatmap example by Rajandran R.
"""

from datetime import datetime, timedelta
import numpy as np
import pandas as pd
import plotly.express as px
import httpx

API_KEY = "your_api_key_here"
HOST = "http://127.0.0.1:8000"

symbols = [
    "INDIGO","TRENT","HINDUNILVR","HCLTECH","WIPRO","INFY","TATACONSUM",
    "TATASTEEL","ITC","ASIANPAINT","SBILIFE","LT","SHRIRAMFIN","BEL",
    "SBIN","COALINDIA","KOTAKBANK","TCS","SUNPHARMA","MAXHEALTH",
    "NESTLEIND","RELIANCE","ETERNAL","APOLLOHOSP","ICICIBANK","GRASIM",
    "ULTRACEMCO","ADANIENT","AXISBANK","DRREDDY","TECHM","TMPV","JIOFIN",
    "NTPC","BAJFINANCE","BHARTIARTL","POWERGRID","HINDALCO","HDFCBANK",
    "TITAN","HDFCLIFE","MARUTI","BAJAJFINSV","ADANIPORTS","CIPLA",
    "JSWSTEEL","BAJAJ-AUTO","ONGC","EICHERMOT","M&M",
]

TRADING_DAYS_PER_YEAR = 252


def calc_cagr(start_price, end_price, years):
    if pd.isna(start_price) or pd.isna(end_price) or start_price <= 0 or end_price <= 0:
        return np.nan
    return ((end_price / start_price) ** (1 / years) - 1) * 100


def get_price_by_trading_days(df, bars_back):
    if len(df) <= bars_back:
        return np.nan
    return df["close"].iloc[-(bars_back + 1)]


def fetch_history(symbol, exchange, days_back):
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)
    resp = httpx.post(f"{HOST}/api/v1/history", json={
        "apikey": API_KEY, "symbol": symbol, "exchange": exchange,
        "interval": "D",
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
    })
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != "success" or not data.get("data"):
        return None
    df = pd.DataFrame(data["data"])
    if "close" not in df.columns:
        return None
    df["date"] = pd.to_datetime(df["date"])
    return df.set_index("date").sort_index()


results = []
for symbol in symbols:
    try:
        df = fetch_history(symbol, "NSE", 365 * 6)
        if df is None or df.empty:
            print(f"{symbol}: No data")
            results.append([symbol, np.nan, np.nan, np.nan])
            continue
        total_bars = len(df)
        if total_bars < TRADING_DAYS_PER_YEAR:
            print(f"{symbol}: Insufficient data ({total_bars} bars)")
            results.append([symbol, np.nan, np.nan, np.nan])
            continue
        price_now = df["close"].iloc[-1]
        price_1y = get_price_by_trading_days(df, TRADING_DAYS_PER_YEAR)
        price_3y = get_price_by_trading_days(df, TRADING_DAYS_PER_YEAR * 3)
        price_5y = get_price_by_trading_days(df, TRADING_DAYS_PER_YEAR * 5)
        abs_1y = ((price_now / price_1y) - 1) * 100 if not pd.isna(price_1y) else np.nan
        cagr_3y = calc_cagr(price_3y, price_now, 3)
        cagr_5y = calc_cagr(price_5y, price_now, 5)
        abs_1y_str = f"{abs_1y:7.2f}%" if not pd.isna(abs_1y) else "N/A"
        cagr_3y_str = f"{cagr_3y:7.2f}%" if not pd.isna(cagr_3y) else "N/A"
        cagr_5y_str = f"{cagr_5y:7.2f}%" if not pd.isna(cagr_5y) else "N/A"
        print(f"{symbol:12s} | 1Y: {abs_1y_str:>8s} | 3Y: {cagr_3y_str:>8s} | 5Y: {cagr_5y_str:>8s}")
        results.append([symbol, abs_1y, cagr_3y, cagr_5y])
    except Exception as e:
        print(f"Error fetching {symbol}: {e}")
        results.append([symbol, np.nan, np.nan, np.nan])

df_cagr = pd.DataFrame(results, columns=["Symbol", "1Y", "3Y", "5Y"])


def create_heatmap(df, period, label):
    df_period = df[["Symbol", period]].copy()
    df_period = df_period.sort_values(period, ascending=False, na_position="last").reset_index(drop=True)
    if df_period.empty:
        print(f"No data for {label}")
        return
    cols = 10
    df_period["row"] = df_period.index // cols
    df_period["col"] = df_period.index % cols
    df_period["display_text"] = df_period.apply(
        lambda row: f"{row['Symbol']}<br>{row[period]:.2f}%" if pd.notna(row[period]) else f"{row['Symbol']}<br>N/A",
        axis=1,
    )
    pivot_values = df_period.pivot(index="row", columns="col", values=period)
    pivot_labels = df_period.pivot(index="row", columns="col", values="display_text")
    fig = px.imshow(pivot_values, color_continuous_scale="RdYlGn", aspect="auto")
    fig.update_traces(text=pivot_labels.values, texttemplate="%{text}", hovertemplate="%{text}<extra></extra>")
    fig.update_layout(
        title=f"NIFTY 50 {label} Heatmap (%)",
        xaxis=dict(showticklabels=False, title=""),
        yaxis=dict(showticklabels=False, autorange="reversed", title=""),
        template="plotly_dark",
        height=600, width=1200,
    )
    filename = f"nifty50_{period.lower()}_heatmap.png"
    fig.write_image(filename, width=1200, height=600, scale=2)
    print(f"{label} Heatmap saved as {filename}")


create_heatmap(df_cagr, "1Y", "1-Year Absolute Return")
create_heatmap(df_cagr, "3Y", "3-Year CAGR")
create_heatmap(df_cagr, "5Y", "5-Year CAGR")
print("\nAll heatmaps generated successfully!")
