from __future__ import annotations

from typing import Optional


class TwitterIntegration:
    """Twitter/X API integration for sentiment and trade signals.

    Adapter for the stocksight / finBERT sentiment pipeline.
    Supports API key rotation through a token pool.
    """

    def __init__(self, bearer_token: Optional[str] = None, token_pool: Optional[list[str]] = None):
        self._token_pool = token_pool or ([bearer_token] if bearer_token else [])
        self._token_index = 0

    @property
    def bearer_token(self) -> Optional[str]:
        if not self._token_pool:
            return None
        token = self._token_pool[self._token_index % len(self._token_pool)]
        self._token_index += 1
        return token

    def add_token(self, token: str):
        self._token_pool.append(token)

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
