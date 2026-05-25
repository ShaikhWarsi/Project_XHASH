from __future__ import annotations

import time
from collections import defaultdict


class AnalystWallTimeTracker:
    def __init__(self):
        self._start_times: dict[str, float] = {}
        self._elapsed: dict[str, list[float]] = defaultdict(list)
        self._phases: list[dict] = []

    def start(self, agent_id: str):
        self._start_times[agent_id] = time.monotonic()

    def stop(self, agent_id: str):
        start = self._start_times.pop(agent_id, None)
        if start is not None:
            elapsed = time.monotonic() - start
            self._elapsed[agent_id].append(elapsed)
            self._phases.append({"agent": agent_id, "seconds": round(elapsed, 2)})

    def total(self, agent_id: str) -> float:
        return sum(self._elapsed.get(agent_id, []))

    def summary(self) -> dict:
        return {
            agent: {"total_seconds": round(sum(times), 2), "calls": len(times)}
            for agent, times in self._elapsed.items()
        }

    def reset(self):
        self._start_times.clear()
        self._elapsed.clear()
        self._phases.clear()
