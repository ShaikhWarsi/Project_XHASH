from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class OptunaOptimizer:
    def __init__(self, n_trials: int = 50, direction: str = "maximize", study_name: str = "hyperopt"):
        self.n_trials = n_trials
        self.direction = direction
        self.study_name = study_name
        self.study = None

    def optimize(self, search_space: dict[str, Any], objective_fn: callable) -> dict:
        import optuna

        self.study = optuna.create_study(
            direction=self.direction,
            study_name=self.study_name,
            storage=None,
            load_if_exists=False,
        )

        def _objective(trial: optuna.Trial) -> float:
            params = self._sample_params(trial, search_space)
            return objective_fn(params)

        self.study.optimize(_objective, n_trials=self.n_trials)

        return {
            "best_params": self.study.best_params,
            "best_value": self.study.best_value,
            "n_trials": len(self.study.trials),
            "study_name": self.study.study_name,
        }

    def _sample_params(self, trial, space: dict) -> dict:
        params = {}
        for name, spec in space.items():
            typ = spec.get("type", "float")
            if typ == "float":
                params[name] = trial.suggest_float(
                    name,
                    spec["low"],
                    spec["high"],
                    log=spec.get("log", False),
                )
            elif typ == "int":
                params[name] = trial.suggest_int(name, spec["low"], spec["high"])
            elif typ == "categorical":
                params[name] = trial.suggest_categorical(name, spec["choices"])
            elif typ == "loguniform":
                params[name] = trial.suggest_float(
                    name, spec["low"], spec["high"], log=True
                )
        return params

    @staticmethod
    def default_strategy_space() -> dict:
        return {
            "sma_fast": {"type": "int", "low": 5, "high": 50},
            "sma_slow": {"type": "int", "low": 20, "high": 200},
            "rsi_oversold": {"type": "int", "low": 20, "high": 40},
            "rsi_overbought": {"type": "int", "low": 60, "high": 80},
            "stop_loss_pct": {"type": "float", "low": 0.01, "high": 0.05},
            "take_profit_pct": {"type": "float", "low": 0.02, "high": 0.10},
        }

    @staticmethod
    def run_sma_cross_backtest(symbol: str, params: dict) -> float:
        try:
            import yfinance as yf
            import pandas as pd

            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="1y")
            if hist.empty:
                return -1.0

            fast = round(params.get("sma_fast", 20))
            slow = round(params.get("sma_slow", 50))
            hist["sma_fast"] = hist["Close"].rolling(fast).mean()
            hist["sma_slow"] = hist["Close"].rolling(slow).mean()
            hist["signal"] = 0
            hist.loc[hist["sma_fast"] > hist["sma_slow"], "signal"] = 1
            hist["position"] = hist["signal"].diff()
            hist["return"] = hist["Close"].pct_change() * hist["signal"].shift(1)
            total_return = float(hist["return"].sum())
            sharpe = float(hist["return"].mean() / hist["return"].std() * (252 ** 0.5)) if hist["return"].std() > 0 else 0
            return sharpe
        except Exception as e:
            logger.warning("Backtest failed: %s", e)
            return -1.0

    @staticmethod
    def run_multi_timeframe_backtest(symbol: str, params: dict, timeframes: list[str]) -> dict:
        results = {}
        for tf in timeframes:
            try:
                import yfinance as yf
                ticker = yf.Ticker(symbol)
                period_map = {"1d": "3mo", "1wk": "1y", "1mo": "2y"}
                hist = ticker.history(period=period_map.get(tf, "1y"))
                if hist.empty:
                    results[tf] = {"return": 0, "sharpe": 0}
                    continue
                fast = round(params.get("sma_fast", 20))
                slow = round(params.get("sma_slow", 50))
                fast = min(fast, len(hist) // 2)
                slow = min(slow, len(hist) // 2)
                hist["sma_fast"] = hist["Close"].rolling(fast).mean()
                hist["sma_slow"] = hist["Close"].rolling(slow).mean()
                hist["signal"] = 0
                hist.loc[hist["sma_fast"] > hist["sma_slow"], "signal"] = 1
                hist["return"] = hist["Close"].pct_change() * hist["signal"].shift(1)
                total_return = float(hist["return"].sum())
                sharpe = float(hist["return"].mean() / hist["return"].std() * (252 ** 0.5)) if hist["return"].std() > 0 else 0
                results[tf] = {"return": round(total_return * 100, 2), "sharpe": round(sharpe, 3), "trades": int(round(hist["signal"].diff().abs().sum()))}
            except Exception as e:
                results[tf] = {"error": str(e)}
        return results

    @staticmethod
    def compute_composite_score(mtf_results: dict[str, dict]) -> float:
        scores = []
        for tf, r in mtf_results.items():
            if "error" in r:
                continue
            s = r.get("sharpe", 0)
            if s > 0:
                scores.append(min(s, 3.0) / 3.0)
            else:
                scores.append(max(s, -3.0) / 3.0)
        return sum(scores) / len(scores) if scores else 0.0
