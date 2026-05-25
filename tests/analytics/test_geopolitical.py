import pytest
from analytics.geopolitical import (
    geopolitical_match_level,
    geopolitical_sentiment_penalty,
    is_major_geopolitical_news,
    analyze_geopolitical_risk,
)


class TestGeopoliticalDetection:
    def test_no_geo(self):
        level, reason = geopolitical_match_level("Markets are calm today.")
        assert level == "none"

    def test_severe_war(self):
        level, reason = geopolitical_match_level("War declared between countries.")
        assert level == "severe"

    def test_severe_invasion(self):
        level, reason = geopolitical_match_level("Military invasion launched.")
        assert level == "severe"

    def test_severe_airstrike(self):
        level, reason = geopolitical_match_level("Air strikes hit the capital.")
        assert level == "severe"

    def test_moderate_sanctions(self):
        level, reason = geopolitical_match_level("International sanctions against the country.")
        assert level == "moderate"

    def test_moderate_geopolitical_crisis(self):
        level, reason = geopolitical_match_level("Geopolitical crisis in the region.")
        assert level == "moderate"

    def test_avoids_false_positive_toward(self):
        level, reason = geopolitical_match_level("Moving toward a resolution.")
        assert level == "none"

    def test_avoids_false_positive_award(self):
        level, reason = geopolitical_match_level("Company awarded the contract.")
        assert level == "none"

    def test_empty_text(self):
        level, reason = geopolitical_match_level("")
        assert level == "none"

    def test_short_text(self):
        level, reason = geopolitical_match_level("ab")
        assert level == "none"

    def test_penalty_severe(self):
        assert geopolitical_sentiment_penalty("severe") == -42

    def test_penalty_moderate(self):
        assert geopolitical_sentiment_penalty("moderate") == -18

    def test_penalty_none(self):
        assert geopolitical_sentiment_penalty("none") == 0

    def test_major_news_war(self):
        assert is_major_geopolitical_news("War in the middle east") is True

    def test_major_news_invasion(self):
        assert is_major_geopolitical_news("Invasion of territory") is True

    def test_major_news_false_positive(self):
        assert is_major_geopolitical_news("Company earnings beat estimates") is False

    def test_analyze_no_news(self):
        result = analyze_geopolitical_risk([])
        assert result["level"] == "none"

    def test_analyze_with_severe_news(self):
        news = [{"title": "War breaks out", "summary": "Full scale war"}]
        result = analyze_geopolitical_risk(news)
        assert result["level"] == "severe"
        assert result["affected_news_count"] >= 1

    def test_analyze_with_mixed_news(self):
        news = [
            {"title": "Earnings report", "summary": "Company beats estimates"},
            {"title": "Military attack", "summary": "Armed attack in region"},
        ]
        result = analyze_geopolitical_risk(news)
        assert result["level"] == "severe"
