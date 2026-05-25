from __future__ import annotations

from typing import Optional

from llm.client import LLMClient


class NeutralDebator:
    def __init__(self, llm: Optional[LLMClient] = None):
        self.llm = llm or LLMClient.quick()
        self.agent_id = "neutral_debator"

    def argue(self, ticker: str, research_plan: dict, trader_proposal: dict, aggressive_args: str = "", conservative_args: str = "") -> str:
        prompt = f"""You are a NEUTRAL risk debator for {ticker}. You balance risk and reward objectively.

Research Plan: {research_plan.get('rationale', '')[:1000]}
Trader Proposal: {trader_proposal.get('reasoning', '')[:1000]}

Aggressive arguments: {aggressive_args or 'None yet'}
Conservative arguments: {conservative_args or 'None yet'}

Synthesize both perspectives and advocate for a moderate, sustainable approach.
Identify the middle ground that captures upside while managing downside.
Your goal is a balanced risk position."""
        return self.llm.generate(prompt, temperature=0.7)
