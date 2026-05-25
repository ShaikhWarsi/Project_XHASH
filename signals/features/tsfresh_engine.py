from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Sequence, Union

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

HAS_TSFRESH = False
try:
    from tsfresh import extract_features, select_features
    from tsfresh.feature_extraction import ComprehensiveFCParameters, MinimalFCParameters
    from tsfresh.utilities.dataframe_functions import impute

    HAS_TSFRESH = True
except ImportError:
    extract_features = None  # type: ignore
    select_features = None  # type: ignore


class TSFreshEngine:
    def __init__(
        self,
        kind_to_fc_parameters: Optional[Dict[str, Any]] = None,
        default_fc_parameters: str = "minimal",
        n_jobs: int = 0,
    ):
        if not HAS_TSFRESH:
            raise ImportError("tsfresh is required. Install: pip install trading-engine[features]")

        if default_fc_parameters == "comprehensive":
            self.fc_params = kind_to_fc_parameters or ComprehensiveFCParameters()
        else:
            self.fc_params = kind_to_fc_parameters or MinimalFCParameters()

        self.n_jobs = n_jobs

    def extract(
        self,
        df: pd.DataFrame,
        column_id: str = "id",
        column_sort: str = "time",
        column_value: Optional[str] = None,
        impute_fn: bool = True,
    ) -> pd.DataFrame:
        if column_value:
            df = df.rename(columns={column_value: "value"})

        features = extract_features(
            df,
            column_id=column_id,
            column_sort=column_sort,
            default_fc_parameters=self.fc_params,
            n_jobs=self.n_jobs,
        )

        if impute_fn:
            features = impute(features)

        features = features.reset_index(drop=False)
        return features

    def select(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        ml_task: str = "auto",
        fdr_level: float = 0.05,
    ) -> pd.DataFrame:
        return select_features(X, y, ml_task=ml_task, fdr_level=fdr_level)

    def pipeline(
        self,
        df: pd.DataFrame,
        target: pd.Series,
        column_id: str = "id",
        column_sort: str = "time",
    ) -> pd.DataFrame:
        features = self.extract(df, column_id=column_id, column_sort=column_sort)
        selected = self.select(features, target)
        return selected


class FeatureSelector:
    def __init__(self, correlation_threshold: float = 0.95, importance_threshold: float = 0.0):
        self.correlation_threshold = correlation_threshold
        self.importance_threshold = importance_threshold

    def remove_high_correlation(self, features: pd.DataFrame) -> pd.DataFrame:
        corr = features.corr().abs()
        upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
        to_drop = [col for col in upper.columns if any(upper[col] > self.correlation_threshold)]
        return features.drop(columns=to_drop)

    def select_by_variance(self, features: pd.DataFrame, threshold: float = 0.0) -> pd.DataFrame:
        variances = features.var()
        to_keep = variances[variances > threshold].index
        return features[to_keep]
