from __future__ import annotations

import logging
import threading
import time
from collections import defaultdict

from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/llm", tags=["llm"])

_usage: dict[str, dict] = defaultdict(lambda: {"prompt_tokens": 0, "completion_tokens": 0, "calls": 0, "cost_usd": 0.0})
_usage_lock = threading.Lock()

_PER_TOKEN_COST = {
    "gpt-4o": {"prompt": 2.50 / 1_000_000, "completion": 10.00 / 1_000_000},
    "gpt-4o-mini": {"prompt": 0.15 / 1_000_000, "completion": 0.60 / 1_000_000},
    "gpt-4.1": {"prompt": 2.00 / 1_000_000, "completion": 8.00 / 1_000_000},
    "claude-sonnet-4": {"prompt": 3.00 / 1_000_000, "completion": 15.00 / 1_000_000},
    "claude-opus-4": {"prompt": 15.00 / 1_000_000, "completion": 75.00 / 1_000_000},
}


def track_usage(model: str, prompt_tokens: int, completion_tokens: int):
    with _usage_lock:
        entry = _usage[model]
        entry["prompt_tokens"] += prompt_tokens
        entry["completion_tokens"] += completion_tokens
        entry["calls"] += 1
        costs = _PER_TOKEN_COST.get(model, {"prompt": 0.0, "completion": 0.0})
        entry["cost_usd"] += prompt_tokens * costs["prompt"] + completion_tokens * costs["completion"]


@router.get("/usage")
async def llm_usage():
    with _usage_lock:
        total_cost = sum(e["cost_usd"] for e in _usage.values())
        total_tokens = sum(e["prompt_tokens"] + e["completion_tokens"] for e in _usage.values())
        total_calls = sum(e["calls"] for e in _usage.values())
        return {
            "total_calls": total_calls,
            "total_tokens": total_tokens,
            "total_cost_usd": round(total_cost, 6),
            "per_model": dict(_usage),
        }
