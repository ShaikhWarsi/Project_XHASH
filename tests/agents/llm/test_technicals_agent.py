from __future__ import annotations

import pytest


def test_llm_technicals_importable():
    from agents.llm.technicals_agent import TechnicalsAgent
    assert TechnicalsAgent is not None


def test_technicals_agent_initialization():
    from agents.llm.technicals_agent import TechnicalsAgent
    agent = TechnicalsAgent()
    assert agent is not None
