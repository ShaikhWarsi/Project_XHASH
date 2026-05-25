from __future__ import annotations

from typing import Optional

from agents.debate.aggressive_debator import AggressiveDebator
from agents.debate.bear_researcher import BearResearcher
from agents.debate.bull_researcher import BullResearcher
from agents.debate.conservative_debator import ConservativeDebator
from agents.debate.neutral_debator import NeutralDebator
from agents.debate.portfolio_manager import DebatePortfolioManager
from agents.debate.research_manager import ResearchManager
from agents.llm.schemas import TraderProposal
from agents.wall_time.tracker import AnalystWallTimeTracker
from llm.client import LLMClient


class DebateOrchestrator:
    def __init__(
        self,
        debate_rounds: int = 2,
        risk_debate_rounds: int = 1,
        bull_researcher: Optional[BullResearcher] = None,
        bear_researcher: Optional[BearResearcher] = None,
        research_manager: Optional[ResearchManager] = None,
        aggressive_debator: Optional[AggressiveDebator] = None,
        conservative_debator: Optional[ConservativeDebator] = None,
        neutral_debator: Optional[NeutralDebator] = None,
        portfolio_manager: Optional[DebatePortfolioManager] = None,
        wall_time_tracker: Optional[AnalystWallTimeTracker] = None,
    ):
        self.debate_rounds = debate_rounds
        self.risk_debate_rounds = risk_debate_rounds
        self.bull = bull_researcher or BullResearcher()
        self.bear = bear_researcher or BearResearcher()
        self.research_manager = research_manager or ResearchManager()
        self.aggressive = aggressive_debator or AggressiveDebator()
        self.conservative = conservative_debator or ConservativeDebator()
        self.neutral = neutral_debator or NeutralDebator()
        self.portfolio_manager = portfolio_manager or DebatePortfolioManager()
        self.wall_time = wall_time_tracker or AnalystWallTimeTracker()

    def run(
        self,
        ticker: str,
        analyst_reports: dict,
        past_context: str = "",
    ) -> dict:
        bull_case = ""
        bear_case = ""

        self.wall_time.start("bull_researcher")
        bull_case = self.bull.argue(ticker, analyst_reports, bear_case, rounds=self.debate_rounds)
        self.wall_time.stop("bull_researcher")

        self.wall_time.start("bear_researcher")
        bear_case = self.bear.argue(ticker, analyst_reports, bull_case, rounds=self.debate_rounds)
        self.wall_time.stop("bear_researcher")

        if self.debate_rounds > 1:
            for _ in range(self.debate_rounds - 1):
                self.wall_time.start("bull_researcher")
                bull_case = self.bull.argue(ticker, analyst_reports, bear_case)
                self.wall_time.stop("bull_researcher")

                self.wall_time.start("bear_researcher")
                bear_case = self.bear.argue(ticker, analyst_reports, bull_case)
                self.wall_time.stop("bear_researcher")

        self.wall_time.start("research_manager")
        research_plan = self.research_manager.evaluate(ticker, analyst_reports, bull_case, bear_case)
        self.wall_time.stop("research_manager")

        trader = LLMClient.quick()
        self.wall_time.start("trader")
        trader_result = trader.generate_structured(
            f"Based on this research plan for {ticker}, produce a trader proposal: {research_plan.rationale[:1500]}",
            temperature=0.3,
        )
        self.wall_time.stop("trader")
        trader_proposal = TraderProposal(
            action=trader_result.get("action", "hold"),
            reasoning=trader_result.get("reasoning", ""),
            entry_price=trader_result.get("entry_price"),
            stop_loss=trader_result.get("stop_loss"),
            position_sizing=trader_result.get("position_sizing"),
        )

        research_plan_dict = {
            "recommendation": research_plan.recommendation,
            "rationale": research_plan.rationale,
            "strategic_actions": research_plan.strategic_actions,
            "confidence": research_plan.confidence,
        }
        trader_proposal_dict = {
            "action": trader_proposal.action,
            "reasoning": trader_proposal.reasoning,
            "entry_price": trader_proposal.entry_price,
            "stop_loss": trader_proposal.stop_loss,
            "position_sizing": trader_proposal.position_sizing,
        }

        aggressive_args = ""
        conservative_args = ""
        neutral_args = ""

        for _ in range(self.risk_debate_rounds):
            a = self.aggressive.argue(ticker, research_plan_dict, trader_proposal_dict, conservative_args, neutral_args)
            c = self.conservative.argue(ticker, research_plan_dict, trader_proposal_dict, aggressive_args, neutral_args)
            n = self.neutral.argue(ticker, research_plan_dict, trader_proposal_dict, aggressive_args, conservative_args)
            aggressive_args = a
            conservative_args = c
            neutral_args = n

        risk_debate = {
            "aggressive": aggressive_args,
            "conservative": conservative_args,
            "neutral": neutral_args,
        }

        self.wall_time.start("debate_portfolio_manager")
        decision = self.portfolio_manager.decide(ticker, research_plan_dict, trader_proposal_dict, risk_debate, past_context)
        self.wall_time.stop("debate_portfolio_manager")

        return {
            "ticker": ticker,
            "bull_case": bull_case,
            "bear_case": bear_case,
            "research_plan": research_plan_dict,
            "trader_proposal": trader_proposal_dict,
            "risk_debate": risk_debate,
            "decision": {
                "rating": decision.rating,
                "executive_summary": decision.executive_summary,
                "investment_thesis": decision.investment_thesis,
                "price_target": decision.price_target,
                "time_horizon": decision.time_horizon,
            },
            "wall_time": self.wall_time.summary(),
        }
