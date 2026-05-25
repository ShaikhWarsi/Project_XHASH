import pytest
from backtesting.optimization.scoring import StrategyScoringService


class TestStrategyScoring:
    def setup_method(self):
        self.scorer = StrategyScoringService()

    def test_default_weights_sum_to_one(self):
        weights = self.scorer.resolve_weights()
        assert abs(sum(weights.values()) - 1.0) < 0.001

    def test_regime_weights_bull(self):
        weights = self.scorer.resolve_weights({"regime": "bull_trend"})
        assert weights["return"] > weights["drawdown"]
        assert abs(sum(weights.values()) - 1.0) < 0.001

    def test_regime_weights_bear(self):
        weights = self.scorer.resolve_weights({"regime": "bear_trend"})
        assert weights["drawdown"] > weights["return"]

    def test_regime_weights_range(self):
        weights = self.scorer.resolve_weights({"regime": "range_compression"})
        assert weights["win_rate"] > weights["return"]

    def test_regime_weights_high_vol(self):
        weights = self.scorer.resolve_weights({"regime": "high_volatility"})
        assert weights["drawdown"] == 0.26

    def test_unknown_regime_falls_back(self):
        weights = self.scorer.resolve_weights({"regime": "unknown_regime"})
        expected = self.scorer.resolve_weights()
        assert weights == expected

    def test_custom_weights_override(self):
        scorer = StrategyScoringService(custom_weights={"return": 1.0, "sharpe": 1.0})
        weights = scorer.resolve_weights()
        assert weights["return"] == 0.5
        assert weights["sharpe"] == 0.5

    def test_score_perfect_result(self):
        result = {
            "totalReturn": 80.0,
            "annualReturn": 120.0,
            "sharpeRatio": 3.0,
            "profitFactor": 2.5,
            "winRate": 70.0,
            "maxDrawdown": 5.0,
            "totalTrades": 100,
            "equityCurve": [{"value": 100}, {"value": 110}, {"value": 120}],
        }
        score = self.scorer.score_result(result)
        assert score["overallScore"] >= 85
        assert score["grade"] == "A"

    def test_score_poor_result(self):
        result = {
            "totalReturn": -30.0,
            "annualReturn": -20.0,
            "sharpeRatio": -2.0,
            "profitFactor": 0.5,
            "winRate": 20.0,
            "maxDrawdown": 60.0,
            "totalTrades": 3,
        }
        score = self.scorer.score_result(result)
        assert score["overallScore"] < 40
        assert score["grade"] == "E"

    def test_score_with_regime(self):
        result = {
            "totalReturn": 20.0,
            "annualReturn": 15.0,
            "sharpeRatio": 1.5,
            "profitFactor": 1.8,
            "winRate": 55.0,
            "maxDrawdown": 15.0,
            "totalTrades": 50,
        }
        score = self.scorer.score_result(result, regime={"regime": "bull_trend"})
        assert "regimeFitScore" in score["components"]
        assert score["overallScore"] > 0

    def test_rank_results(self):
        items = [
            {"score": {"overallScore": 80}},
            {"score": {"overallScore": 90}},
            {"score": {"overallScore": 70}},
        ]
        ranked = self.scorer.rank_results(items)
        assert ranked[0]["rank"] == 1
        assert ranked[0]["score"]["overallScore"] == 90
        assert ranked[2]["rank"] == 3

    def test_stability_score_rising(self):
        curve = [{"value": 100}, {"value": 105}, {"value": 110}, {"value": 115}]
        score = StrategyScoringService._stability_score(curve)
        assert score == 100.0

    def test_stability_score_falling(self):
        curve = [{"value": 100}, {"value": 95}, {"value": 90}]
        score = StrategyScoringService._stability_score(curve)
        assert score == 0.0

    def test_stability_score_short(self):
        score = StrategyScoringService._stability_score([{"value": 100}])
        assert score == 45.0
