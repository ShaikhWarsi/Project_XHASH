from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


class HypothesisRegistry:
    def __init__(self, storage_path: Optional[str] = None):
        if storage_path is None:
            storage_path = str(Path.home() / ".trading-engine" / "hypotheses.json")
        self._path = Path(storage_path)
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._hypotheses: list[dict] = self._load()

    def _load(self) -> list[dict]:
        if self._path.exists():
            try:
                return json.loads(self._path.read_text())
            except (json.JSONDecodeError, OSError):
                return []
        return []

    def _save(self):
        self._path.write_text(json.dumps(self._hypotheses, indent=2))

    def create(self, title: str, description: str, tags: Optional[list[str]] = None) -> dict:
        h = {
            "id": f"H{len(self._hypotheses) + 1:04d}",
            "title": title,
            "description": description,
            "tags": tags or [],
            "status": "active",
            "backtest_ids": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        self._hypotheses.append(h)
        self._save()
        return h

    def list(self, status: Optional[str] = None) -> list[dict]:
        if status:
            return [h for h in self._hypotheses if h["status"] == status]
        return list(self._hypotheses)

    def get(self, hypothesis_id: str) -> Optional[dict]:
        for h in self._hypotheses:
            if h["id"] == hypothesis_id:
                return h
        return None

    def link_backtest(self, hypothesis_id: str, backtest_id: str) -> Optional[dict]:
        h = self.get(hypothesis_id)
        if h is None:
            return None
        if backtest_id not in h["backtest_ids"]:
            h["backtest_ids"].append(backtest_id)
            h["updated_at"] = datetime.now(timezone.utc).isoformat()
            self._save()
        return h

    def update_status(self, hypothesis_id: str, status: str) -> Optional[dict]:
        h = self.get(hypothesis_id)
        if h is None:
            return None
        h["status"] = status
        h["updated_at"] = datetime.now(timezone.utc).isoformat()
        self._save()
        return h

    def search(self, query: str) -> list[dict]:
        q = query.lower()
        return [h for h in self._hypotheses if q in h["title"].lower() or q in h["description"].lower()]
