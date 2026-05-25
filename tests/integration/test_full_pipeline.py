"""End-to-end integration test: signal pipeline → fusion → agents."""

from __future__ import annotations

from datetime import datetime

import numpy as np
import pandas as pd

from agents.hedge_fund import HedgeFundOrchestrator, WarrenBuffettAgent
from core.enums import SignalDir, SignalType
from core.types import PortfolioState, QuantSignal, RiskLimits, SignalMatrix
from signals.engine_registry import create_engine, list_engines
from signals.structure_state import StructureFusionEngine


def _make_ohlcv(n: int = 200) -> pd.DataFrame:
    dates = pd.date_range("2024-01-01", periods=n, freq="h")
    close = 100 + np.cumsum(np.random.default_rng(42).normal(0, 0.5, n))
    df = pd.DataFrame({
        "open": close - 0.2, "high": close + 0.3, "low": close - 0.3,
        "close": close, "volume": np.random.default_rng(42).poisson(1000, n),
    }, index=dates)
    df.attrs["symbol"] = "TEST"
    df.attrs["timeframe"] = "1h"
    return df


def test_signal_pipeline_to_fusion():
    """Signal engines produce signals → fused into StructureState."""
    df = _make_ohlcv()

    engines = {}
    for name in ["order_block", "fvg", "bos", "liquidity", "harmonic", "market_structure"]:
        engine = create_engine(name)
        assert engine is not None, f"Failed to create {name}"
        engines[name] = engine

    all_signals: list[QuantSignal] = []
    for name, engine in engines.items():
        sigs = engine.compute(df)
        all_signals.extend(sigs)

    assert len(all_signals) > 0, "No signals produced"

    fusor = StructureFusionEngine()
    state = fusor.fuse("TEST", "1h", all_signals)

    assert state.symbol == "TEST"
    assert state.total_signals > 0


def test_all_engines_instantiable():
    """Every engine in the registry can be created and computes without error."""
    df = _make_ohlcv(100)
    engines = list_engines()
    for name in engines:
        engine = create_engine(name)
        assert engine is not None
        sigs = engine.compute(df)
        assert isinstance(sigs, list)


def test_signal_matrix_aggregation():
    """Multiple engines' signals aggregate into a SignalMatrix."""
    df = _make_ohlcv()
    all_sigs: dict[str, list[QuantSignal]] = {}

    for name in ["order_block", "harmonic", "liquidity", "market_structure"]:
        engine = create_engine(name)
        sigs = engine.compute(df)
        all_sigs[name] = sigs

    flat = []
    for sigs in all_sigs.values():
        flat.extend(sigs)

    matrix = SignalMatrix(timestamp=datetime.utcnow())
    matrix.signals["TEST"] = flat
    matrix.composite_scores["TEST"] = 0.5

    assert matrix.get_score("TEST") == 0.5
    assert len(matrix.get_signals("TEST")) == len(flat)


def test_hedge_fund_warren_buffett_agent():
    """WarrenBuffettAgent produces signals when given a price DataFrame."""
    df = _make_ohlcv()
    sigs = [QuantSignal(
        type=SignalType.STRUCTURE,
        direction=SignalDir.BULLISH,
        strength=0.7, confidence=0.65,
        symbol="TEST", timeframe="1h",
        timestamp=datetime.utcnow(),
    )]
    matrix = SignalMatrix(timestamp=datetime.utcnow())
    matrix.signals["TEST"] = sigs
    matrix.composite_scores["TEST"] = 0.5

    portfolio = PortfolioState(cash=100000.0, positions={}, total_value=100000.0)
    agent = WarrenBuffettAgent()
    result = agent.analyze(
        tickers=["TEST"],
        portfolio=portfolio,
        signals=matrix,
        risk_limits=RiskLimits(),
        prices_df={"TEST": df},
    )

    assert "TEST" in result
    assert result["TEST"].signal in ("bullish", "bearish", "neutral")
    assert 0 <= result["TEST"].confidence <= 1


def test_hedge_fund_orchestrator():
    """HedgeFundOrchestrator runs multiple persona agents."""
    df = _make_ohlcv()
    matrix = SignalMatrix(timestamp=datetime.utcnow())
    matrix.signals["TEST"] = [
        QuantSignal(type=SignalType.STRUCTURE, direction=SignalDir.BULLISH,
                     strength=0.6, confidence=0.6, symbol="TEST", timeframe="1h",
                     timestamp=datetime.utcnow()),
    ]
    matrix.composite_scores["TEST"] = 0.3

    portfolio = PortfolioState(cash=100000.0, positions={}, total_value=100000.0)
    buffett = WarrenBuffettAgent()
    orch = HedgeFundOrchestrator(persona_agents=[buffett], max_workers=1)
    result = orch.deliberate(
        tickers=["TEST"],
        portfolio=portfolio,
        signals=matrix,
        prices_df={"TEST": df},
    )

    assert "TEST" in result
    assert "consensus" in result["TEST"]
    assert "opinions" in result["TEST"]


def test_pipeline_end_to_end():
    """Full pipeline: pattern detection → signal store → fusion → agent."""
    df = _make_ohlcv(300)

    ob = create_engine("order_block")
    fvg = create_engine("fvg")
    liq = create_engine("liquidity")

    signals = ob.compute(df) + fvg.compute(df) + liq.compute(df)

    fusor = StructureFusionEngine()
    state = fusor.fuse("TEST", "1h", signals)

    matrix = SignalMatrix(timestamp=datetime.utcnow())
    matrix.signals["TEST"] = signals
    sc = state.bullish_count - state.bearish_count
    matrix.composite_scores["TEST"] = max(-1, min(1, sc / max(state.total_signals, 1)))
    assert state.total_signals > 0

    agent = WarrenBuffettAgent()
    result = agent.analyze(
        tickers=["TEST"],
        portfolio=PortfolioState(cash=100000.0, positions={}, total_value=100000.0),
        signals=matrix,
        risk_limits=RiskLimits(),
        prices_df={"TEST": df},
    )

    assert "TEST" in result
    assert result["TEST"].signal in ("bullish", "bearish", "neutral")


def test_pipeline_with_directional_signals():
    """Full pipeline with known directional signals → agent produces output."""
    df = _make_ohlcv(100)
    now = datetime.utcnow()

    signals = [
        QuantSignal(type=SignalType.ORDER_BLOCK, direction=SignalDir.BULLISH,
                     strength=0.8, confidence=0.8, symbol="TEST", timeframe="1h",
                     timestamp=now, level=100.0),
        QuantSignal(type=SignalType.FVG, direction=SignalDir.BULLISH,
                     strength=0.7, confidence=0.7, symbol="TEST", timeframe="1h",
                     timestamp=now, level=101.0,
                     metadata={"top": 102, "bottom": 100, "gap_size_pct": 1.0}),
        QuantSignal(type=SignalType.LIQUIDITY, direction=SignalDir.BEARISH,
                     strength=0.6, confidence=0.6, symbol="TEST", timeframe="1h",
                     timestamp=now, level=105.0),
    ]

    fusor = StructureFusionEngine()
    state = fusor.fuse("TEST", "1h", signals)
    assert state.bullish_count == 2
    assert state.bearish_count == 1
    assert state.composite_bias == SignalDir.BULLISH

    matrix = SignalMatrix(timestamp=now)
    matrix.signals["TEST"] = signals
    matrix.composite_scores["TEST"] = 0.5

    agent = WarrenBuffettAgent()
    result = agent.analyze(
        tickers=["TEST"],
        portfolio=PortfolioState(cash=100000.0, positions={}, total_value=100000.0),
        signals=matrix,
        risk_limits=RiskLimits(),
        prices_df={"TEST": df},
    )

    assert "TEST" in result
    assert result["TEST"].signal in ("bullish", "bearish", "neutral")
