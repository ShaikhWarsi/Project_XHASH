from __future__ import annotations

import csv
import io
import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

logger = logging.getLogger(__name__)

_data_store: dict[str, list[dict[str, Any]]] = {}
_download_jobs: dict[str, dict[str, Any]] = {}
_watchlist: list[dict[str, str]] = []

TIMEFRAMES = {"1m", "5m", "15m", "30m", "1h", "1d", "1w", "1M"}

TIMEFRAME_MINUTES: dict[str, int] = {
    "1m": 1, "5m": 5, "15m": 15, "30m": 30,
    "1h": 60, "1d": 1440, "1w": 10080, "1M": 43200,
}

_DUCKDB_PATH = os.environ.get("HISTORIFY_DB_PATH", "db/historify.duckdb")
_duckdb_available = False
_duckdb_conn = None

try:
    import duckdb
    _duckdb_available = True
except ImportError:
    logger.info("duckdb not installed; Historify will use in-memory mock store")


def _get_duckdb_conn():
    global _duckdb_conn
    if not _duckdb_available:
        return None
    if _duckdb_conn is None:
        os.makedirs(os.path.dirname(_DUCKDB_PATH), exist_ok=True)
        _duckdb_conn = duckdb.connect(_DUCKDB_PATH)
        _ensure_duckdb_schema(_duckdb_conn)
    return _duckdb_conn


def _ensure_duckdb_schema(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ohlcv (
            symbol VARCHAR NOT NULL,
            exchange VARCHAR NOT NULL,
            timeframe VARCHAR NOT NULL,
            timestamp TIMESTAMPTZ NOT NULL,
            open DOUBLE,
            high DOUBLE,
            low DOUBLE,
            close DOUBLE,
            volume BIGINT,
            PRIMARY KEY (symbol, exchange, timeframe, timestamp)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS download_jobs (
            job_id VARCHAR PRIMARY KEY,
            symbol VARCHAR NOT NULL,
            exchange VARCHAR NOT NULL,
            timeframe VARCHAR NOT NULL,
            from_date VARCHAR,
            to_date VARCHAR,
            status VARCHAR DEFAULT 'running',
            progress INTEGER DEFAULT 0,
            rows INTEGER DEFAULT 0,
            error VARCHAR,
            created_at TIMESTAMPTZ DEFAULT now()
        )
    """)


def _data_key(symbol: str, exchange: str, timeframe: str) -> str:
    return f"{symbol.upper()}:{exchange.upper()}:{timeframe}"


def _generate_mock_ohlcv(
    symbol: str,
    exchange: str,
    timeframe: str,
    from_date: str,
    to_date: str,
    job_id: str | None = None,
) -> list[dict[str, Any]]:
    import random
    import pandas as pd
    random.seed(hash(symbol.upper() + exchange.upper() + timeframe) % (2**31))
    base_price = 50.0 + (sum(ord(c) for c in symbol) % 200)
    candles: list[dict[str, Any]] = []
    fmt = "%Y-%m-%d" if "T" not in from_date else "%Y-%m-%dT%H:%M:%S"
    try:
        dt_from = datetime.strptime(from_date[:19], fmt).replace(tzinfo=timezone.utc)
    except ValueError:
        dt_from = datetime.now(timezone.utc) - timedelta(days=30)
    try:
        dt_to = datetime.strptime(to_date[:19], fmt).replace(tzinfo=timezone.utc)
    except ValueError:
        dt_to = datetime.now(timezone.utc)
    interval_minutes = TIMEFRAME_MINUTES.get(timeframe, 1440)
    delta_minutes = int((dt_to - dt_from).total_seconds() / 60)
    num_candles = max(1, delta_minutes // interval_minutes)
    price = base_price
    total = num_candles
    for i in range(num_candles):
        if job_id and _download_jobs.get(job_id, {}).get("status") == "cancelled":
            break
        ts = dt_from + timedelta(minutes=i * interval_minutes)
        change = random.gauss(0, 1) * (interval_minutes**0.5) * 0.002 * base_price
        open_price = round(price, 2)
        close_price = round(price + change, 2)
        high_price = round(max(open_price, close_price) + random.random() * abs(change) * 1.5, 2)
        low_price = round(min(open_price, close_price) - random.random() * abs(change) * 1.5, 2)
        low_price = min(low_price, open_price, close_price)
        high_price = max(high_price, open_price, close_price)
        volume = int(random.uniform(10000, 500000) * (base_price / 100))
        candles.append({
            "timestamp": ts.isoformat(),
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "close": close_price,
            "volume": volume,
        })
        price = close_price
        if job_id:
            _download_jobs[job_id]["progress"] = int((i + 1) / total * 100)
    return candles


def _store_ohlcv_duckdb(conn, symbol: str, exchange: str, timeframe: str, candles: list[dict[str, Any]]):
    conn.execute("DELETE FROM ohlcv WHERE symbol = ? AND exchange = ? AND timeframe = ?",
                 (symbol.upper(), exchange.upper(), timeframe))
    import pandas as pd
    df = pd.DataFrame(candles)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["symbol"] = symbol.upper()
    df["exchange"] = exchange.upper()
    df["timeframe"] = timeframe
    conn.register("_ohlcv_df", df)
    conn.execute("""
        INSERT INTO ohlcv (symbol, exchange, timeframe, timestamp, open, high, low, close, volume)
        SELECT symbol, exchange, timeframe, timestamp, open, high, low, close, volume FROM _ohlcv_df
    """)
    conn.unregister("_ohlcv_df")


def _fetch_ohlcv_duckdb(conn, symbol: str, exchange: str, timeframe: str,
                         from_date: str | None = None, to_date: str | None = None) -> list[dict[str, Any]]:
    import pandas as pd
    query = "SELECT timestamp, open, high, low, close, volume FROM ohlcv WHERE symbol = ? AND exchange = ? AND timeframe = ?"
    params: list[Any] = [symbol.upper(), exchange.upper(), timeframe]
    if from_date:
        query += " AND timestamp >= ?"
        params.append(from_date)
    if to_date:
        query += " AND timestamp <= ?"
        params.append(to_date)
    query += " ORDER BY timestamp ASC"
    df = conn.execute(query, params).fetchdf()
    if df.empty:
        return []
    df["timestamp"] = df["timestamp"].dt.strftime("%Y-%m-%dT%H:%M:%S")
    return df.to_dict("records")


def download_data(
    symbol: str,
    exchange: str,
    timeframe: str,
    from_date: str,
    to_date: str,
    candles: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    if timeframe not in TIMEFRAMES:
        raise ValueError(f"Unsupported timeframe '{timeframe}'. Choose from: {', '.join(sorted(TIMEFRAMES))}")
    job_id = uuid.uuid4().hex[:12]

    conn = _get_duckdb_conn()
    if conn:
        conn.execute(
            "INSERT INTO download_jobs (job_id, symbol, exchange, timeframe, from_date, to_date, status, progress, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, 'running', 0, now())",
            (job_id, symbol.upper(), exchange.upper(), timeframe, from_date, to_date),
        )

    _download_jobs[job_id] = {
        "job_id": job_id,
        "symbol": symbol.upper(),
        "exchange": exchange.upper(),
        "timeframe": timeframe,
        "from_date": from_date,
        "to_date": to_date,
        "status": "running",
        "progress": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        if candles is not None:
            pass
        else:
            candles = _generate_mock_ohlcv(symbol, exchange, timeframe, from_date, to_date, job_id)

        key = _data_key(symbol, exchange, timeframe)
        _data_store[key] = candles

        if conn:
            _store_ohlcv_duckdb(conn, symbol, exchange, timeframe, candles)
            conn.execute("UPDATE download_jobs SET status = 'completed', progress = 100, rows = ? WHERE job_id = ?",
                         (len(candles), job_id))

        _download_jobs[job_id].update({"status": "completed", "progress": 100, "rows": len(candles)})
        return {"status": "completed", "job_id": job_id, "rows": len(candles)}

    except Exception as e:
        if conn:
            conn.execute("UPDATE download_jobs SET status = 'failed', error = ? WHERE job_id = ?",
                         (str(e)[:500], job_id))
        _download_jobs[job_id].update({"status": "failed", "error": str(e)})
        raise


def get_ohlcv(
    symbol: str,
    exchange: str,
    timeframe: str,
    from_date: str | None = None,
    to_date: str | None = None,
) -> list[dict[str, Any]]:
    conn = _get_duckdb_conn()
    if conn:
        data = _fetch_ohlcv_duckdb(conn, symbol, exchange, timeframe, from_date, to_date)
        if data:
            return data
    key = _data_key(symbol, exchange, timeframe)
    candles = _data_store.get(key, [])
    if not candles:
        candles = _generate_mock_ohlcv(
            symbol, exchange, timeframe,
            from_date or (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d"),
            to_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        )
        _data_store[key] = candles
        if conn:
            _store_ohlcv_duckdb(conn, symbol, exchange, timeframe, candles)
    if from_date:
        candles = [c for c in candles if c["timestamp"] >= from_date]
    if to_date:
        candles = [c for c in candles if c["timestamp"] <= to_date]
    return candles


def get_watchlist() -> list[dict[str, str]]:
    return _watchlist


def add_to_watchlist(symbol: str, exchange: str) -> list[dict[str, str]]:
    entry = {"symbol": symbol.upper(), "exchange": exchange.upper()}
    if entry not in _watchlist:
        _watchlist.append(entry)
    return _watchlist


def remove_from_watchlist(symbol: str, exchange: str) -> list[dict[str, str]]:
    global _watchlist
    _watchlist = [w for w in _watchlist if not (w["symbol"] == symbol.upper() and w["exchange"] == exchange.upper())]
    return _watchlist


def export_csv(symbol: str, exchange: str, timeframe: str) -> str:
    key = _data_key(symbol, exchange, timeframe)
    candles = _data_store.get(key, [])
    if not candles:
        conn = _get_duckdb_conn()
        if conn:
            candles = _fetch_ohlcv_duckdb(conn, symbol, exchange, timeframe)
    if not candles:
        return ""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["timestamp", "open", "high", "low", "close", "volume"])
    for c in candles:
        writer.writerow([c["timestamp"], c["open"], c["high"], c["low"], c["close"], c["volume"]])
    return output.getvalue()


def list_jobs() -> list[dict[str, Any]]:
    conn = _get_duckdb_conn()
    if conn:
        try:
            df = conn.execute("SELECT * FROM download_jobs ORDER BY created_at DESC").fetchdf()
            return df.to_dict("records")
        except Exception:
            pass
    return list(_download_jobs.values())


def cancel_job(job_id: str) -> bool:
    job = _download_jobs.get(job_id)
    conn = _get_duckdb_conn()
    if conn:
        conn.execute("UPDATE download_jobs SET status = 'cancelled' WHERE job_id = ? AND status NOT IN ('completed', 'failed')",
                     (job_id,))
    if not job:
        return False
    if job["status"] in ("completed", "failed"):
        return False
    job["status"] = "cancelled"
    return True


def get_db_stats() -> dict[str, Any]:
    conn = _get_duckdb_conn()
    stats = {
        "mode": "duckdb" if conn else "mock",
        "db_path": _DUCKDB_PATH if _duckdb_available else None,
    }
    if conn:
        try:
            row = conn.execute("SELECT COUNT(*) as total_rows, COUNT(DISTINCT symbol) as symbols FROM ohlcv").fetchone()
            stats["total_ohlcv_rows"] = row[0]
            stats["symbols_in_db"] = row[1]
        except Exception:
            pass
    return stats
