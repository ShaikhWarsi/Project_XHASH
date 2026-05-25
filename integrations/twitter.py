from __future__ import annotations

from typing import Optional


class TwitterIntegration:
    """Twitter/X API integration for sentiment and trade signals.

    Adapter for the stocksight / finBERT sentiment pipeline.
    """

    def __init__(self, bearer_token: Optional[str] = None):
        self.bearer_token = bearer_token

    def analyze_sentiment(self, text: str) -> dict:
        """Basic lexicon-based sentiment scoring."""
        positive_words = {"bullish", "buy", "long", "moon", "pump", "growth", "breakout"}
        negative_words = {"bearish", "sell", "short", "dump", "fear", "crash", "decline"}

        words = set(text.lower().split())
        pos_count = len(words & positive_words)
        neg_count = len(words & negative_words)

        if pos_count > neg_count:
            return {"sentiment": "bullish", "score": pos_count / max(len(words), 1)}
        elif neg_count > pos_count:
            return {"sentiment": "bearish", "score": neg_count / max(len(words), 1)}
        return {"sentiment": "neutral", "score": 0.0}
