from __future__ import annotations

from datetime import datetime

import pandas as pd

from core.enums import SignalDir, SignalType
from core.types import QuantSignal
from signals.base import SignalEngine


class AlphaZooBridgeEngine(SignalEngine):
    """Wraps an alpha zoo formula as a SignalEngine for multi-ticker panels."""

    def __init__(self, alpha_id: str, **kwargs):
        super().__init__(**kwargs)
        self._alpha_id = alpha_id
        self._multi_ticker_bars: dict[str, pd.DataFrame] = {}
        self._timeframe = kwargs.get("timeframe", "1d")
        self._signal_type = kwargs.get("signal_type", SignalType.TREND)

    @property
    def signal_type(self) -> SignalType:
        return self._signal_type

    def compute(self, bars: pd.DataFrame) -> list[QuantSignal]:
        return []

    def compute_panel(self, panel: dict[str, pd.DataFrame]) -> list[QuantSignal]:
        from signals.alpha_zoo import get_default_registry
        registry = get_default_registry()
        try:
            factor_df = registry.compute(self._alpha_id, panel)
        except Exception:
            return []
        signals = []
        for symbol in factor_df.columns:
            vals = factor_df[symbol].dropna()
            if vals.empty:
                continue
            latest = float(vals.iloc[-1])
            direction = SignalDir.BULLISH if latest > 0 else SignalDir.BEARISH if latest < 0 else SignalDir.NEUTRAL
            norm = min(abs(latest), 1.0)
            signals.append(QuantSignal(
                type=self._signal_type, direction=direction,
                strength=norm, confidence=norm,
                symbol=symbol, timeframe=self._timeframe,
                timestamp=datetime.utcnow(),
                price=float(panel.get("close", pd.DataFrame()).iloc[-1].get(symbol, 0)) if "close" in panel else None,
            ))
        return signals


def register_alpha_zoo_engines():
    from signals.alpha_zoo import get_default_registry
    from signals.engine_registry import ENGINE_REGISTRY
    registry = get_default_registry()
    for alpha_id in registry.list():
        ENGINE_REGISTRY[f"alpha_{alpha_id}"] = type(
            f"AlphaZoo_{alpha_id.replace('.', '_')}",
            (AlphaZooBridgeEngine,),
            {"__init__": lambda self, **kw: AlphaZooBridgeEngine.__init__(self, alpha_id=alpha_id, **kw)},
        )
