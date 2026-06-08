"""Build TradingAgents config from our env vars, defaulting to LM Studio."""
from __future__ import annotations

import os
from copy import deepcopy
from typing import Any

from integrations.tradingagents.default_config import DEFAULT_CONFIG


def build_ta_config(overrides: dict[str, Any] | None = None) -> dict[str, Any]:
    """Return a TradingAgents config dict pointing at LM Studio by default.

    Reads our env vars (``LMSTUDIO_BASE_URL``, ``TA_MAX_DEBATE_ROUNDS``, etc.)
    and merges any caller-provided overrides.  The returned dict is a fresh
    copy so the caller can safely mutate it.
    """
    cfg = deepcopy(DEFAULT_CONFIG)

    lmstudio_url = os.environ.get("LMSTUDIO_BASE_URL", "http://localhost:1234/v1")

    cfg.update({
        "llm_provider": "lmstudio",
        "backend_url": lmstudio_url,
        "deep_think_llm": os.environ.get("LMSTUDIO_DEEP_MODEL") or None,
        "quick_think_llm": os.environ.get("LMSTUDIO_QUICK_MODEL") or None,
        "output_language": os.environ.get("TA_LANGUAGE", "English"),
        "max_debate_rounds": int(os.environ.get("TA_MAX_DEBATE_ROUNDS", "1")),
        "max_risk_discuss_rounds": int(os.environ.get("TA_MAX_RISK_ROUNDS", "1")),
        "checkpoint_enabled": False,
    })

    if overrides:
        cfg.update(overrides)

    return cfg
