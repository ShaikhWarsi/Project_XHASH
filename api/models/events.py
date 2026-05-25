from __future__ import annotations

import json
from typing import Any, Dict, Optional


class StartEvent:
    def to_sse(self) -> str:
        return "data: {\"type\": \"start\"}\n\n"


class ProgressUpdateEvent:
    def __init__(
        self,
        agent: str,
        ticker: Optional[str],
        status: str,
        timestamp: Optional[str] = None,
        analysis: Optional[str] = None,
    ):
        self.agent = agent
        self.ticker = ticker
        self.status = status
        self.timestamp = timestamp
        self.analysis = analysis

    def to_sse(self) -> str:
        data = {
            "type": "progress",
            "agent": self.agent,
            "ticker": self.ticker,
            "status": self.status,
        }
        if self.timestamp:
            data["timestamp"] = self.timestamp
        if self.analysis:
            data["analysis"] = self.analysis
        return f"data: {json.dumps(data)}\n\n"


class ErrorEvent:
    def __init__(self, message: str):
        self.message = message

    def to_sse(self) -> str:
        data = {"type": "error", "message": self.message}
        return f"data: {json.dumps(data)}\n\n"


class CompleteEvent:
    def __init__(self, data: Dict[str, Any]):
        self.data = data

    def to_sse(self) -> str:
        payload = {"type": "complete", "data": self.data}
        return f"data: {json.dumps(payload)}\n\n"
