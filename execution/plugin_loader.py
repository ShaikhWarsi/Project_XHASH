from __future__ import annotations

import importlib
import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

EXCHANGE_DIR = os.path.join(os.path.dirname(__file__), "exchanges")
PLUGIN_JSON = os.path.join(EXCHANGE_DIR, "plugin.json")

_capabilities: dict[str, dict[str, Any]] | None = None


def get_exchange_map() -> dict[str, str]:
    """Return {exchange_name: module_path} for all exchange modules."""
    modules = {}
    for fname in os.listdir(EXCHANGE_DIR):
        if fname.endswith(".py") and not fname.startswith("_"):
            name = fname[:-3]
            modules[name] = f"execution.exchanges.{name}"
    return modules


def load_plugin_capabilities() -> dict[str, dict[str, Any]]:
    global _capabilities
    if _capabilities is not None:
        return _capabilities

    if os.path.exists(PLUGIN_JSON):
        try:
            with open(PLUGIN_JSON) as f:
                plugins = json.load(f)
            _capabilities = {p["name"]: p for p in plugins.get("exchanges", [])}
        except (json.JSONDecodeError, OSError) as e:
            logger.warning("Failed to load plugin.json: %s", e)

    if _capabilities is None:
        _capabilities = {}

    for module_name in get_exchange_map():
        if module_name not in _capabilities:
            _capabilities[module_name] = {
                "name": module_name,
                "type": "cex",
                "ccxt": True,
            }

    return _capabilities


def get_exchange_capabilities(name: str) -> dict[str, Any] | None:
    caps = load_plugin_capabilities()
    return caps.get(name)


def get_exchange_module(name: str):
    modules = get_exchange_map()
    if name not in modules:
        return None
    try:
        return importlib.import_module(modules[name])
    except ImportError as e:
        logger.error("Failed to import exchange %s: %s", name, e)
        return None
