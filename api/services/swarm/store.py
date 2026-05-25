from __future__ import annotations

import json
import os
import time
import logging
from datetime import datetime, timezone
from typing import Any
from pathlib import Path

logger = logging.getLogger(__name__)

SWARM_DIR = os.environ.get("SWARM_DATA_DIR", str(Path.home() / ".trading-engine" / "swarm"))

RUN_STATUSES = ("pending", "running", "completed", "failed", "cancelled")
TASK_STATUSES = ("pending", "blocked", "in_progress", "completed", "failed", "cancelled")


def _ensure_run_dir(run_id: str) -> str:
    d = os.path.join(SWARM_DIR, run_id)
    os.makedirs(d, exist_ok=True)
    os.makedirs(os.path.join(d, "tasks"), exist_ok=True)
    os.makedirs(os.path.join(d, "artifacts"), exist_ok=True)
    return d


def _atomic_write(path: str, data: Any) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2, default=str)
    os.replace(tmp, path)


def _read_json(path: str) -> Any | None:
    if not os.path.isfile(path):
        return None
    with open(path) as f:
        return json.load(f)


class SwarmStore:
    @staticmethod
    def create_run(run_id: str, preset_name: str = "", user_vars: dict | None = None) -> dict:
        d = _ensure_run_dir(run_id)
        run = {
            "run_id": run_id,
            "preset_name": preset_name,
            "status": "pending",
            "user_vars": user_vars or {},
            "agents": [],
            "tasks": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "final_report": None,
            "error": None,
            "heartbeat_interval": 3.0,
            "stale_threshold": 30.0,
            "last_event_at": None,
        }
        _atomic_write(os.path.join(d, "run.json"), run)
        return run

    @staticmethod
    def load_run(run_id: str) -> dict | None:
        return _read_json(os.path.join(SWARM_DIR, run_id, "run.json"))

    @staticmethod
    def save_run(run: dict) -> None:
        d = _ensure_run_dir(run["run_id"])
        _atomic_write(os.path.join(d, "run.json"), run)

    @staticmethod
    def list_runs() -> list[dict]:
        if not os.path.isdir(SWARM_DIR):
            return []
        runs = []
        for name in os.listdir(SWARM_DIR):
            path = os.path.join(SWARM_DIR, name, "run.json")
            r = _read_json(path)
            if r:
                runs.append(r)
        return sorted(runs, key=lambda x: x.get("created_at", ""), reverse=True)

    @staticmethod
    def load_task(run_id: str, task_id: str) -> dict | None:
        return _read_json(os.path.join(SWARM_DIR, run_id, "tasks", f"{task_id}.json"))

    @staticmethod
    def save_task(run_id: str, task: dict) -> None:
        d = _ensure_run_dir(run_id)
        _atomic_write(os.path.join(d, "tasks", f"{task['id']}.json"), task)

    @staticmethod
    def load_all_tasks(run_id: str) -> list[dict]:
        tasks_dir = os.path.join(SWARM_DIR, run_id, "tasks")
        if not os.path.isdir(tasks_dir):
            return []
        tasks = []
        for name in os.listdir(tasks_dir):
            if name.endswith(".json"):
                t = _read_json(os.path.join(tasks_dir, name))
                if t:
                    tasks.append(t)
        return tasks

    @staticmethod
    def log_event(run_id: str, event: dict) -> None:
        d = _ensure_run_dir(run_id)
        events_path = os.path.join(d, "events.jsonl")
        event["timestamp"] = event.get("timestamp", datetime.now(timezone.utc).isoformat())
        with open(events_path, "a") as f:
            f.write(json.dumps(event, default=str) + "\n")
        run = SwarmStore.load_run(run_id)
        if run:
            run["last_event_at"] = event["timestamp"]
            SwarmStore.save_run(run)

    @staticmethod
    def load_events(run_id: str) -> list[dict]:
        path = os.path.join(SWARM_DIR, run_id, "events.jsonl")
        if not os.path.isfile(path):
            return []
        events = []
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line:
                    events.append(json.loads(line))
        return events

    @staticmethod
    def is_run_stale(run: dict) -> bool:
        if run.get("status") != "running":
            return False
        last_event = run.get("last_event_at")
        if not last_event:
            return False
        try:
            last_ts = datetime.fromisoformat(last_event).timestamp()
        except (ValueError, TypeError):
            return False
        elapsed = time.time() - last_ts
        threshold = run.get("stale_threshold", 30.0)
        return elapsed > threshold

    @staticmethod
    def compute_stale_threshold(heartbeat: float = 3.0, timeout: float = 60.0, retries: int = 0) -> float:
        return max(60.0, min(heartbeat * 10, max(timeout * (retries + 1), 60.0)))

    @staticmethod
    def reconcile_run(run_id: str) -> dict | None:
        run = SwarmStore.load_run(run_id)
        if not run:
            return None
        tasks = SwarmStore.load_all_tasks(run_id)
        run["tasks"] = tasks
        if run.get("status") == "running":
            all_terminal = all(t.get("status") in ("completed", "failed", "cancelled") for t in tasks)
            if all_terminal and len(tasks) > 0:
                has_failed = any(t.get("status") == "failed" for t in tasks)
                run["status"] = "failed" if has_failed else "completed"
                run["completed_at"] = datetime.now(timezone.utc).isoformat()
                SwarmStore.save_run(run)
                return run
            if SwarmStore.is_run_stale(run):
                run["status"] = "failed"
                run["error"] = "Stale run reaped (no heartbeat)"
                run["completed_at"] = datetime.now(timezone.utc).isoformat()
                SwarmStore.save_run(run)
                SwarmStore.log_event(run_id, {"type": "reaped", "reason": "stale_threshold_exceeded"})
        return run

    @staticmethod
    def reap_stale_runs() -> list[str]:
        reaped = []
        for name in os.listdir(SWARM_DIR):
            run = SwarmStore.reconcile_run(name)
            if run and run.get("status") in ("failed", "completed") and run.get("error") == "Stale run reaped (no heartbeat)":
                reaped.append(name)
        return reaped

    @staticmethod
    def update_run_status(run_id: str, status: str) -> dict | None:
        run = SwarmStore.load_run(run_id)
        if not run:
            return None
        run["status"] = status
        if status in ("completed", "failed", "cancelled"):
            run["completed_at"] = datetime.now(timezone.utc).isoformat()
        SwarmStore.save_run(run)
        return run
