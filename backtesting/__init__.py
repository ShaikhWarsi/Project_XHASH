from .engine import BacktestEngine, BacktestResult
from .metrics import PerformanceMetrics, compute_all_metrics, calc_metrics, by_symbol_stats, by_exit_reason_stats, win_rate_and_stats, calc_bars_per_year
from .models import Position, TradeRecord, EquitySnapshot
from .monte_carlo import MonteCarloEngine
from .portfolio_manager import HedgePortfolio, PositionState
from .scenario import ScenarioEngine
from .synthetic_data import (
    GBMParams,
    MertonParams,
    RegimeSwitchingParams,
    generate_gbm,
    generate_jump_diffusion,
    generate_regime_switching,
)
from .trade_executor import TradeExecutor
from .walkforward import WalkForwardEngine
from .backtest_validation import (
    run_validation,
    monte_carlo_test as backtest_monte_carlo,
    bootstrap_sharpe_ci as backtest_bootstrap_sharpe_ci,
    walk_forward_analysis,
)
from .benchmark import resolve_benchmark, BenchmarkResult
from .run_card import write_run_card
from .market_engines import (
    BaseEngine,
    ChinaAEngine,
    CryptoEngine,
    ForexEngine,
    GlobalEquityEngine,
    FuturesBaseEngine,
    ChinaFuturesEngine,
    GlobalFuturesEngine,
    CompositeEngine,
)

__all__ = [
    "BacktestEngine",
    "BacktestResult",
    "PerformanceMetrics",
    "compute_all_metrics",
    "calc_metrics",
    "by_symbol_stats",
    "by_exit_reason_stats",
    "win_rate_and_stats",
    "calc_bars_per_year",
    "Position",
    "TradeRecord",
    "EquitySnapshot",
    "HedgePortfolio",
    "PositionState",
    "TradeExecutor",
    "WalkForwardEngine",
    "MonteCarloEngine",
    "ScenarioEngine",
    "GBMParams",
    "MertonParams",
    "RegimeSwitchingParams",
    "generate_gbm",
    "generate_jump_diffusion",
    "generate_regime_switching",
    "run_validation",
    "backtest_monte_carlo",
    "backtest_bootstrap_sharpe_ci",
    "walk_forward_analysis",
    "resolve_benchmark",
    "BenchmarkResult",
    "write_run_card",
    "BaseEngine",
    "ChinaAEngine",
    "CryptoEngine",
    "ForexEngine",
    "GlobalEquityEngine",
    "FuturesBaseEngine",
    "ChinaFuturesEngine",
    "GlobalFuturesEngine",
    "CompositeEngine",
]
