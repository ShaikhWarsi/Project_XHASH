import pandas as pd
import numpy as np
import plotly.graph_objects as go
import httpx
import json

API_KEY = "your_api_key_here"
HOST = "http://127.0.0.1:8000"
SYMBOL = "ICICIBANK"
EXCHANGE = "NSE"
START_YEAR = 2015
COLOR_CUTOFF = 10

POS_COLOR = (8, 153, 129)
NEG_COLOR = (242, 55, 69)
BG_COLOR = "#1e222d"
HEADER_BG = "rgba(128,128,128,0.2)"
TEXT_COLOR = "#d1d4dc"
LINE_COLOR = "rgba(128,128,128,0.3)"

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def calc_cell_color(value, cutoff=COLOR_CUTOFF):
    if pd.isna(value):
        return "rgba(128,128,128,0.3)"
    base = POS_COLOR if value >= 0 else NEG_COLOR
    intensity = min(abs(value) / cutoff, 1.0)
    opacity = 0.10 + intensity * 0.40
    return f"rgba({base[0]},{base[1]},{base[2]},{opacity})"


def calc_pos_pct_color(value, cutoff=50):
    if pd.isna(value):
        return "rgba(128,128,128,0.3)"
    shifted = value - 50
    base = POS_COLOR if shifted >= 0 else NEG_COLOR
    intensity = min(abs(shifted) / cutoff, 1.0)
    opacity = 0.10 + intensity * 0.40
    return f"rgba({base[0]},{base[1]},{base[2]},{opacity})"


def fetch_monthly_data(symbol, exchange, start_year):
    start_date = f"{start_year - 1}-12-01"
    end_date = pd.Timestamp.now().strftime("%Y-%m-%d")
    resp = httpx.post(f"{HOST}/api/v1/history", json={
        "apikey": API_KEY, "symbol": symbol, "exchange": exchange,
        "interval": "D", "start_date": start_date, "end_date": end_date,
    })
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != "success" or not data.get("data"):
        raise ValueError("No data returned from API.")
    df = pd.DataFrame(data["data"])
    if "close" not in df.columns:
        raise ValueError("Response missing 'close' column.")
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date").sort_index()
    monthly = df["close"].resample("ME").last().dropna()
    today = pd.Timestamp.now(tz=monthly.index.tz)
    last_complete_month_end = (today.replace(day=1) - pd.Timedelta(days=1)).normalize()
    monthly = monthly[monthly.index <= last_complete_month_end]
    return monthly


def build_seasonality_matrix(monthly_close, start_year):
    returns = monthly_close.pct_change() * 100
    years = sorted(set(returns.index.year))
    years = [y for y in years if y >= start_year]
    matrix = pd.DataFrame(index=years, columns=range(1, 13), dtype=float)
    for dt, ret in returns.items():
        if dt.year >= start_year:
            matrix.loc[dt.year, dt.month] = ret
    return matrix


def build_heatmap_figure(matrix):
    years = list(matrix.index)
    n_years = len(years)
    avgs = [matrix[m].mean() for m in range(1, 13)]
    stdevs = [matrix[m].std(ddof=1) for m in range(1, 13)]
    pos_pcts = []
    for m in range(1, 13):
        col = matrix[m].dropna()
        pos_pcts.append((col >= 0).sum() / len(col) * 100 if len(col) > 0 else float("nan"))
    header = ["Year"] + MONTH_NAMES
    cell_values = [[] for _ in range(13)]
    cell_colors = [[] for _ in range(13)]
    for year in years:
        cell_values[0].append(str(year))
        cell_colors[0].append(HEADER_BG)
        for m in range(1, 13):
            val = matrix.loc[year, m]
            if pd.isna(val):
                cell_values[m].append("NaN%")
                cell_colors[m].append("rgba(128,128,128,0.3)")
            else:
                cell_values[m].append(f"{val:.2f}%")
                cell_colors[m].append(calc_cell_color(val))
    for c in range(13):
        cell_values[c].append("")
        cell_colors[c].append(HEADER_BG)
    cell_values[0].append("Avgs:")
    cell_colors[0].append(HEADER_BG)
    for m in range(1, 13):
        cell_values[m].append(f"{avgs[m-1]:.2f}%")
        cell_colors[m].append(calc_cell_color(avgs[m-1]))
    cell_values[0].append("StDev:")
    cell_colors[0].append(HEADER_BG)
    for m in range(1, 13):
        cell_values[m].append(f"{stdevs[m-1]:.2f}")
        cell_colors[m].append("rgba(128,128,128,0.2)")
    cell_values[0].append("Pos%:")
    cell_colors[0].append(HEADER_BG)
    for m in range(1, 13):
        cell_values[m].append(f"{pos_pcts[m-1]:.0f}%")
        cell_colors[m].append(calc_pos_pct_color(pos_pcts[m-1]))
    fig = go.Figure(data=[go.Table(
        columnwidth=[80] + [100] * 12,
        header=dict(
            values=header,
            fill_color=HEADER_BG,
            font=dict(color=TEXT_COLOR, size=15, family="Trebuchet MS, sans-serif"),
            align="center",
            line=dict(color=LINE_COLOR, width=1),
            height=40,
        ),
        cells=dict(
            values=cell_values,
            fill_color=cell_colors,
            font=dict(color=TEXT_COLOR, size=14, family="Trebuchet MS, sans-serif"),
            align="center",
            line=dict(color=LINE_COLOR, width=1),
            height=36,
        ),
    )])
    fig.update_layout(
        title=dict(
            text=f"Seasonality — {SYMBOL} ({EXCHANGE}) Monthly Returns",
            font=dict(color=TEXT_COLOR, size=16, family="Trebuchet MS, sans-serif"),
            x=0.5,
        ),
        paper_bgcolor=BG_COLOR,
        margin=dict(l=10, r=10, t=50, b=10),
        height=max(400, 40 + (n_years + 4) * 36 + 60),
    )
    return fig


def main():
    print(f"Fetching daily data for {SYMBOL} on {EXCHANGE} via X_KA_HASH API...")
    monthly_close = fetch_monthly_data(SYMBOL, EXCHANGE, START_YEAR)
    print(f"Got {len(monthly_close)} monthly data points")
    matrix = build_seasonality_matrix(monthly_close, START_YEAR)
    print(f"Built seasonality matrix: {matrix.shape[0]} years x {matrix.shape[1]} months\n")
    display_df = matrix.round(2).copy()
    display_df.columns = MONTH_NAMES
    print(display_df.to_string())
    print()
    fig = build_heatmap_figure(matrix)
    fig.show()
    print("Seasonality chart opened in browser.")


if __name__ == "__main__":
    main()
