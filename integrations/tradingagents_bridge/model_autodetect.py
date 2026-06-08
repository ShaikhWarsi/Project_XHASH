"""Auto-detect models loaded in LM Studio via its OpenAI-compatible endpoint."""
from __future__ import annotations

import json
import logging
import os
import urllib.request
from typing import Optional

logger = logging.getLogger(__name__)


def auto_detect_model(base_url: str | None = None) -> Optional[str]:
    """Query LM Studio's ``/v1/models`` and return the first model ID.

    Returns ``None`` if the endpoint is unreachable or no models are loaded.
    The caller should fall back to a sensible default in that case.
    """
    url = (base_url or os.environ.get("LMSTUDIO_BASE_URL", "http://localhost:1234/v1")).rstrip("/") + "/models"
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            models = data.get("data", [])
            if not models:
                logger.warning("LM Studio returned empty model list at %s", url)
                return None
            first = models[0].get("id")
            logger.info("Auto-detected LM Studio model: %s", first)
            return first
    except Exception as exc:
        logger.warning("Failed to auto-detect LM Studio model at %s: %s", url, exc)
        return None
