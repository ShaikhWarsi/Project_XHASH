from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol

import pandas as pd


@dataclass
class SignalResult:
    name: str
    value: float | str | None
    direction: int = 0
    strength: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)


class IndicatorPlugin(Protocol):
    name: str
    version: str

    def compute(self, data: pd.DataFrame, **params: Any) -> pd.DataFrame:
        ...

    def signals(self, data: pd.DataFrame) -> list[SignalResult]:
        ...

    def required_columns(self) -> list[str]:
        ...


class IndicatorRegistry:
    def __init__(self):
        self._plugins: dict[str, IndicatorPlugin] = {}

    def register(self, plugin: IndicatorPlugin) -> None:
        self._plugins[plugin.name] = plugin

    def unregister(self, name: str) -> None:
        self._plugins.pop(name, None)

    def get(self, name: str) -> IndicatorPlugin | None:
        return self._plugins.get(name)

    def list_plugins(self) -> list[str]:
        return list(self._plugins.keys())

    def compute_all(self, data: pd.DataFrame, **params: Any) -> dict[str, pd.DataFrame]:
        results: dict[str, pd.DataFrame] = {}
        for name, plugin in self._plugins.items():
            try:
                plugin_params = params.get(name, {})
                result = plugin.compute(data, **plugin_params)
                if result is not None and not result.empty:
                    results[name] = result
            except Exception:
                continue
        return results

    def generate_signals(self, data: pd.DataFrame) -> dict[str, list[SignalResult]]:
        signals: dict[str, list[SignalResult]] = {}
        for name, plugin in self._plugins.items():
            try:
                plugin_signals = plugin.signals(data)
                if plugin_signals:
                    signals[name] = plugin_signals
            except Exception:
                continue
        return signals
