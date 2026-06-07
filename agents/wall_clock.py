from __future__ import annotations

import time
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class TimerEntry:
    name: str
    started_at: float
    elapsed_ms: float = 0.0
    completed: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)


class AgentWallClock:
    """Tracks wall-clock execution time for agent operations.

    Provides a simple timer system for measuring how long agents
    spend on deliberation, research, trading, and other tasks.
    """

    def __init__(self):
        self._timers: dict[str, TimerEntry] = {}
        self._history: list[dict] = []

    def start(self, name: str, metadata: dict | None = None) -> str:
        timer_id = f"{name}_{time.time_ns()}"
        self._timers[timer_id] = TimerEntry(
            name=name,
            started_at=time.time(),
            metadata=metadata or {},
        )
        return timer_id

    def stop(self, timer_id: str) -> float | None:
        entry = self._timers.get(timer_id)
        if not entry:
            return None
        elapsed = (time.time() - entry.started_at) * 1000
        entry.elapsed_ms = round(elapsed, 2)
        entry.completed = True
        self._history.append(asdict(entry))
        return entry.elapsed_ms

    def get_active(self) -> list[dict]:
        return [asdict(e) for e in self._timers.values() if not e.completed]

    def get_completed(self, limit: int = 50) -> list[dict]:
        return self._history[-limit:]

    def get_summary(self) -> dict[str, Any]:
        if not self._history:
            return {"total_ops": 0, "avg_ms": 0, "by_name": {}}
        by_name: dict[str, list[float]] = {}
        for entry in self._history:
            by_name.setdefault(entry["name"], []).append(entry["elapsed_ms"])
        summary = {}
        for name, times in by_name.items():
            summary[name] = {
                "count": len(times),
                "avg_ms": round(sum(times) / len(times), 2),
                "max_ms": round(max(times), 2),
                "min_ms": round(min(times), 2),
            }
        all_times = [e["elapsed_ms"] for e in self._history]
        return {
            "total_ops": len(self._history),
            "avg_ms": round(sum(all_times) / len(all_times), 2) if all_times else 0,
            "by_name": summary,
        }


_wall_clock = AgentWallClock()


def get_wall_clock() -> AgentWallClock:
    return _wall_clock
