from __future__ import annotations

import asyncio
import json
import logging
import os
import platform
import signal
import subprocess
import sys
import threading
from datetime import date, datetime, time, timedelta
from pathlib import Path
from time import monotonic, sleep
from typing import Any

import psutil
import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

IST = pytz.timezone("Asia/Kolkata")
OS_TYPE = platform.system().lower()
IS_WINDOWS = OS_TYPE == "windows"

STRATEGIES_DIR = Path("strategies") / "scripts"
LOGS_DIR = Path("log") / "strategies"
CONFIG_FILE = Path("strategies") / "strategy_configs.json"

PROCESS_LOCK = threading.RLock()
RUNNING: dict[str, dict[str, Any]] = {}
CONFIGS: dict[str, dict[str, Any]] = {}
SCHEDULER: BackgroundScheduler | None = None
SSE_SUBSCRIBERS: list[asyncio.Queue] = []
SSE_LOCK = threading.Lock()


# ── SSE ──

def broadcast(status: str, strategy_id: str, message: str | None = None):
    data = json.dumps({"strategy_id": strategy_id, "status": status, "message": message, "timestamp": datetime.now(IST).isoformat()})
    event = f"data: {data}\n\n"
    with SSE_LOCK:
        alive: list[asyncio.Queue] = []
        for q in SSE_SUBSCRIBERS:
            try:
                q.put_nowait(event)
                alive.append(q)
            except Exception:
                pass
        SSE_SUBSCRIBERS.clear()
        SSE_SUBSCRIBERS.extend(alive)


# ── Config persistence ──

def _load_configs():
    global CONFIGS
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, encoding="utf-8") as f:
                CONFIGS = json.load(f)
            mutated = False
            for cfg in CONFIGS.values():
                if "exchange" not in cfg or not cfg.get("exchange"):
                    cfg["exchange"] = "NSE"
                    mutated = True
            if mutated:
                _save_configs()
        except Exception:
            logger.exception("Failed to load strategy configs")
            CONFIGS = {}


def _save_configs():
    try:
        CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        tmp = CONFIG_FILE.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(CONFIGS, f, indent=2, default=str, ensure_ascii=False)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, CONFIG_FILE)
    except Exception:
        logger.exception("Failed to save strategy configs")


# ── Subprocess management ──

def _get_python() -> str:
    if getattr(sys, "frozen", False):
        return sys.executable
    return sys.executable or "python"


def _create_subprocess_args() -> dict:
    args: dict = {"stdout": subprocess.PIPE, "stderr": subprocess.STDOUT, "bufsize": 1}
    if IS_WINDOWS:
        args["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
        si = subprocess.STARTUPINFO()
        si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        args["startupinfo"] = si
    else:
        args["start_new_session"] = True
    return args


def _env_for_strategy(cfg: dict) -> dict:
    env = os.environ.copy()
    env["STRATEGY_ID"] = cfg.get("id", "")
    env["STRATEGY_NAME"] = cfg.get("name", "")
    env["OPENALGO_STRATEGY_EXCHANGE"] = cfg.get("exchange", "NSE")
    return env


def start_strategy_process(strategy_id: str) -> str | None:
    cfg = CONFIGS.get(strategy_id)
    if not cfg:
        return "Strategy config not found"
    with PROCESS_LOCK:
        if strategy_id in RUNNING:
            proc_info = RUNNING[strategy_id]
            proc = proc_info.get("process")
            if proc and isinstance(proc, subprocess.Popen) and proc.poll() is None:
                return "Strategy is already running"
        file_path = STRATEGIES_DIR / cfg["filename"]
        if not file_path.exists():
            return f"Strategy file {file_path} not found"
        cmd = [_get_python(), "-u", str(file_path.absolute())]
        try:
            process = subprocess.Popen(cmd, **_create_subprocess_args())
            log_file = LOGS_DIR / f"{strategy_id}_{datetime.now(IST).strftime('%Y%m%d_%H%M%S')}_IST.log"
            LOGS_DIR.mkdir(parents=True, exist_ok=True)
            cfg["is_running"] = True
            cfg["last_error"] = None
            cfg["manually_stopped"] = False
            RUNNING[strategy_id] = {"process": process, "pid": process.pid, "started_at": datetime.now(IST), "log_file": str(log_file)}
            _save_configs()
            broadcast("started", strategy_id)
            logger.info("Strategy %s started (pid=%d)", strategy_id, process.pid)
            return None
        except Exception as e:
            logger.exception("Failed to start strategy %s", strategy_id)
            return str(e)


def stop_strategy_process(strategy_id: str) -> str | None:
    with PROCESS_LOCK:
        proc_info = RUNNING.pop(strategy_id, None)
        if not proc_info:
            cfg = CONFIGS.get(strategy_id, {})
            cfg["is_running"] = False
            cfg["manually_stopped"] = True
            _save_configs()
            broadcast("stopped", strategy_id)
            return None
        proc = proc_info.get("process")
        if isinstance(proc, subprocess.Popen) and proc.poll() is None:
            pid = proc.pid
            try:
                if IS_WINDOWS:
                    proc.terminate()
                    try:
                        proc.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True)
                else:
                    os.killpg(os.getpgid(pid), signal.SIGTERM)
                    try:
                        proc.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        os.killpg(os.getpgid(pid), signal.SIGKILL)
            except Exception as e:
                logger.warning("Error stopping strategy %s: %s", strategy_id, e)
        cfg = CONFIGS.get(strategy_id, {})
        cfg["is_running"] = False
        cfg["manually_stopped"] = True
        _save_configs()
        broadcast("stopped", strategy_id)
        logger.info("Strategy %s stopped", strategy_id)
        return None


def get_strategy_status(strategy_id: str) -> dict:
    cfg = CONFIGS.get(strategy_id, {})
    proc_info = RUNNING.get(strategy_id)
    is_running = False
    pid = None
    if proc_info:
        proc = proc_info.get("process")
        if isinstance(proc, subprocess.Popen) and proc.poll() is None:
            is_running = True
            pid = proc.pid
        else:
            RUNNING.pop(strategy_id, None)
    return {
        "id": strategy_id,
        "name": cfg.get("name", ""),
        "filename": cfg.get("filename", ""),
        "exchange": cfg.get("exchange", "NSE"),
        "is_running": is_running,
        "pid": pid,
        "is_scheduled": cfg.get("is_scheduled", False),
        "manually_stopped": cfg.get("manually_stopped", False),
        "last_error": cfg.get("last_error"),
        "schedule_start": cfg.get("schedule_start"),
        "schedule_stop": cfg.get("schedule_stop"),
        "schedule_days": cfg.get("schedule_days", []),
        "created_at": cfg.get("created_at"),
    }


# ── Scheduler ──

def init_scheduler():
    global SCHEDULER
    if SCHEDULER is not None:
        return
    SCHEDULER = BackgroundScheduler(daemon=True, timezone=IST)
    SCHEDULER.start()
    SCHEDULER.add_job(_daily_trading_day_check, CronTrigger(hour=0, minute=1, timezone=IST), id="daily_trading_day_check", replace_existing=True)
    SCHEDULER.add_job(_market_hours_enforcer, "interval", minutes=1, id="market_hours_enforcer", replace_existing=True)
    SCHEDULER.add_job(_reap_dead, "interval", seconds=60, id="reap_dead_strategies", replace_existing=True)
    logger.info("Strategy scheduler initialized")


def _daily_trading_day_check():
    today = date.today()
    if today.weekday() >= 5:
        for sid, cfg in CONFIGS.items():
            if cfg.get("is_scheduled") and cfg.get("exchange", "NSE") not in ("CRYPTO",):
                _pause_strategy_for_reason(sid, "Weekend — no trading session")


def _pause_strategy_for_reason(strategy_id: str, reason: str):
    cfg = CONFIGS.get(strategy_id)
    if not cfg:
        return
    cfg["paused_reason"] = reason
    _save_configs()
    stop_strategy_process(strategy_id)
    broadcast("paused", strategy_id, reason)


def _market_hours_enforcer():
    from api.utils.market_calendar import is_market_open as market_is_open
    for sid, cfg in list(CONFIGS.items()):
        if not cfg.get("is_scheduled"):
            continue
        exchange = cfg.get("exchange", "NSE").upper()
        if exchange in ("CRYPTO",):
            continue
        is_open = market_is_open(exchange)
        proc_info = RUNNING.get(sid)
        is_running = proc_info and isinstance(proc_info.get("process"), subprocess.Popen) and proc_info["process"].poll() is None
        if not is_open and is_running:
            _pause_strategy_for_reason(sid, f"Market closed ({exchange})")
        elif is_open and cfg.get("paused_reason") == f"Market closed ({exchange})":
            cfg["paused_reason"] = None
            _save_configs()
            start_strategy_process(sid)
            broadcast("resumed", sid, f"Market opened ({exchange})")


def _reap_dead():
    with PROCESS_LOCK:
        dead = [sid for sid, info in list(RUNNING.items()) if isinstance(info.get("process"), subprocess.Popen) and info["process"].poll() is not None]
        for sid in dead:
            RUNNING.pop(sid, None)
            cfg = CONFIGS.get(sid, {})
            if not cfg.get("manually_stopped"):
                cfg["last_error"] = "Process exited unexpectedly"
                broadcast("error", sid, "Process exited unexpectedly")
            cfg["is_running"] = False
            _save_configs()
            logger.warning("Reaped dead strategy: %s", sid)


# ── Public API ──

async def list_strategies() -> list[dict]:
    return [get_strategy_status(sid) for sid in CONFIGS]


async def get_strategy(strategy_id: str) -> dict | None:
    cfg = CONFIGS.get(strategy_id)
    if not cfg:
        return None
    return get_strategy_status(strategy_id)


async def create_strategy(name: str, exchange: str, schedule_start: str, schedule_stop: str, schedule_days: list[int], filename: str, file_content: str) -> tuple[dict | None, str | None]:
    import hashlib
    strategy_id = hashlib.sha256(f"{name}_{datetime.now().isoformat()}".encode()).hexdigest()[:16]
    STRATEGIES_DIR.mkdir(parents=True, exist_ok=True)
    file_path = STRATEGIES_DIR / filename
    try:
        file_path.write_text(file_content, encoding="utf-8")
    except Exception as e:
        return None, f"Failed to write file: {e}"
    now = datetime.now(IST).isoformat()
    cfg = {
        "id": strategy_id,
        "name": name,
        "filename": filename,
        "exchange": exchange.upper(),
        "is_running": False,
        "is_scheduled": True,
        "manually_stopped": False,
        "schedule_start": schedule_start,
        "schedule_stop": schedule_stop,
        "schedule_days": schedule_days,
        "created_at": now,
        "updated_at": now,
        "last_error": None,
        "paused_reason": None,
    }
    CONFIGS[strategy_id] = cfg
    _save_configs()
    _set_strategy_schedule(strategy_id)
    return get_strategy_status(strategy_id), None


async def update_strategy_file(strategy_id: str, content: str) -> str | None:
    cfg = CONFIGS.get(strategy_id)
    if not cfg:
        return "Strategy not found"
    file_path = STRATEGIES_DIR / cfg["filename"]
    try:
        (STRATEGIES_DIR / f"{cfg['filename']}.bak").write_text(file_path.read_text(encoding="utf-8"), encoding="utf-8") if file_path.exists() else None
        file_path.write_text(content, encoding="utf-8")
        cfg["updated_at"] = datetime.now(IST).isoformat()
        _save_configs()
        return None
    except Exception as e:
        return f"Failed to save file: {e}"


async def get_strategy_content(strategy_id: str) -> str | None:
    cfg = CONFIGS.get(strategy_id)
    if not cfg:
        return None
    file_path = STRATEGIES_DIR / cfg["filename"]
    if not file_path.exists():
        return None
    return file_path.read_text(encoding="utf-8")


async def start_strategy(strategy_id: str) -> str | None:
    error = start_strategy_process(strategy_id)
    if error:
        return error
    cfg = CONFIGS.get(strategy_id, {})
    if cfg.get("is_scheduled") and not cfg.get("manually_stopped"):
        _set_strategy_schedule(strategy_id)
    return None


async def stop_strategy(strategy_id: str) -> str | None:
    return stop_strategy_process(strategy_id)


async def delete_strategy(strategy_id: str) -> str | None:
    with PROCESS_LOCK:
        stop_strategy_process(strategy_id)
        if SCHEDULER:
            SCHEDULER.remove_job(f"start_{strategy_id}") if SCHEDULER.get_job(f"start_{strategy_id}") else None
            SCHEDULER.remove_job(f"stop_{strategy_id}") if SCHEDULER.get_job(f"stop_{strategy_id}") else None
        cfg = CONFIGS.pop(strategy_id, {})
        file_path = STRATEGIES_DIR / cfg.get("filename", "")
        try:
            if file_path.exists():
                file_path.unlink()
        except Exception:
            pass
        _save_configs()
        return None


async def update_schedule(strategy_id: str, schedule_start: str, schedule_stop: str, schedule_days: list[int]) -> str | None:
    cfg = CONFIGS.get(strategy_id)
    if not cfg:
        return "Strategy not found"
    with PROCESS_LOCK:
        proc_info = RUNNING.get(strategy_id)
        if proc_info and isinstance(proc_info.get("process"), subprocess.Popen) and proc_info["process"].poll() is None:
            return "Stop the strategy before changing schedule"
    cfg["schedule_start"] = schedule_start
    cfg["schedule_stop"] = schedule_stop
    cfg["schedule_days"] = schedule_days
    cfg["updated_at"] = datetime.now(IST).isoformat()
    _save_configs()
    _set_strategy_schedule(strategy_id)
    return None


def _set_strategy_schedule(strategy_id: str):
    if not SCHEDULER:
        return
    cfg = CONFIGS.get(strategy_id)
    if not cfg or not cfg.get("is_scheduled"):
        return
    for job_id in [f"start_{strategy_id}", f"stop_{strategy_id}"]:
        if SCHEDULER.get_job(job_id):
            SCHEDULER.remove_job(job_id)
    start_t = cfg.get("schedule_start", "09:15")
    stop_t = cfg.get("schedule_stop", "15:30")
    days = cfg.get("schedule_days", [0, 1, 2, 3, 4])
    start_h, start_m = map(int, start_t.split(":"))
    stop_h, stop_m = map(int, stop_t.split(":"))
    SCHEDULER.add_job(_scheduled_start, CronTrigger(hour=start_h, minute=start_m, day_of_week=",".join(str(d) for d in days), timezone=IST), id=f"start_{strategy_id}", args=[strategy_id], replace_existing=True)
    SCHEDULER.add_job(_scheduled_stop, CronTrigger(hour=stop_h, minute=stop_m, day_of_week=",".join(str(d) for d in days), timezone=IST), id=f"stop_{strategy_id}", args=[strategy_id], replace_existing=True)


def _scheduled_start(strategy_id: str):
    cfg = CONFIGS.get(strategy_id)
    if not cfg or cfg.get("manually_stopped"):
        return
    start_strategy_process(strategy_id)


def _scheduled_stop(strategy_id: str):
    stop_strategy_process(strategy_id)


async def get_log_files(strategy_id: str) -> list[dict]:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted(LOGS_DIR.glob(f"{strategy_id}_*.log"), reverse=True)
    return [{"name": f.name, "size": f.stat().st_size, "modified": datetime.fromtimestamp(f.stat().st_mtime, tz=IST).isoformat()} for f in files[:10]]


async def get_log_content(strategy_id: str, log_name: str) -> str | None:
    if ".." in log_name or "/" in log_name or "\\" in log_name:
        return None
    log_path = LOGS_DIR / log_name
    if not log_path.exists() or not log_path.name.startswith(strategy_id):
        return None
    return log_path.read_text(encoding="utf-8", errors="replace")


async def clear_logs(strategy_id: str) -> str | None:
    with PROCESS_LOCK:
        if strategy_id in RUNNING:
            return "Cannot clear logs while strategy is running"
    for f in LOGS_DIR.glob(f"{strategy_id}_*.log"):
        try:
            f.unlink()
        except Exception:
            pass
    return None


async def restore_states():
    _load_configs()
    for sid, cfg in CONFIGS.items():
        if cfg.get("is_running") and not cfg.get("manually_stopped"):
            _set_strategy_schedule(sid)
            pid = cfg.get("pid")
            if pid:
                try:
                    proc = psutil.Process(pid)
                    if proc.is_running() and any("python" in p.lower() for p in proc.cmdline()):
                        RUNNING[sid] = {"process": proc, "pid": pid, "started_at": datetime.fromtimestamp(proc.create_time(), tz=IST)}
                        continue
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            error = start_strategy_process(sid)
            if error:
                cfg["last_error"] = error
                _save_configs()


# ── Market calendar integration ──

def get_market_status(exchange: str) -> dict:
    try:
        from api.utils.market_calendar import get_market_status as _status
        return _status(exchange)
    except ImportError:
        return {"exchange": exchange, "is_open": True, "message": "Market calendar not available"}


def is_market_open(exchange: str) -> bool:
    try:
        from api.utils.market_calendar import is_market_open as _open
        return _open(exchange)
    except ImportError:
        return True
