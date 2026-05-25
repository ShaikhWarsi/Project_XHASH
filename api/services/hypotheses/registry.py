from __future__ import annotations

import json
import os
import hashlib
import logging
from datetime import datetime, timezone
from typing import Any
from pathlib import Path

logger = logging.getLogger(__name__)

HYPOTHESES_PATH = os.environ.get(
    "HYPOTHESES_DATA_PATH",
    str(Path.home() / ".trading-engine" / "hypotheses.json"),
)

HYPOTHESIS_STATUSES = ("exploring", "testing", "validated", "rejected", "monitoring")


def _load_all() -> dict[str, dict]:
    if not os.path.isfile(HYPOTHESES_PATH):
        return {}
    with open(HYPOTHESES_PATH) as f:
        return json.load(f)


def _save_all(data: dict[str, dict]) -> None:
    os.makedirs(os.path.dirname(HYPOTHESES_PATH), exist_ok=True)
    tmp = HYPOTHESES_PATH + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2, default=str)
    os.replace(tmp, HYPOTHESES_PATH)


def _make_id(title: str) -> str:
    raw = f"{title}_{datetime.now(timezone.utc).isoformat()}"
    return "hyp_" + hashlib.sha256(raw.encode()).hexdigest()[:12]


class HypothesisRegistry:
    @staticmethod
    def create(
        title: str,
        thesis: str,
        universe: str = "",
        signal_definition: str = "",
        data_sources: list[str] | None = None,
        skills: list[str] | None = None,
    ) -> dict:
        all_h = _load_all()
        hid = _make_id(title)
        h = {
            "hypothesis_id": hid,
            "title": title,
            "thesis": thesis,
            "status": "exploring",
            "universe": universe,
            "signal_definition": signal_definition,
            "data_sources": data_sources or [],
            "skills": skills or [],
            "run_cards": [],
            "invalidation_notes": "",
            "backtest_results": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        all_h[hid] = h
        _save_all(all_h)
        return h

    @staticmethod
    def get(hypothesis_id: str) -> dict | None:
        return _load_all().get(hypothesis_id)

    @staticmethod
    def update(hypothesis_id: str, updates: dict) -> dict | None:
        all_h = _load_all()
        h = all_h.get(hypothesis_id)
        if not h:
            return None
        for k, v in updates.items():
            if k in ("title", "thesis", "universe", "signal_definition", "invalidation_notes"):
                h[k] = v
            elif k == "status" and v in HYPOTHESIS_STATUSES:
                h[k] = v
            elif k == "data_sources" and isinstance(v, list):
                h[k] = v
            elif k == "skills" and isinstance(v, list):
                h[k] = v
        h["updated_at"] = datetime.now(timezone.utc).isoformat()
        all_h[hypothesis_id] = h
        _save_all(all_h)
        return h

    @staticmethod
    def link_backtest(
        hypothesis_id: str,
        run_card_path: str = "",
        backtest_run_dir: str = "",
        metrics: dict | None = None,
        notes: str = "",
    ) -> dict | None:
        all_h = _load_all()
        h = all_h.get(hypothesis_id)
        if not h:
            return None
        entry = {
            "run_card_path": run_card_path,
            "backtest_run_dir": backtest_run_dir,
            "metrics": metrics or {},
            "notes": notes,
            "linked_at": datetime.now(timezone.utc).isoformat(),
        }
        h["run_cards"].append(entry)
        h["updated_at"] = datetime.now(timezone.utc).isoformat()
        all_h[hypothesis_id] = h
        _save_all(all_h)
        return h

    @staticmethod
    def add_backtest_result(hypothesis_id: str, result: dict) -> dict | None:
        all_h = _load_all()
        h = all_h.get(hypothesis_id)
        if not h:
            return None
        result["added_at"] = datetime.now(timezone.utc).isoformat()
        h["backtest_results"].append(result)
        h["updated_at"] = datetime.now(timezone.utc).isoformat()
        all_h[hypothesis_id] = h
        _save_all(all_h)
        return h

    @staticmethod
    def invalidate(hypothesis_id: str, notes: str = "") -> dict | None:
        return HypothesisRegistry.update(hypothesis_id, {
            "status": "rejected",
            "invalidation_notes": notes,
        })

    @staticmethod
    def search(query: str = "", status: str = "") -> list[dict]:
        all_h = _load_all().values()
        results = []
        q = query.lower()
        for h in all_h:
            if q and q not in h.get("title", "").lower() and q not in h.get("thesis", "").lower():
                continue
            if status and h.get("status") != status:
                continue
            results.append(h)
        return sorted(results, key=lambda x: x.get("created_at", ""), reverse=True)

    @staticmethod
    def list() -> list[dict]:
        return sorted(
            _load_all().values(),
            key=lambda x: x.get("created_at", ""),
            reverse=True,
        )

    @staticmethod
    def delete(hypothesis_id: str) -> bool:
        all_h = _load_all()
        if hypothesis_id not in all_h:
            return False
        del all_h[hypothesis_id]
        _save_all(all_h)
        return True
