from __future__ import annotations

from datetime import datetime

from core.enums import RegimeType, SignalDir, SignalType
from core.types import QuantSignal, RegimeState
from signals.structure_state import StructureFusionEngine, StructureState


def _sig(
    direction: SignalDir,
    signal_type: SignalType,
    confidence: float = 0.8,
    strength: float = 0.7,
    level: float | None = None,
    metadata: dict | None = None,
) -> QuantSignal:
    return QuantSignal(
        type=signal_type,
        direction=direction,
        strength=strength,
        confidence=confidence,
        symbol="TEST",
        timeframe="1h",
        timestamp=datetime.utcnow(),
        level=level,
        metadata=metadata or {},
    )


class TestStructureState:
    def test_defaults(self):
        state = StructureState(symbol="TEST", timeframe="1h", timestamp=datetime.utcnow())
        assert state.trend_direction == SignalDir.NEUTRAL
        assert state.regime == RegimeType.RANGE_BOUND
        assert state.composite_bias == SignalDir.NEUTRAL
        assert state.active_order_blocks == []

    def test_to_dict(self):
        ts = datetime(2024, 1, 15, 12, 0, 0)
        state = StructureState(symbol="TEST", timeframe="1h", timestamp=ts)
        d = state.to_dict()
        assert d["symbol"] == "TEST"
        assert d["timeframe"] == "1h"
        assert d["timestamp"] == "2024-01-15T12:00:00"
        assert d["trend_direction"] == 0  # SignalDir.NEUTRAL.value


class TestStructureFusionEngine:
    def test_fuse_with_empty_signals(self):
        engine = StructureFusionEngine()
        state = engine.fuse("TEST", "1h", [])
        assert state.symbol == "TEST"
        assert state.timeframe == "1h"
        assert state.total_signals == 0
        assert state.composite_bias == SignalDir.NEUTRAL

    def test_fuse_bullish_bias(self):
        engine = StructureFusionEngine()
        signals = [
            _sig(SignalDir.BULLISH, SignalType.ORDER_BLOCK, level=100.0),
            _sig(SignalDir.BULLISH, SignalType.FVG, level=101.0,
                 metadata={"top": 102, "bottom": 100, "gap_size_pct": 1.0}),
            _sig(SignalDir.BEARISH, SignalType.LIQUIDITY, level=105.0),
        ]
        state = engine.fuse("TEST", "1h", signals)
        assert state.composite_bias == SignalDir.BULLISH
        assert state.bullish_count == 2
        assert state.bearish_count == 1

    def test_fuse_bearish_bias(self):
        engine = StructureFusionEngine()
        signals = [
            _sig(SignalDir.BEARISH, SignalType.ORDER_BLOCK, level=100.0),
            _sig(SignalDir.BEARISH, SignalType.LIQUIDITY, level=105.0),
            _sig(SignalDir.BULLISH, SignalType.FVG, level=101.0,
                 metadata={"top": 102, "bottom": 100, "gap_size_pct": 1.0}),
        ]
        state = engine.fuse("TEST", "1h", signals)
        assert state.composite_bias == SignalDir.BEARISH

    def test_fuse_neutral_bias(self):
        engine = StructureFusionEngine()
        signals = [
            _sig(SignalDir.BULLISH, SignalType.ORDER_BLOCK, level=100.0),
            _sig(SignalDir.BEARISH, SignalType.LIQUIDITY, level=105.0),
        ]
        state = engine.fuse("TEST", "1h", signals)
        assert state.composite_bias == SignalDir.NEUTRAL
        assert state.composite_confidence == 0.5

    def test_fuse_with_regime_boosts_confidence(self):
        engine = StructureFusionEngine()
        signals = [
            _sig(SignalDir.BULLISH, SignalType.ORDER_BLOCK, level=100.0),
            _sig(SignalDir.BEARISH, SignalType.LIQUIDITY, level=105.0),
        ]
        regime = RegimeState(primary=RegimeType.BULL_TREND, confidence=0.7)
        state = engine.fuse("TEST", "1h", signals, regime_state=regime)
        assert state.regime == RegimeType.BULL_TREND
        assert state.composite_bias == SignalDir.NEUTRAL
        assert state.composite_confidence == 0.5

    def test_regime_boosts_matching_bias(self):
        engine = StructureFusionEngine()
        signals = [
            _sig(SignalDir.BULLISH, SignalType.ORDER_BLOCK, level=100.0),
            _sig(SignalDir.BULLISH, SignalType.LIQUIDITY, level=105.0),
        ]
        regime = RegimeState(primary=RegimeType.BULL_TREND, confidence=0.8)
        state = engine.fuse("TEST", "1h", signals, regime_state=regime)
        assert state.composite_bias == SignalDir.BULLISH
        assert state.composite_confidence > 1.0 / 2

    def test_low_confidence_signals_filtered(self):
        engine = StructureFusionEngine()
        signals = [
            _sig(SignalDir.BULLISH, SignalType.ORDER_BLOCK, confidence=0.1, level=100.0),
            _sig(SignalDir.BULLISH, SignalType.ORDER_BLOCK, confidence=0.9, level=101.0),
        ]
        state = engine.fuse("TEST", "1h", signals)
        assert state.bullish_count == 1

    def test_order_blocks_categorized(self):
        engine = StructureFusionEngine()
        signals = [
            _sig(SignalDir.BULLISH, SignalType.ORDER_BLOCK, level=100.0, metadata={"type": "breaker"}),
            _sig(SignalDir.BEARISH, SignalType.ORDER_BLOCK, level=102.0, metadata={"mitigated": True}),
        ]
        state = engine.fuse("TEST", "1h", signals)
        assert len(state.active_order_blocks) == 1
        assert state.active_order_blocks[0]["type"] == "breaker"

    def test_fvgs_categorized(self):
        engine = StructureFusionEngine()
        signals = [
            _sig(SignalDir.BULLISH, SignalType.FVG, level=100.0,
                 metadata={"top": 102, "bottom": 100, "gap_size_pct": 1.0}),
        ]
        state = engine.fuse("TEST", "1h", signals)
        assert len(state.active_fvgs) == 1

    def test_liquidity_categorized(self):
        engine = StructureFusionEngine()
        signals = [
            _sig(SignalDir.BULLISH, SignalType.LIQUIDITY, level=105.0),
        ]
        state = engine.fuse("TEST", "1h", signals)
        assert len(state.liquidity_levels) == 1

    def test_bos_and_choch_recorded(self):
        engine = StructureFusionEngine()
        signals = [
            _sig(SignalDir.BULLISH, SignalType.BOS, level=100.0),
            _sig(SignalDir.BEARISH, SignalType.CHOCH, level=95.0),
        ]
        state = engine.fuse("TEST", "1h", signals)
        assert state.last_bos["direction"] == 1  # SignalDir.BULLISH.value
        assert state.last_choch["direction"] == -1  # SignalDir.BEARISH.value

    def test_neutral_bos_ignored(self):
        engine = StructureFusionEngine()
        signals = [
            _sig(SignalDir.NEUTRAL, SignalType.BOS, level=100.0),
        ]
        state = engine.fuse("TEST", "1h", signals)
        assert state.last_bos is None

    def test_pattern_signals_categorized(self):
        engine = StructureFusionEngine()
        signals = [
            _sig(SignalDir.BULLISH, SignalType.HARMONIC, level=100.0, metadata={"pattern": "Bat"}),
            _sig(SignalDir.BEARISH, SignalType.HEAD_SHOULDERS, level=105.0),
            _sig(SignalDir.BULLISH, SignalType.CANDLE_PATTERN, level=101.0, metadata={"pattern": "Engulfing"}),
        ]
        state = engine.fuse("TEST", "1h", signals)
        assert len(state.active_patterns) == 3
        assert state.active_patterns[0]["type"] == "Bat"

    def test_key_levels_aggregated(self):
        engine = StructureFusionEngine()
        signals = [
            _sig(SignalDir.BULLISH, SignalType.ORDER_BLOCK, level=100.0),
            _sig(SignalDir.BEARISH, SignalType.LIQUIDITY, level=101.0),
            _sig(SignalDir.BULLISH, SignalType.ORDER_BLOCK, level=100.0),
        ]
        state = engine.fuse("TEST", "1h", signals)
        assert sorted(state.key_levels) == [100.0, 101.0]

    def test_get_state_returns_none_for_missing(self):
        engine = StructureFusionEngine()
        state = engine.get_state("MISSING", "1h")
        assert state is None

    def test_get_state_after_fuse(self):
        engine = StructureFusionEngine()
        engine.fuse("TEST", "1h", [])
        state = engine.get_state("TEST", "1h")
        assert state is not None
        assert state.symbol == "TEST"

    def test_clear(self):
        engine = StructureFusionEngine()
        engine.fuse("TEST", "1h", [])
        engine.clear()
        assert engine.get_state("TEST", "1h") is None
