from __future__ import annotations

import pytest


def test_llm_sentiment_importable():
    from agents.llm.sentiment_agent import SentimentAgent
    assert SentimentAgent is not None


def test_sentiment_agent_initialization():
    from agents.llm.sentiment_agent import SentimentAgent
    agent = SentimentAgent()
    assert agent is not None
