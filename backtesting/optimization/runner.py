from __future__ import annotations

import copy
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional

from backtesting.optimization.scoring import StrategyScoringService
from backtesting.optimization.prompts import (
    SYSTEM_PROMPT,
    build_round_prompt,
    extract_indicator_params,
    parse_llm_candidates,
)

logger = logging.getLogger(__name__)

DEFAULT_MAX_ROUNDS = 3
DEFAULT_CANDIDATES_PER_ROUND = 5
EARLY_STOP_SCORE = 82.0


class ExperimentRunnerService:
    def __init__(
        self,
        scoring_service: Optional[StrategyScoringService] = None,
    ):
        self.scoring_service = scoring_service or StrategyScoringService()

    def _scorer_for_payload(self, payload: Dict[str, Any]) -> StrategyScoringService:
        scoring_cfg = (payload or {}).get("scoring") or {}
        custom = scoring_cfg.get("customWeights")
        if isinstance(custom, dict) and custom:
            return StrategyScoringService(custom_weights=custom)
        return self.scoring_service

    def detect_regime(self, base: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            from signals.regime.market_regime import MarketRegimeService
            import pandas as pd
            from data.registry import ProviderRegistry
            from core.enums import Timeframe

            symbol = base.get("symbol", "SPY")
            market = base.get("market", "USStock")
            timeframe = base.get("timeframe", "1d")

            provider = ProviderRegistry.get("yfinance")
            if not provider:
                return None

            tf = Timeframe(timeframe) if hasattr(Timeframe, timeframe) else Timeframe("1d")
            end = datetime.utcnow()
            start = end - timedelta(days=180)
            bars = provider.fetch_bars(symbol=symbol, timeframe=tf, start=start, end=end)

            if bars is None or bars.empty:
                return None

            service = MarketRegimeService()
            return service.detect(bars, symbol=symbol, market=market, timeframe=timeframe)
        except Exception as e:
            logger.warning("Regime detection failed: %s", e)
            return None

    def _compute_oos_window(self, start_date: str, end_date: str) -> Optional[Dict[str, str]]:
        try:
            start = datetime.fromisoformat(start_date) if isinstance(start_date, str) else start_date
            end = datetime.fromisoformat(end_date) if isinstance(end_date, str) else end_date
            total = (end - start).days
            if total < 60:
                return None
            split = start + timedelta(days=int(total * 0.7))
            return {
                "train_start": start_date,
                "train_end": split.isoformat(),
                "oos_start": split.isoformat(),
                "oos_end": end_date,
            }
        except Exception as e:
            logger.warning("Failed to compute train/test split: %s", e)
            return None

    def _build_snapshot(self, base: Dict[str, Any], user_id: int) -> Dict[str, Any]:
        return {
            "code": base.get("indicator_code", ""),
            "symbol": base.get("symbol", "SPY"),
            "market": base.get("market", "USStock"),
            "timeframe": base.get("timeframe", "1d"),
            "initial_capital": base.get("initial_capital", 1_000_000.0),
            "commission": base.get("commission", 0.001),
        }

    def _apply_candidate_to_snapshot(
        self, snapshot: Dict[str, Any], candidate: Dict[str, Any], indicator_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        new_snap = copy.deepcopy(snapshot)
        new_snap["params"] = candidate.get("params", {})
        new_snap["candidate_name"] = candidate.get("name", "unknown")
        return new_snap

    def _emit(self, on_progress: Optional[Callable], phase: str, data: Dict[str, Any]):
        if on_progress:
            on_progress({"phase": phase, **data})

    def run_ai_pipeline(
        self,
        *,
        user_id: int,
        payload: Dict[str, Any],
        on_progress: Optional[Callable[[Dict[str, Any]], None]] = None,
    ) -> Dict[str, Any]:
        base = payload.get("base") or payload
        max_rounds = int(payload.get("maxRounds") or DEFAULT_MAX_ROUNDS)
        n_per_round = int(payload.get("candidatesPerRound") or DEFAULT_CANDIDATES_PER_ROUND)
        early_stop = float(payload.get("earlyStopScore") or EARLY_STOP_SCORE)
        scorer = self._scorer_for_payload(payload)

        snapshot = self._build_snapshot(base=base, user_id=user_id)
        indicator_code = snapshot.get("code") or ""
        indicator_params = extract_indicator_params(indicator_code)

        start_date = base.get("start_date")
        end_date = base.get("end_date") or datetime.utcnow().isoformat()

        oos_enabled_input = payload.get("oosValidation", True)
        oos_window = self._compute_oos_window(start_date, end_date) if oos_enabled_input and start_date else None
        if oos_window is not None:
            train_start, train_end = oos_window["train_start"], oos_window["train_end"]
            oos_start, oos_end = oos_window["oos_start"], oos_window["oos_end"]
        else:
            train_start, train_end = start_date, end_date
            oos_start = oos_end = None

        self._emit(on_progress, "regime", {"status": "running"})
        try:
            regime = self.detect_regime(base)
        except Exception as exc:
            logger.warning("Regime detection failed: %s", exc)
            regime = None
        self._emit(on_progress, "regime", {"status": "done", "regime": regime})

        try:
            from llm.client import LLMClient
            llm = LLMClient()
        except Exception as e:
            logger.error("LLM client not available: %s", e)
            return {"error": "LLM client not available", "rounds": [], "regime": regime}

        all_rounds: List[Dict[str, Any]] = []
        global_best_score = -1.0
        previous_results: Optional[List[Dict[str, Any]]] = None

        for round_num in range(1, max_rounds + 1):
            round_start = time.time()
            self._emit(on_progress, "round_start", {
                "round": round_num,
                "maxRounds": max_rounds,
                "status": "running",
            })

            prompt = build_round_prompt(
                indicator_code=indicator_code,
                indicator_params=indicator_params,
                regime=regime,
                previous_results=previous_results,
                round_number=round_num,
                n_candidates=n_per_round,
            )

            try:
                raw_response = llm.generate_structured(
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.7 + round_num * 0.05,
                )
                if isinstance(raw_response, str):
                    candidates_raw = parse_llm_candidates(raw_response)
                else:
                    candidates_raw = raw_response if isinstance(raw_response, list) else []
            except Exception as exc:
                logger.error("LLM call failed round %d: %s", round_num, exc)
                candidates_raw = []

            if not candidates_raw:
                logger.warning("Round %d produced no candidates", round_num)
                all_rounds.append({"round": round_num, "candidates": [], "bestScore": global_best_score})
                continue

            round_ranked: List[Dict[str, Any]] = []
            n_cand = len(candidates_raw)
            for idx, cand in enumerate(candidates_raw, start=1):
                self._emit(on_progress, "candidate_backtest", {
                    "round": round_num, "index": idx, "total": n_cand,
                })

                cand_snapshot = self._apply_candidate_to_snapshot(snapshot, cand, indicator_params)
                try:
                    from backtesting.engine import BacktestEngine
                    import pandas as pd
                    from data.registry import ProviderRegistry
                    from core.enums import Timeframe

                    provider = ProviderRegistry.get("yfinance")
                    tf = Timeframe(base.get("timeframe", "1d"))
                    start = datetime.fromisoformat(train_start) if train_start else datetime(2020, 1, 1)
                    end = datetime.fromisoformat(train_end) if train_end else datetime.utcnow()
                    sym = cand_snapshot.get("symbol", "SPY")
                    bars = provider.fetch_bars(symbol=sym, timeframe=tf, start=start, end=end)

                    if bars is None or bars.empty:
                        continue

                    engine = BacktestEngine(
                        initial_capital=cand_snapshot.get("initial_capital", 1_000_000.0),
                        commission=cand_snapshot.get("commission", 0.001),
                    )

                    def dummy_strategy(data):
                        return data

                    result = engine.run(dummy_strategy, bars)
                    result_dict = {
                        "total_return": result.total_return,
                        "annualized_return": result.annualized_return,
                        "sharpe_ratio": result.sharpe_ratio,
                        "max_drawdown": result.max_drawdown,
                        "win_rate": result.win_rate,
                        "profit_factor": result.profit_factor,
                        "total_trades": result.total_trades,
                        "equity_curve": result.equity_curve,
                    }
                except Exception as exc:
                    logger.error("Backtest failed for %s: %s", cand.get("name"), exc)
                    result_dict = {}

                score = scorer.score_result(result_dict, regime=regime)
                round_ranked.append({
                    "name": cand.get("name", f"candidate_{idx}"),
                    "params": cand.get("params", {}),
                    "reasoning": cand.get("reasoning", ""),
                    "score": score,
                    "result": result_dict,
                })

            round_ranked.sort(key=lambda x: x["score"]["overallScore"], reverse=True)
            for rank, item in enumerate(round_ranked, 1):
                item["rank"] = rank

            round_best = round_ranked[0]["score"]["overallScore"] if round_ranked else -1
            if round_best > global_best_score:
                global_best_score = round_best

            all_rounds.append({
                "round": round_num,
                "candidates": round_ranked,
                "bestScore": round_best,
                "duration_ms": int((time.time() - round_start) * 1000),
            })

            previous_results = [
                {"params": c["params"], "score": c["score"]["overallScore"]}
                for c in round_ranked[:3]
            ]

            self._emit(on_progress, "round_complete", {
                "round": round_num,
                "bestScore": round_best,
                "candidates_tested": len(round_ranked),
            })

            if round_best >= early_stop:
                logger.info("Early stop at round %d (score %.1f >= %.1f)", round_num, round_best, early_stop)
                self._emit(on_progress, "early_stop", {"round": round_num, "score": round_best})
                break

        result_rounds = all_rounds
        best_round = max(result_rounds, key=lambda r: r["bestScore"]) if result_rounds else {}
        best_candidate = None
        if best_round:
            candidates = best_round.get("candidates", [])
            if candidates:
                best_candidate = candidates[0]

        return {
            "status": "completed",
            "regime": regime,
            "rounds": result_rounds,
            "bestCandidate": best_candidate,
            "bestScore": global_best_score,
            "totalRounds": len(result_rounds),
        }
