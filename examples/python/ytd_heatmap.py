"""
NIFTY 50 YTD Heatmap
--------------------
Baseline: close on last trading day of previous year.
Sorted: top gainers top-left to top losers bottom-right.
Data source: X_KA_HASH Historify API.
"""

import pandas as pd
import plotly.express as px
import httpx

API_KEY = "your_api_key_here"
HOST = "http://127.0.0.1:8000"
BASELINE_YEAR = 2025

SYMBOLS = [
    "INDIGO","TRENT","HINDUNILVR","HCLTECH","WIPRO","INFY","TATACONSUM",
    "TATASTEEL","ITC","ASIANPAINT","SBILIFE","LT","SHRIRAMFIN","BEL",
    "SBIN","COALINDIA","KOTAKBANK","TCS","SUNPHARMA","MAXHEALTH",
    "NESTLEIND","RELIANCE","ETERNAL","APOLLOHOSP","ICICIBANK","GRASIM",
    "ULTRACEMCO","ADANIENT","AXISBANK","DRREDDY","TECHM","TMPV","JIOFIN",
    "NTPC","BAJFINANCE","BHARTIARTL","POWERGRID","HINDALCO","HDFCBANK",
    "TITAN","HDFCLIFE","MARUTI","BAJAJFINSV","ADANIPORTS","CIPLA",
    "JSWSTEEL","BAJAJ-AUTO","ONGC","EICHERMOT","M&M",
]

BASELINE_DATE = pd.Timestamp(f"{BASELINE_YEAR}-12-31").date()

rows = []
last_date_str = None
for sym in SYMBOLS:
    try:
        resp = httpx.post(f"{HOST}/api/v1/history", json={
            "apikey": API_KEY, "symbol": sym, "exchange": "NSE",
            "interval": "D",
            "start_date": f"{BASELINE_YEAR}-12-30",
            "end_date": f"{BASELINE_YEAR + 1}-12-31",
        })
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"{sym}: fetch error: {e}")
        continue
    if data.get("status") != "success" or not data.get("data"):
        print(f"{sym}: no data")
        continue
    df = pd.DataFrame(data["data"])
    df["date"] = pd.to_datetime(df["date"]).dt.date
    df = df.sort_values("date")
    if BASELINE_DATE not in df["date"].values:
        print(f"{sym}: missing baseline {BASELINE_DATE}")
        continue
    base = float(df[df["date"] == BASELINE_DATE].iloc[0]["close"])
    last_close = float(df.iloc[-1]["close"])
    last_date_str = df.iloc[-1]["date"].isoformat()
    pct = ((last_close / base) - 1.0) * 100.0
    rows.append({"Symbol": sym, "Change": round(pct, 2)})

if not rows:
    raise SystemExit("No data. Run Historify bulk download first.")

df = pd.DataFrame(rows).sort_values("Change", ascending=False).reset_index(drop=True)
cols = 10
df["row"] = df.index // cols
df["col"] = df.index % cols
pivot_values = df.pivot(index="row", columns="col", values="Change")
pivot_labels = df.pivot(index="row", columns="col", values="Symbol")

fig = px.imshow(pivot_values, color_continuous_scale="RdYlGn", aspect="auto")
fig.update_traces(
    text=pivot_labels.values,
    texttemplate="%{text}<br>%{z:.2f}%",
    hovertemplate="Symbol: %{text}<br>YTD: %{z:.2f}%",
)
fig.update_layout(
    title=f"NIFTY 50 YTD {BASELINE_YEAR + 1} Heatmap",
    xaxis=dict(showticklabels=False, title=""),
    yaxis=dict(showticklabels=False, autorange="reversed", title=""),
    template="plotly_dark",
    height=600,
)
out = "nifty50_ytd_heatmap.png"
fig.write_image(out, width=1200, height=600, scale=2)
print(f"Saved {out}  (as-of {last_date_str}, {len(df)} symbols)")
