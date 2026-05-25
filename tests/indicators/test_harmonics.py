from __future__ import annotations

import pandas as pd

from signals.indicators.harmonics import HarmonicPatternEngine


def _make_extremes(tops_prices, bottoms_prices):
    """Build the return value of _directional_change.

    tops: list of (detect_bar, extreme_bar, price)
    bottoms: same
    The bars increase monotonically and alternate top/bottom/top/...
    """
    tops = [[i * 10 + 5, i * 10, p] for i, p in enumerate(tops_prices)]
    bottoms = [[i * 10 + 10, i * 10 + 5, p] for i, p in enumerate(bottoms_prices)]
    return tops, bottoms


def _compute_with_extremes(
    engine: HarmonicPatternEngine,
    tops_prices: list[float],
    bottoms_prices: list[float],
    monkeypatch,
) -> list:
    tops, bottoms = _make_extremes(tops_prices, bottoms_prices)
    monkeypatch.setattr(engine, "_directional_change", lambda df: (tops, bottoms))
    df = pd.DataFrame({"close": [100]})
    df.attrs["symbol"] = "TEST"
    df.attrs["timeframe"] = "1h"
    return engine.compute(df)


# Bat:   AB/XA [0.382-0.5],   BC/AB [0.382-0.886],  CD/BC [1.618-2.618]
# XA=10, AB=5, BC=3, CD=6  → ratios: 0.5, 0.6, 2.0
def test_bat_pattern_detected(monkeypatch):
    engine = HarmonicPatternEngine()
    signals = _compute_with_extremes(engine, [100, 95, 98], [90, 92], monkeypatch)
    patterns = [s.metadata.get("pattern") for s in signals]
    assert "Bat" in patterns, f"Bat not found in {patterns}"


def test_bat_pattern_ratio_boundaries_low(monkeypatch):
    _compute_with_extremes(HarmonicPatternEngine(), [100, 96.18, 105], [90, 93], monkeypatch)


def test_bat_pattern_ratio_boundaries_high(monkeypatch):
    _compute_with_extremes(HarmonicPatternEngine(), [100, 95, 107.85], [90, 93], monkeypatch)


# Gartley: AB/XA [0.618],  BC/AB [0.382-0.886],  CD/BC [1.13-1.618]
# XA=10, AB=6, BC=3, CD=5  → ratios: 0.6, 0.5, 1.67
def test_gartley_pattern_detected(monkeypatch):
    engine = HarmonicPatternEngine()
    signals = _compute_with_extremes(engine, [100, 96, 98], [90, 93], monkeypatch)
    patterns = [s.metadata.get("pattern") for s in signals]
    assert "Gartley" in patterns, f"Gartley not found in {patterns}"


# Butterfly: AB/XA [0.786],  BC/AB [0.382-0.886],  CD/BC [1.618-2.24]
# XA=10, AB=8, BC=4, CD=8  → ratios: 0.8, 0.5, 2.0
def test_butterfly_pattern_detected(monkeypatch):
    engine = HarmonicPatternEngine()
    signals = _compute_with_extremes(engine, [100, 98, 102], [90, 94], monkeypatch)
    patterns = [s.metadata.get("pattern") for s in signals]
    assert "Butterfly" in patterns, f"Butterfly not found in {patterns}"


# Crab: AB/XA [0.382-0.618],  BC/AB [0.382-0.886],  CD/BC [2.618-3.618]
# XA=10, AB=5, BC=2, CD=6  → ratios: 0.5, 0.4, 3.0
def test_crab_pattern_detected(monkeypatch):
    engine = HarmonicPatternEngine()
    signals = _compute_with_extremes(engine, [100, 95, 99], [90, 93], monkeypatch)
    patterns = [s.metadata.get("pattern") for s in signals]
    assert "Crab" in patterns, f"Crab not found in {patterns}"


# Deep Crab: AB/XA [0.886],  BC/AB [0.382-0.886],  CD/BC [2.0-3.618]
# XA=10, AB=9, BC=5, CD=10 → ratios: 0.9, 0.556, 2.0
def test_deep_crab_pattern_detected(monkeypatch):
    engine = HarmonicPatternEngine()
    signals = _compute_with_extremes(engine, [100, 99, 104], [90, 94], monkeypatch)
    patterns = [s.metadata.get("pattern") for s in signals]
    assert "DeepCrab" in patterns, f"DeepCrab not found in {patterns}"


# Cypher: AB/XA [0.382-0.618],  BC/AB [1.13-1.41],  CD/BC [1.27-2.00]
# XA=10, AB=5, BC=6, CD=9  → ratios: 0.5, 1.2, 1.5
def test_cypher_pattern_detected(monkeypatch):
    engine = HarmonicPatternEngine()
    signals = _compute_with_extremes(engine, [100, 95, 97], [90, 89], monkeypatch)
    patterns = [s.metadata.get("pattern") for s in signals]
    assert "Cypher" in patterns, f"Cypher not found in {patterns}"


# Shark: AB/XA [1.13-1.618],  BC/AB [1.618-2.24],  CD/BC [0.886-1.13]
# XA=10, AB=14, BC=16, CD=2  → ratios: 1.4, 1.14? no...
# Let me recalculate: X=100(top), A=90(bot), B=104(top), C=88(bot), D=90(top)
# XA=10, AB=14, BC=16, CD=2
# rAB_XA=1.4 ✓, rBC_AB=16/14=1.14 ✗ (needs 1.618-2.24)
def test_shark_pattern_detected(monkeypatch):
    engine = HarmonicPatternEngine()
    signals = _compute_with_extremes(engine, [100, 104, 104], [90, 80], monkeypatch)
    patterns = [s.metadata.get("pattern") for s in signals]
    assert "Shark" in patterns, f"Shark not found in {patterns}"


def test_insufficient_extremes_returns_empty():
    engine = HarmonicPatternEngine()
    df = pd.DataFrame({
        "open": [100, 101], "high": [102, 103], "low": [99, 100],
        "close": [101, 102], "volume": [1000, 1000],
    })
    df.attrs["symbol"] = "TEST"
    df.attrs["timeframe"] = "1h"
    signals = engine.compute(df)
    assert signals == []


def test_signal_type():
    engine = HarmonicPatternEngine()
    assert engine.signal_type.value == "harmonic"


def test_metadata_contains_points(monkeypatch):
    engine = HarmonicPatternEngine()
    signals = _compute_with_extremes(engine, [100, 95, 98], [90, 92], monkeypatch)
    assert len(signals) > 0
    for sig in signals:
        assert "points" in sig.metadata
        assert len(sig.metadata["points"]) == 5
