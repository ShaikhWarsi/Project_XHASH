from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Sequence

import pandas as pd
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

_VALID_IDENTIFIER = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_]*$')
_VALID_FREQ = re.compile(r'^[a-zA-Z0-9_]+$')
_ALLOWED_TABLES: set | None = None


def _validate_identifier(name: str, label: str = "name") -> str:
    if not _VALID_IDENTIFIER.match(name):
        raise ValueError(f"Invalid {label}: {name!r}")
    return name


def _validate_freq(freq: str) -> str:
    if not _VALID_FREQ.match(freq):
        raise ValueError(f"Invalid frequency: {freq!r}")
    return freq


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
        _validate_identifier(name, "table name")
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
        table = "bars" if source == "bars" else _validate_identifier(source, "table name")
        _validate_freq(freq)
        sql = f"SELECT timestamp, {columns} FROM {table} WHERE symbol = :symbol GROUP BY strftime('{freq}', timestamp)"
        df = self.query(sql, params={"symbol": symbol})
        return df

    def daily_returns(
        self,
        symbol: str,
        method: str = "close",
        start: Optional[str] = None,
        end: Optional[str] = None,
    ) -> pd.DataFrame:
        _validate_identifier(method, "column name")
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
        _validate_identifier(name, "view name")
        with self.engine.connect() as conn:
            conn.execute(text(f"CREATE VIEW IF NOT EXISTS {name} AS {query}"))
            conn.commit()

    def list_tables(self) -> list[dict]:
        with self.engine.connect() as conn:
            result = conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table'")
            )
            tables = []
            for row in result:
                table_name = row[0]
                col_result = conn.execute(
                    text(f"PRAGMA table_info(\"{table_name}\")")
                )
                columns = [col[1] for col in col_result]
                tables.append({"name": table_name, "columns": columns})
            return tables

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
        _validate_identifier(table, "table name")
        _validate_freq(freq)
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
