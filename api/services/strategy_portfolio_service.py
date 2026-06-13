from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

_entries: dict[int, dict] = {}
_next_id: int = 1

WATCHLISTS = ("mytrades", "simulation")


def list_portfolio(watchlist: str | None = None) -> list[dict]:
    if watchlist and watchlist not in WATCHLISTS:
        return []
    items = list(_entries.values())
    if watchlist:
        items = [e for e in items if e.get("watchlist") == watchlist]
    return [_serialize(e) for e in sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)]


def get_portfolio_entry(entry_id: int) -> dict | None:
    entry = _entries.get(entry_id)
    return _serialize(entry) if entry else None


def save_portfolio_entry(
    name: str,
    watchlist: str,
    underlying: str,
    exchange: str,
    expiry: str | None = None,
    legs: list[dict] | None = None,
    notes: str | None = None,
    entry_id: int | None = None,
) -> dict:
    global _next_id
    now = datetime.now(timezone.utc).isoformat()
    if entry_id and entry_id in _entries:
        entry = _entries[entry_id]
        entry.update(
            name=name,
            watchlist=watchlist,
            underlying=underlying,
            exchange=exchange,
            expiry=expiry,
            legs=legs or [],
            notes=notes or "",
            updated_at=now,
        )
    else:
        entry_id = _next_id
        _next_id += 1
        entry = {
            "id": entry_id,
            "name": name,
            "watchlist": watchlist,
            "underlying": underlying,
            "exchange": exchange,
            "expiry": expiry,
            "legs": legs or [],
            "notes": notes or "",
            "created_at": now,
            "updated_at": now,
        }
        _entries[entry_id] = entry
    return _serialize(_entries[entry_id])


def delete_portfolio_entry(entry_id: int) -> bool:
    return _entries.pop(entry_id, None) is not None


def _validate_payload(data: dict) -> tuple[bool, str | None]:
    if not data.get("name"):
        return False, "name is required"
    if not data.get("underlying"):
        return False, "underlying is required"
    if not data.get("exchange"):
        return False, "exchange is required"
    watchlist = data.get("watchlist", "mytrades")
    if watchlist not in WATCHLISTS:
        return False, f"watchlist must be one of: {', '.join(WATCHLISTS)}"
    legs = data.get("legs", [])
    if not isinstance(legs, list):
        return False, "legs must be a list"
    for leg in legs:
        if not isinstance(leg, dict):
            return False, "each leg must be an object"
        for field in ("type", "action", "strike", "quantity", "price"):
            if field not in leg:
                return False, f"each leg must contain '{field}'"
        if leg["type"] not in ("call", "put"):
            return False, "leg type must be 'call' or 'put'"
        if leg["action"] not in ("buy", "sell"):
            return False, "leg action must be 'buy' or 'sell'"
    return True, None


def _serialize(entry: dict) -> dict:
    return {
        "id": entry["id"],
        "name": entry["name"],
        "watchlist": entry["watchlist"],
        "underlying": entry["underlying"],
        "exchange": entry["exchange"],
        "expiry": entry.get("expiry"),
        "legs": entry.get("legs", []),
        "notes": entry.get("notes", ""),
        "created_at": entry.get("created_at"),
        "updated_at": entry.get("updated_at"),
    }
