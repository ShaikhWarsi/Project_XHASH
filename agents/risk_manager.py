from __future__ import annotations

import numpy as np
import pandas as pd

from core.enums import AgentRole
from core.types import AnalystSignal, PortfolioState, RiskLimits, SignalMatrix

from .base import TradingAgent


class RiskManagerAgent(TradingAgent):
    """Volatility-adjusted risk management agent.

    Ported from ai-hedge-fund/src/agents/risk_manager.py.

    Computes per-ticker position limits based on volatility,
    correlation, and portfolio constraints.
    """

    def __init__(self, agent_id: str = "risk_management_agent"):
        super().__init__(agent_id=agent_id, role=AgentRole.PORTFOLIO_MANAGER)

    def analyze(
        self,
        tickers: list[str],
        portfolio: PortfolioState,
        signals: SignalMatrix,
        risk_limits: RiskLimits,
        **kwargs,
    ) -> dict[str, AnalystSignal]:
        prices_df = kwargs.get("prices_df", {})
        current_prices: dict[str, float] = {}
        volatility_data: dict[str, dict] = {}
        returns_by_ticker: dict[str, pd.Series] = {}

        all_tickers = set(tickers) | set(portfolio.positions.keys())

        for ticker in all_tickers:
            df = prices_df.get(ticker)
            if df is None or len(df) < 2:
                volatility_data[ticker] = {
                    "daily_volatility": 0.05,
                    "annualized_volatility": 0.05 * np.sqrt(252),
                    "volatility_percentile": 100,
                }
                continue

            current_prices[ticker] = float(df["close"].iloc[-1])
            vol_metrics = self._calculate_volatility_metrics(df)
            volatility_data[ticker] = vol_metrics

            daily_returns = df["close"].pct_change().dropna()
            if len(daily_returns) > 0:
                returns_by_ticker[ticker] = daily_returns

        correlation_matrix = None
        if len(returns_by_ticker) >= 2:
            try:
                returns_df = pd.DataFrame(returns_by_ticker).dropna(how="any")
                if returns_df.shape[1] >= 2 and returns_df.shape[0] >= 5:
                    correlation_matrix = returns_df.corr()
            except Exception:
                pass

        active_positions = {
            t for t, pos in portfolio.positions.items()
            if abs(pos.quantity) > 0
        }

        total_value = portfolio.total_value

        results: dict[str, AnalystSignal] = {}
        for ticker in tickers:
            price = current_prices.get(ticker, 0.0)
            if price <= 0:
                results[ticker] = self._make_signal(ticker, "neutral", 0.0, "No valid price data")
                continue

            vol_data = volatility_data.get(ticker, {})
            ann_vol = vol_data.get("annualized_volatility", 0.25)

            vol_limit_pct = self._volatility_adjusted_limit(ann_vol)

            corr_mult = 1.0
            if correlation_matrix is not None and ticker in correlation_matrix.columns:
                comparable = [t for t in active_positions if t in correlation_matrix.columns and t != ticker]
                if not comparable:
                    comparable = [t for t in correlation_matrix.columns if t != ticker]
                if comparable:
                    series = correlation_matrix.loc[ticker, comparable].dropna()
                    if len(series) > 0:
                        avg_corr = float(series.mean())
                        corr_mult = self._correlation_multiplier(avg_corr)

            combined_limit_pct = vol_limit_pct * corr_mult
            position_limit = total_value * combined_limit_pct

            current_pos = portfolio.positions.get(ticker)
            current_value = abs(current_pos.quantity * current_pos.current_price) if current_pos else 0.0
            remaining_limit = max(0.0, position_limit - current_value)

            results[ticker] = self._make_signal(
                ticker=ticker,
                signal="neutral",
                confidence=0.5,
                reasoning=(
                    f"Vol={ann_vol:.1%}, limit={combined_limit_pct:.1%}, "
                    f"remaining=${remaining_limit:.0f}"
                ),
                metadata={
                    "remaining_position_limit": remaining_limit,
                    "current_price": price,
                    "annualized_volatility": ann_vol,
                    "position_limit": position_limit,
                    "vol_limit_pct": vol_limit_pct,
                    "correlation_multiplier": corr_mult,
                },
            )

        return results

    @staticmethod
    def _calculate_volatility_metrics(df: pd.DataFrame, lookback: int = 60) -> dict:
        if len(df) < 2:
            return {"daily_volatility": 0.05, "annualized_volatility": 0.05 * np.sqrt(252), "volatility_percentile": 100}

        daily_returns = df["close"].pct_change().dropna()
        if len(daily_returns) < 2:
            return {"daily_volatility": 0.05, "annualized_volatility": 0.05 * np.sqrt(252), "volatility_percentile": 100}

        recent = daily_returns.tail(min(lookback, len(daily_returns)))
        daily_vol = float(recent.std())
        ann_vol = daily_vol * np.sqrt(252)

        if len(daily_returns) >= 30:
            rolling_vol = daily_returns.rolling(30).std().dropna()
            vol_pct = float((rolling_vol <= daily_vol).mean() * 100) if len(rolling_vol) > 0 else 50.0
        else:
            vol_pct = 50.0

        return {
            "daily_volatility": daily_vol if not np.isnan(daily_vol) else 0.025,
            "annualized_volatility": ann_vol if not np.isnan(ann_vol) else 0.25,
            "volatility_percentile": vol_pct if not np.isnan(vol_pct) else 50.0,
        }

    @staticmethod
    def _volatility_adjusted_limit(ann_vol: float) -> float:
        base = 0.20
        if ann_vol < 0.15:
            mult = 1.25
        elif ann_vol < 0.30:
            mult = 1.0 - (ann_vol - 0.15) * 0.5
        elif ann_vol < 0.50:
            mult = 0.75 - (ann_vol - 0.30) * 0.5
        else:
            mult = 0.50
        mult = max(0.25, min(1.25, mult))
        return base * mult

    @staticmethod
    def _correlation_multiplier(avg_corr: float) -> float:
        if avg_corr >= 0.80:
            return 0.70
        elif avg_corr >= 0.60:
            return 0.85
        elif avg_corr >= 0.40:
            return 1.00
        elif avg_corr >= 0.20:
            return 1.05
        return 1.10
