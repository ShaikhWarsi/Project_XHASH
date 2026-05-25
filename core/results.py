from __future__ import annotations

from datetime import datetime
from typing import Any, Generic, Optional, TypeVar

import pandas as pd
from pydantic import BaseModel

T = TypeVar("T")


class TradingResult(BaseModel, Generic[T]):
    results: Optional[T] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    timestamp: Optional[datetime] = None
    warnings: list[str] = []
    metadata: dict[str, Any] = {}

    def model_post_init(self, __context: Any) -> None:
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()

    def to_dataframe(self) -> pd.DataFrame:
        if self.results is None:
            return pd.DataFrame()
        if isinstance(self.results, pd.DataFrame):
            return self.results
        if isinstance(self.results, list):
            if not self.results:
                return pd.DataFrame()
            if hasattr(self.results[0], "to_dataframe_row"):
                return pd.DataFrame([r.to_dataframe_row() for r in self.results])
            if hasattr(self.results[0], "model_dump"):
                return pd.DataFrame([r.model_dump() for r in self.results])
            return pd.DataFrame(self.results)
        if hasattr(self.results, "model_dump"):
            return pd.DataFrame([self.results.model_dump()])
        return pd.DataFrame([self.results])

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump(mode="json")

    def to_llm(self, max_chars: int = 4000) -> str:
        df = self.to_dataframe()
        text = f"Provider: {self.provider} | Model: {self.model}\n"
        text += f"Timestamp: {self.timestamp}\n\n"
        text += df.to_string(max_rows=50)
        if len(text) > max_chars:
            text = text[:max_chars] + "\n... [truncated]"
        return text


class ResultWarning(BaseModel):
    message: str
    category: str = "info"
    timestamp: Optional[datetime] = None

    def model_post_init(self, __context: Any) -> None:
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
