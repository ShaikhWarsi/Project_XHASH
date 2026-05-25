from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

HAS_ALPHALENS = False
try:
    import alphalens as al

    HAS_ALPHALENS = True
except ImportError:
    al: Any = None


class FactorAnalysis:
    def __init__(
        self,
        prices: pd.DataFrame,
        quantities: Optional[pd.DataFrame] = None,
        groupby: Optional[pd.Series] = None,
    ):
        if not HAS_ALPHALENS:
            raise ImportError("alphalens is required. Install: pip install trading-engine[factors]")
        self.prices = prices
        self.quantities = quantities
        self.groupby = groupby
        self._validate_inputs()

    def _validate_inputs(self):
        if self.prices.empty:
            raise ValueError("Prices DataFrame cannot be empty")
        if not isinstance(self.prices.index, pd.DatetimeIndex):
            raise ValueError("Prices must have DatetimeIndex")

    def analyze(
        self,
        factor_data: pd.Series,
        periods: Tuple[int, ...] = (1, 5, 21),
        quantiles: int = 5,
        groups: Optional[int] = None,
        groupby_labels: Optional[Dict[int, str]] = None,
        bins: Optional[int] = None,
        max_loss: float = 0.35,
        zero_aware: bool = False,
    ) -> Dict[str, Any]:
        clean_data = al.utils.get_clean_factor_and_forward_returns(
            factor=factor_data,
            prices=self.prices,
            periods=periods,
            quantiles=quantiles,
            bins=bins,
            groupby=self.groupby if groups else None,
            groupby_labels=groupby_labels,
            max_loss=max_loss,
            zero_aware=zero_aware,
        )

        ic = al.performance.factor_information_coefficient(clean_data)
        quantile_stats = al.performance.mean_return_by_quantile(clean_data)
        ic_series = al.performance.mean_information_coefficient(
            clean_data, by_time=False
        )

        q_returns, q_std = quantile_stats

        top_quantile = q_returns.iloc[-1] if len(q_returns) > 0 else None
        bottom_quantile = q_returns.iloc[0] if len(q_returns) > 0 else None
        spread = (
            (top_quantile - bottom_quantile).iloc[0] if top_quantile is not None and bottom_quantile is not None else None
        )

        results = {
            "ic_series": ic,
            "quantile_returns": q_returns,
            "mean_ic": float(ic_series.iloc[0]) if len(ic_series) > 0 else 0.0,
            "ic_std": float(ic_series.iloc[1]) if len(ic_series) > 1 else 0.0,
            "ic_ir": float(ic_series.iloc[0] / ic_series.iloc[1]) if len(ic_series) > 1 and ic_series.iloc[1] != 0 else 0.0,
            "spread_return": spread,
            "factor_data": clean_data,
            "periods": periods,
        }

        try:
            turnover = al.performance.quantile_turnover(clean_data, quantile=1)
            results["turnover"] = turnover
        except Exception:
            results["turnover"] = pd.DataFrame()

        return results

    def ic_analysis(self, factor_data: pd.Series, **kwargs) -> pd.DataFrame:
        clean = al.utils.get_clean_factor_and_forward_returns(
            factor=factor_data,
            prices=self.prices,
            **kwargs,
        )
        ic = al.performance.factor_information_coefficient(clean)
        return ic

    def quantile_analysis(
        self,
        factor_data: pd.Series,
        quantiles: int = 5,
        periods: Tuple[int, ...] = (1, 5, 21),
        **kwargs,
    ) -> Dict[str, pd.DataFrame]:
        clean = al.utils.get_clean_factor_and_forward_returns(
            factor=factor_data,
            prices=self.prices,
            periods=periods,
            quantiles=quantiles,
            **kwargs,
        )
        mean_ret, std_ret = al.performance.mean_return_by_quantile(clean)
        return {"mean_return": mean_ret, "std_return": std_ret}

    def factor_decay(
        self,
        factor_data: pd.Series,
        periods: Tuple[int, ...] = (1, 5, 10, 21, 63),
        **kwargs,
    ) -> pd.DataFrame:
        results = []
        for p in periods:
            try:
                clean = al.utils.get_clean_factor_and_forward_returns(
                    factor=factor_data,
                    prices=self.prices,
                    periods=(p,),
                    **kwargs,
                )
                ic = al.performance.mean_information_coefficient(clean)
                results.append({"period": p, "mean_ic": float(ic.iloc[0] if len(ic) > 0 else 0)})
            except Exception as e:
                logger.warning("Period %d failed: %s", p, e)
                results.append({"period": p, "mean_ic": 0.0})
        return pd.DataFrame(results)

    def cumulative_ic(self, factor_data: pd.Series, **kwargs) -> pd.Series:
        clean = al.utils.get_clean_factor_and_forward_returns(
            factor=factor_data,
            prices=self.prices,
            **kwargs,
        )
        ic = al.performance.factor_information_coefficient(clean)
        return ic.cumsum()

    def summary(self, factor_data: pd.Series, **kwargs) -> Dict[str, Any]:
        result = self.analyze(factor_data, **kwargs)
        return {
            "mean_ic": result["mean_ic"],
            "ic_std": result["ic_std"],
            "ic_ir": result["ic_ir"],
            "spread_return": float(result["spread_return"]) if result["spread_return"] is not None else None,
            "num_periods": len(result["ic_series"]) if hasattr(result["ic_series"], "__len__") else 0,
        }
