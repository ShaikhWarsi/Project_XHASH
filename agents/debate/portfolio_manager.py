from __future__ import annotations

from typing import Optional

from agents.llm.schemas import PortfolioDecision, parse_rating
from llm.client import LLMClient


class DebatePortfolioManager:
    def __init__(self, llm: Optional[LLMClient] = None):
        self.llm = llm or LLMClient.deep()
        self.agent_id = "debate_portfolio_manager"

    def decide(
        self,
        ticker: str,
        research_plan: dict,
        trader_proposal: dict,
        risk_debate: dict,
        past_context: str = "",
    ) -> PortfolioDecision:
        prompt = f"""You are the Portfolio Manager making the final decision for {ticker}.

Research Plan: {research_plan.get('rationale', '')[:1000]}
Trader Proposal: {trader_proposal.get('reasoning', '')[:1000]}

Risk Debate Summary:
  Aggressive: {risk_debate.get('aggressive', '')[:500]}
  Conservative: {risk_debate.get('conservative', '')[:500]}
  Neutral: {risk_debate.get('neutral', '')[:500]}

Past Context:
{past_context[:1000] or 'No prior context.'}

Produce a final portfolio decision with:
1. Rating (buy/overweight/hold/underweight/sell)
2. Executive summary
3. Investment thesis
4. Optional price target
5. Time horizon"""
        result = self.llm.generate_structured(prompt, temperature=0.3)
        return PortfolioDecision(
            rating=parse_rating(result.get("rating", "hold")),
            executive_summary=result.get("executive_summary", ""),
            investment_thesis=result.get("investment_thesis", ""),
            price_target=result.get("price_target"),
            time_horizon=result.get("time_horizon"),
        )
