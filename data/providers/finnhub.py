from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class FinnhubDataSource:
    def __init__(self) -> None:
        logger.info("FinnhubDataSource initialized (simulated)")

    def fetch(self, symbol: str) -> dict[str, Any]:
        return {"symbol": symbol, "simulated": True}
