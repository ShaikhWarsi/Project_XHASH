from __future__ import annotations

import re

REGIONAL_BENCHMARKS: dict[str, str] = {
    ".NS": "^NSEI",
    ".NSE": "^NSEI",
    ".BSE": "^BSESN",
    ".T": "^N225",
    ".HK": "^HSI",
    ".L": "^FTSE",
    ".TO": "^GSPTSE",
    ".AX": "^AXJO",
    ".DE": "^GDAXI",
    ".PA": "^FCHI",
    ".MI": "^FTMIB",
    ".TW": "^TWII",
    ".KS": "^KS11",
    ".SS": "^SSEC",
    ".SZ": "^SZSC1",
    ".SI": "^STI",
    ".US": "SPY",
    ".SA": "^BVSP",
}

DEFAULT_BENCHMARK = "SPY"


def get_benchmark_for_ticker(ticker: str) -> str:
    for suffix, benchmark in REGIONAL_BENCHMARKS.items():
        if ticker.upper().endswith(suffix):
            return benchmark
        if ticker.upper().endswith(suffix.upper()):
            return benchmark
    if re.search(r"-[Uu][Ss][DdTt]$", ticker):
        return "BTC-USD"
    return DEFAULT_BENCHMARK


def compute_alpha(returns: list[float], benchmark_returns: list[float]) -> float:
    if len(returns) != len(benchmark_returns) or len(returns) < 2:
        return 0.0
    import numpy as np
    r = np.array(returns)
    b = np.array(benchmark_returns)
    cov = np.cov(r, b)[0, 1]
    var_b = np.var(b)
    if var_b == 0:
        return 0.0
    beta = cov / var_b
    alpha = np.mean(r) - beta * np.mean(b)
    return float(alpha) * 252
