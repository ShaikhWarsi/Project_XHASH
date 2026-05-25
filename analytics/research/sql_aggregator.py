from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Sequence

import pandas as pd
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)


class SQLAggregator:
    def __init__(self, connection_string: str = "sqlite:///trading_engine.db"):
        self.engine = create_engine(connection_string)

    def query(self, sql: str, params: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
        params = params or {}
        with self.engine.connect() as conn:
            result = conn.execute(text(sql), params)
            if result.returns_rows:
                rows = result.fetchall()
                cols = result.keys()
                return pd.DataFrame(rows, columns=cols)
            conn.commit()
            return pd.DataFrame({"affected_rows": [result.rowcount]})

    def table(self, name: str) -> pd.DataFrame:
        return self.query(f"SELECT * FROM {name}")

    def aggregate_bars(
        self,
        symbol: str,
        source: str = "bars",
        freq: str = "1h",
        agg_funcs: Optional[Dict[str, str]] = None,
        start: Optional[str] = None,
        end: Optional[str] = None,
    ) -> pd.DataFrame:
        if agg_funcs is None:
            agg_funcs = {
                "open": "first",
                "high": "max",
                "low": "min",
                "close": "last",
                "volume": "sum",
            }
        columns = ", ".join(
            f"{fn}({col}) as {col}_{fn}" if fn not in ("first", "last") else f"{fn}({col}) as {col}"
            for col, fn in agg_funcs.items()
        )
        where_clauses = [f"symbol = '{symbol}'"]
        if source == "bars":
            table = "bars"
        else:
            table = source
        sql = f"SELECT timestamp, {columns} FROM {table} WHERE {' AND '.join(where_clauses)} GROUP BY strftime('{freq}', timestamp)"
        df = self.query(sql)
        return df

    def daily_returns(
        self,
        symbol: str,
        method: str = "close",
        start: Optional[str] = None,
        end: Optional[str] = None,
    ) -> pd.DataFrame:
        df = self.query(
            f"SELECT timestamp, {method} as price FROM bars WHERE symbol = :symbol ORDER BY timestamp",
            params={"symbol": symbol},
        )
        df["return"] = df["price"].pct_change()
        return df

    def rolling_volatility(
        self,
        symbol: str,
        window: int = 21,
        start: Optional[str] = None,
        end: Optional[str] = None,
    ) -> pd.DataFrame:
        df = self.daily_returns(symbol, start=start, end=end)
        df["volatility"] = df["return"].rolling(window).std() * (252 ** 0.5)
        return df

    def correlation_matrix(
        self,
        symbols: List[str],
        method: str = "pearson",
        window: Optional[int] = None,
    ) -> pd.DataFrame:
        returns_dict: Dict[str, pd.Series] = {}
        for symbol in symbols:
            df = self.daily_returns(symbol)
            returns_dict[symbol] = df.set_index("timestamp")["return"]
        returns_df = pd.DataFrame(returns_dict)
        if window:
            returns_df = returns_df.rolling(window).corr()
        return returns_df.corr(method=method)

    def factor_exposure(
        self,
        symbol: str,
        factor_symbol: str,
        window: int = 63,
    ) -> pd.DataFrame:
        asset = self.daily_returns(symbol)
        factor = self.daily_returns(factor_symbol)
        merged = asset.merge(factor, on="timestamp", suffixes=("_asset", "_factor"))
        merged["beta"] = merged["return_asset"].rolling(window).cov(
            merged["return_factor"]
        ) / merged["return_factor"].rolling(window).var()
        return merged[["timestamp", "beta"]]

    def register_view(self, name: str, query: str):
        with self.engine.connect() as conn:
            conn.execute(text(f"CREATE VIEW IF NOT EXISTS {name} AS {query}"))
            conn.commit()

    def list_tables(self) -> List[str]:
        with self.engine.connect() as conn:
            result = conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table'")
            )
            return [row[0] for row in result]

    def list_views(self) -> List[str]:
        with self.engine.connect() as conn:
            result = conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='view'")
            )
            return [row[0] for row in result]

    def tick_aggregation(
        self,
        table: str,
        freq: str = "1min",
        agg_funcs: Optional[Dict[str, str]] = None,
    ) -> pd.DataFrame:
        if agg_funcs is None:
            agg_funcs = {"price": "last", "volume": "sum", "size": "count"}
        columns = ", ".join(
            f"{fn}({col}) as {col}_{fn}"
            for col, fn in agg_funcs.items()
        )
        sql = f"SELECT strftime('{freq}', timestamp) as bucket, {columns} FROM {table} GROUP BY bucket ORDER BY bucket"
        return self.query(sql)

    def market_cap_weighted_return(
        self,
        symbols: List[str],
        market_caps: Dict[str, float],
    ) -> pd.DataFrame:
        returns_dict: Dict[str, pd.Series] = {}
        for symbol in symbols:
            df = self.daily_returns(symbol)
            returns_dict[symbol] = df.set_index("timestamp")["return"]
        returns_df = pd.DataFrame(returns_dict)
        total_cap = sum(market_caps.values())
        weights = {s: c / total_cap for s, c in market_caps.items()}
        weighted = returns_df * pd.Series(weights)
        return pd.DataFrame({"weighted_return": weighted.sum(axis=1)})
