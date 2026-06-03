from __future__ import annotations
import asyncio
import json
import logging
import os
import time
from typing import Any

logger = logging.getLogger(__name__)

_MOTD_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "motd_config.json")

_default_motd: dict[str, Any] = {
    "id": "motd-default",
    "message": "Welcome to the Trading Engine",
    "type": "info",
    "active": True,
}


def _read_motd() -> dict[str, Any]:
    try:
        with open(_MOTD_PATH, "r") as f:
            data = json.load(f)
            if data.get("active", True):
                return data
    except FileNotFoundError:
        pass
    except Exception as e:
        logger.warning("Failed to read MOTD config: %s", e)
    return dict(_default_motd)


def _write_motd(data: dict[str, Any]) -> bool:
    try:
        with open(_MOTD_PATH, "w") as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        logger.error("Failed to write MOTD config: %s", e)
        return False


def get_motd() -> dict[str, Any]:
    motd = _read_motd()
    motd["timestamp"] = int(time.time())
    return motd


def update_motd(message: str, msg_type: str = "info", active: bool = True) -> dict[str, Any]:
    import uuid
    data = {
        "id": f"motd-{uuid.uuid4().hex[:8]}",
        "message": message,
        "type": msg_type,
        "active": active,
    }
    if _write_motd(data):
        data["timestamp"] = int(time.time())
        return data
    raise RuntimeError("Failed to update MOTD config")


async def motd_generator():
    """Async generator that yields MOTD data on changes.
    Polls the file every 30 seconds and yields when changed."""
    last_content = ""
    while True:
        try:
            with open(_MOTD_PATH, "r") as f:
                content = f.read()
            if content != last_content:
                last_content = content
                motd = get_motd()
                yield motd
        except Exception:
            pass
        await asyncio.sleep(30)
