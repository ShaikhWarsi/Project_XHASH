"""Unified market structure state — fuses all SMC/structure signals into one coherent view."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from core.enums import RegimeType, SignalDir, SignalType
from core.types import QuantSignal, RegimeState


@dataclass
class StructureState:
    """Current market structure state for one symbol/timeframe combination."""
    symbol: str
    timeframe: str
    timestamp: datetime

    # Trend / regime context
    trend_direction: SignalDir = SignalDir.NEUTRAL
    regime: RegimeType = RegimeType.RANGE_BOUND
    regime_confidence: float = 0.0

    # Active (unmitigated) SMC levels
    active_order_blocks: list[dict] = field(default_factory=list)
    active_fvgs: list[dict] = field(default_factory=list)
    last_bos: Optional[dict] = None
    last_choch: Optional[dict] = None
    liquidity_levels: list[dict] = field(default_factory=list)

    # Multi-level extremes from ATRMarketStructureEngine
    ms_levels: dict[int, list] = field(default_factory=dict)

    # Active pattern detections
    active_patterns: list[dict] = field(default_factory=list)
    key_levels: list[float] = field(default_factory=list)

    # Consolidated
    composite_bias: SignalDir = SignalDir.NEUTRAL
    composite_confidence: float = 0.0
    total_signals: int = 0
    bullish_count: int = 0
    bearish_count: int = 0

    def to_dict(self) -> dict:
        return {
            "symbol": self.symbol,
            "timeframe": self.timeframe,
            "timestamp": self.timestamp.isoformat(),
            "trend_direction": self.trend_direction.value,
            "regime": self.regime.value,
            "regime_confidence": self.regime_confidence,
            "active_order_blocks": self.active_order_blocks,
            "active_fvgs": self.active_fvgs,
            "last_bos": self.last_bos,
            "last_choch": self.last_choch,
            "liquidity_levels": self.liquidity_levels,
            "active_patterns": self.active_patterns,
            "key_levels": self.key_levels,
            "composite_bias": self.composite_bias.value,
            "composite_confidence": self.composite_confidence,
            "total_signals": self.total_signals,
            "bullish_count": self.bullish_count,
            "bearish_count": self.bearish_count,
        }


class StructureFusionEngine:
    """Fuses all structure-relevant signals into one unified StructureState.

    This is NOT a SignalEngine subclass — it operates on *already computed*
    QuantSignal lists from multiple engines and fuses them into a state.
    """

    def __init__(self):
        self._states: dict[str, StructureState] = {}

    def fuse(
        self,
        symbol: str,
        timeframe: str,
        signals: list[QuantSignal],
        regime_state: Optional[RegimeState] = None,
    ) -> StructureState:
        state = StructureState(
            symbol=symbol,
            timeframe=timeframe,
            timestamp=datetime.utcnow(),
        )

        if regime_state:
            state.regime = regime_state.primary
            state.regime_confidence = regime_state.confidence

        active_obs = []
        active_fvgs = []
        liquidity = []
        patterns = []
        key_levels = set()
        bullish = 0
        bearish = 0

        for sig in signals:
            if sig.confidence < 0.3:
                continue
            if sig.direction == SignalDir.BULLISH:
                bullish += 1
            elif sig.direction == SignalDir.BEARISH:
                bearish += 1

            if sig.level is not None:
                key_levels.add(round(sig.level, 4))

            meta = sig.metadata or {}

            if sig.type == SignalType.ORDER_BLOCK:
                if not meta.get("mitigated", False):
                    active_obs.append({
                        "type": meta.get("type", "unknown"),
                        "level": sig.level,
                        "direction": sig.direction.value,
                        "confidence": sig.confidence,
                        "strength": sig.strength,
                    })
            elif sig.type == SignalType.FVG:
                active_fvgs.append({
                    "top": meta.get("top"),
                    "bottom": meta.get("bottom"),
                    "direction": sig.direction.value,
                    "gap_size_pct": meta.get("gap_size_pct"),
                })
            elif sig.type == SignalType.LIQUIDITY:
                liquidity.append({
                    "level": sig.level,
                    "direction": sig.direction.value,
                })
            elif sig.type == SignalType.BOS:
                if sig.direction != SignalDir.NEUTRAL:
                    state.last_bos = {"direction": sig.direction.value, "level": sig.level, "confidence": sig.confidence}
            elif sig.type == SignalType.CHOCH:
                if sig.direction != SignalDir.NEUTRAL:
                    state.last_choch = {"direction": sig.direction.value, "level": sig.level, "confidence": sig.confidence}
            elif sig.type in (SignalType.HARMONIC, SignalType.HEAD_SHOULDERS, SignalType.FLAGS_PENNANTS,
                              SignalType.CANDLE_PATTERN):
                pattern_name = meta.get("pattern", sig.type.value)
                patterns.append({
                    "type": pattern_name,
                    "direction": sig.direction.value,
                    "confidence": sig.confidence,
                    "level": sig.level,
                })

        state.active_order_blocks = active_obs
        state.active_fvgs = active_fvgs
        state.liquidity_levels = liquidity
        state.active_patterns = patterns
        state.key_levels = sorted(key_levels)
        state.total_signals = len(signals)
        state.bullish_count = bullish
        state.bearish_count = bearish

        net = bullish - bearish
        total = max(bullish + bearish, 1)
        if bullish > bearish:
            state.composite_bias = SignalDir.BULLISH
            state.composite_confidence = bullish / total
        elif bearish > bullish:
            state.composite_bias = SignalDir.BEARISH
            state.composite_confidence = bearish / total
        else:
            state.composite_bias = SignalDir.NEUTRAL
            state.composite_confidence = 0.5

        if state.regime in (RegimeType.BULL_TREND,):
            if state.composite_bias == SignalDir.BULLISH:
                state.composite_confidence = min(state.composite_confidence + 0.1, 1.0)
        elif state.regime in (RegimeType.BEAR_TREND,):
            if state.composite_bias == SignalDir.BEARISH:
                state.composite_confidence = min(state.composite_confidence + 0.1, 1.0)

        key = f"{symbol}:{timeframe}"
        self._states[key] = state
        return state

    def get_state(self, symbol: str, timeframe: str) -> Optional[StructureState]:
        return self._states.get(f"{symbol}:{timeframe}")

    def clear(self):
        self._states.clear()
