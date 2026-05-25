from __future__ import annotations

from typing import Optional

from llm.client import LLMClient


class ConservativeDebator:
    def __init__(self, llm: Optional[LLMClient] = None):
        self.llm = llm or LLMClient.quick()
        self.agent_id = "conservative_debator"

    def argue(self, ticker: str, research_plan: dict, trader_proposal: dict, aggressive_args: str = "", neutral_args: str = "") -> str:
        prompt = f"""You are a CONSERVATIVE risk debator for {ticker}. You prioritize capital preservation.

Research Plan: {research_plan.get('rationale', '')[:1000]}
Trader Proposal: {trader_proposal.get('reasoning', '')[:1000]}

Aggressive counter-arguments: {aggressive_args or 'None yet'}
Neutral counter-arguments: {neutral_args or 'None yet'}

Argue for a more conservative position sizing and tighter risk controls.
Highlight downside risks, drawdown scenarios, and capital preservation.
Address and refute aggressive over-optimism."""
        return self.llm.generate(prompt, temperature=0.7)
