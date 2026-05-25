from __future__ import annotations

import logging
import time
from typing import Any, Callable

import pandas as pd
import yfinance as yf

from .regime import MarketRegimeService
from .scoring import StrategyScoringService
from .evolution import StrategyEvolutionService
from .optimizers import make_optimizer

logger = logging.getLogger(__name__)

DEFAULT_MAX_ROUNDS = 3
DEFAULT_CANDIDATES_PER_ROUND = 5
EARLY_STOP_SCORE = 82.0


class ExperimentRunnerService:
    def __init__(self, llm_service=None):
        self.regime_detector = MarketRegimeService()
        self.evolution_service = StrategyEvolutionService()

    def run_pipeline(
        self,
        symbol: str,
        parameter_space: dict[str, Any],
        method: str = "grid",
        max_variants: int = 50,
        scoring_weights: dict[str, float] | None = None,
        on_progress: Callable | None = None,
    ) -> dict[str, Any]:
        start = time.monotonic()

        def _progress(phase: str, data: Any = None):
            if on_progress:
                on_progress(phase, data)

        _progress("regime")
        regime = self.regime_detector.detect(symbol)
        _progress("regime_done", regime)

        _progress("build_variants")
        variants = self.evolution_service.build_variants(parameter_space, method, max_variants)
        _progress("variants_built", {"count": len(variants)})

        results = []
        scorer = StrategyScoringService(scoring_weights, regime=regime["regime"])
        for i, variant in enumerate(variants):
            _progress("candidate_backtest", {"index": i, "total": len(variants), "variant": variant})

            metrics = self._run_backtest(symbol, variant)
            if metrics is None:
                continue

            score_result = scorer.score(metrics)
            results.append({
                "params": variant,
                "metrics": metrics,
                "score": score_result,
            })

            _progress("candidate_scored", {"index": i, "score": score_result["overall"]})

        results.sort(key=lambda r: r["score"]["overall"], reverse=True)

        return {
            "status": "ok",
            "symbol": symbol,
            "regime": regime,
            "method": method,
            "n_variants_tested": len(results),
            "n_skipped": len(variants) - len(results),
            "ranking": results[:20],
            "best": results[0] if results else None,
            "wall_seconds": round(time.monotonic() - start, 2),
            "scoring_weights": scorer.weights,
        }

    def run_ai_pipeline(
        self,
        symbol: str,
        base_params: dict[str, Any],
        parameter_space: dict[str, Any],
        max_rounds: int = DEFAULT_MAX_ROUNDS,
        candidates_per_round: int = DEFAULT_CANDIDATES_PER_ROUND,
        scoring_weights: dict[str, float] | None = None,
        on_progress: Callable | None = None,
    ) -> dict[str, Any]:
        start = time.monotonic()

        def _progress(phase: str, data: Any = None):
            if on_progress:
                on_progress(phase, data)

        _progress("regime")
        regime = self.regime_detector.detect(symbol)
        _progress("regime_done", regime)

        scorer = StrategyScoringService(scoring_weights, regime=regime["regime"])
        all_ranked: list[dict] = []
        global_best_score = 0.0

        for round_num in range(max_rounds):
            _progress("round_start", {"round": round_num + 1, "max_rounds": max_rounds})

            variants = self._generate_candidates(base_params, parameter_space, candidates_per_round, round_num, all_ranked)
            _progress("candidates_generated", {"round": round_num + 1, "count": len(variants)})

            round_results = []
            for i, variant in enumerate(variants):
                _progress("candidate_backtest", {"round": round_num + 1, "index": i, "total": len(variants), "variant": variant})

                metrics = self._run_backtest(symbol, variant)
                if metrics is None:
                    continue

                score_result = scorer.score(metrics)
                round_results.append({
                    "params": variant,
                    "metrics": metrics,
                    "score": score_result,
                })

                _progress("candidate_scored", {"round": round_num + 1, "index": i, "score": score_result["overall"]})

            round_results.sort(key=lambda r: r["score"]["overall"], reverse=True)
            all_ranked.extend(round_results)

            if round_results:
                best_in_round = round_results[0]["score"]["overall"]
                global_best_score = max(global_best_score, best_in_round)

            _progress("round_done", {"round": round_num + 1, "best_score": best_in_round if round_results else 0})

            if global_best_score >= EARLY_STOP_SCORE:
                _progress("early_stop", {"score": global_best_score})
                break

        all_ranked.sort(key=lambda r: r["score"]["overall"], reverse=True)

        return {
            "status": "ok",
            "symbol": symbol,
            "regime": regime,
            "rounds_completed": round_num + 1,
            "n_candidates_tested": len(all_ranked),
            "ranking": all_ranked[:20],
            "best": all_ranked[0] if all_ranked else None,
            "wall_seconds": round(time.monotonic() - start, 2),
            "scoring_weights": scorer.weights,
        }

    def _generate_candidates(
        self,
        base_params: dict[str, Any],
        parameter_space: dict[str, Any],
        count: int,
        round_num: int,
        history: list[dict],
    ) -> list[dict[str, Any]]:
        import random

        candidates = []
        param_names = list(parameter_space.keys())

        for _ in range(count):
            variant = dict(base_params)
            for key, spec in parameter_space.items():
                if isinstance(spec, list):
                    variant[key] = random.choice(spec)
                elif isinstance(spec, dict):
                    if "values" in spec:
                        variant[key] = random.choice(spec["values"])
                    elif "min" in spec and "max" in spec:
                        sigma = 0.3 * (1 - round_num / 10)
                        if history and random.random() < 0.6:
                            best = history[0]["params"]
                            base = best.get(key, (spec["min"] + spec["max"]) / 2)
                            val = base + random.gauss(0, sigma) * (spec["max"] - spec["min"])
                        else:
                            val = random.uniform(spec["min"], spec["max"])
                        variant[key] = max(spec["min"], min(spec["max"], round(val, 4)))
                else:
                    variant[key] = spec
            candidates.append(variant)

        return candidates

    def _run_backtest(self, symbol: str, params: dict[str, Any]) -> dict[str, Any] | None:
        try:
            df = yf.download(symbol, period="6mo", interval="1d", progress=False)
            if df.empty or len(df) < 20:
                return None
            close = df["Close"].squeeze()

            sma_fast = close.rolling(window=int(params.get("fast_ma", 20))).mean()
            sma_slow = close.rolling(window=int(params.get("slow_ma", 50))).mean()

            position = 0
            trades = []
            entry_price = 0
            for i in range(1, len(close)):
                if sma_fast.iloc[i] > sma_slow.iloc[i] and sma_fast.iloc[i - 1] <= sma_slow.iloc[i - 1]:
                    if position == 0:
                        position = 1
                        entry_price = close.iloc[i]
                elif sma_fast.iloc[i] < sma_slow.iloc[i] and sma_fast.iloc[i - 1] >= sma_slow.iloc[i - 1]:
                    if position == 1:
                        pnl = (close.iloc[i] - entry_price) / entry_price * 100
                        trades.append(pnl)
                        position = 0
                    elif position == -1:
                        pnl = (entry_price - close.iloc[i]) / entry_price * 100
                        trades.append(pnl)
                        position = 0
                elif position == 0 and params.get("short", False):
                    if sma_fast.iloc[i] < sma_slow.iloc[i] and sma_fast.iloc[i - 1] >= sma_slow.iloc[i - 1]:
                        position = -1
                        entry_price = close.iloc[i]

            if position != 0:
                pnl = (close.iloc[-1] - entry_price) / entry_price * 100 * (1 if position == 1 else -1)
                trades.append(pnl)

            if not trades:
                return None

            returns = pd.Series(trades)
            total_return = float(returns.sum())
            n_trades = len(trades)
            win_rate = float((returns > 0).mean() * 100)
            avg_win = float(returns[returns > 0].mean()) if (returns > 0).any() else 0
            avg_loss = float(abs(returns[returns < 0].mean())) if (returns < 0).any() else 1
            profit_factor = avg_win / avg_loss if avg_loss > 0 else 0
            sharpe = float(returns.mean() / returns.std() * 16) if returns.std() > 0 else 0
            max_dd = float((returns.cumsum().cummax() - returns.cumsum()).max())
            stability = float(min(1.0, max(0, 1 - returns.std() / max(0.01, abs(returns.mean())))))

            return {
                "total_return": round(total_return, 2),
                "annual_return": round(total_return * 2, 2),
                "sharpe_ratio": round(sharpe, 3),
                "profit_factor": round(profit_factor, 3),
                "win_rate": round(win_rate, 1),
                "max_drawdown": round(max_dd, 2),
                "total_trades": n_trades,
                "stability": round(stability, 3),
            }
        except Exception as e:
            logger.warning("Backtest failed for %s: %s", symbol, e)
            return None
