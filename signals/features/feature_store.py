from __future__ import annotations

import json
import logging
import sqlite3
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class FeatureStore:
    def __init__(self, db_path: str = "data/feature_store.db"):
        self.db_path = db_path
        self._local = threading.local()
        self._init_db()

    @property
    def _conn(self) -> sqlite3.Connection:
        if not hasattr(self._local, "conn") or self._local.conn is None:
            self._local.conn = sqlite3.connect(self.db_path)
            self._local.conn.row_factory = sqlite3.Row
        return self._local.conn

    def _init_db(self):
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS features (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                feature_name TEXT NOT NULL,
                feature_value REAL,
                computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_features_lookup
            ON features(symbol, feature_name, computed_at)
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS feature_definitions (
                name TEXT PRIMARY KEY,
                description TEXT,
                category TEXT,
                params TEXT
            )
        """)
        conn.commit()
        conn.close()

    def store_features(
        self,
        symbol: str,
        features: Dict[str, float],
        metadata: Optional[Dict[str, Any]] = None,
    ):
        now = datetime.utcnow().isoformat()
        meta_json = json.dumps(metadata) if metadata else None
        rows = [
            (symbol, name, value, now, meta_json)
            for name, value in features.items()
        ]
        self._conn.executemany(
            "INSERT INTO features (symbol, feature_name, feature_value, computed_at, metadata) VALUES (?, ?, ?, ?, ?)",
            rows,
        )
        self._conn.commit()

    def get_features(
        self,
        symbol: str,
        feature_names: Optional[List[str]] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        limit: int = 1000,
    ) -> pd.DataFrame:
        query = "SELECT feature_name, feature_value, computed_at FROM features WHERE symbol = ?"
        params: List[Any] = [symbol]
        if feature_names:
            placeholders = ",".join("?" * len(feature_names))
            query += f" AND feature_name IN ({placeholders})"
            params.extend(feature_names)
        if start_time:
            query += " AND computed_at >= ?"
            params.append(start_time)
        if end_time:
            query += " AND computed_at <= ?"
            params.append(end_time)
        query += " ORDER BY computed_at DESC LIMIT ?"
        params.append(limit)
        df = pd.read_sql_query(query, self._conn, params=params)
        return df

    def get_latest_features(
        self,
        symbol: str,
        feature_names: Optional[List[str]] = None,
    ) -> Dict[str, float]:
        df = self.get_features(symbol, feature_names=feature_names, limit=500)
        if df.empty:
            return {}
        result = {}
        for name in df["feature_name"].unique():
            subset = df[df["feature_name"] == name]
            latest = subset.iloc[0]
            result[name] = latest["feature_value"]
        return result

    def list_feature_names(self, symbol: Optional[str] = None) -> List[str]:
        if symbol:
            df = pd.read_sql_query(
                "SELECT DISTINCT feature_name FROM features WHERE symbol = ?",
                self._conn,
                params=[symbol],
            )
        else:
            df = pd.read_sql_query(
                "SELECT DISTINCT feature_name FROM features",
                self._conn,
            )
        return df["feature_name"].tolist()

    def register_feature_definition(
        self,
        name: str,
        description: str,
        category: str = "generic",
        params: Optional[Dict[str, Any]] = None,
    ):
        self._conn.execute(
            "INSERT OR REPLACE INTO feature_definitions (name, description, category, params) VALUES (?, ?, ?, ?)",
            (name, description, category, json.dumps(params) if params else None),
        )
        self._conn.commit()

    def list_definitions(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        if category:
            df = pd.read_sql_query(
                "SELECT * FROM feature_definitions WHERE category = ?",
                self._conn,
                params=[category],
            )
        else:
            df = pd.read_sql_query("SELECT * FROM feature_definitions", self._conn)
        return df.to_dict(orient="records")

    def delete_old_features(self, before: str):
        self._conn.execute("DELETE FROM features WHERE computed_at < ?", (before,))
        self._conn.commit()

    def get_feature_count(self) -> int:
        row = self._conn.execute("SELECT COUNT(*) as cnt FROM features").fetchone()
        return row["cnt"] if row else 0
