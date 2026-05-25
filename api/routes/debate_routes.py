from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException

from api.services.debate import DebateService, DebateConfig

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/debate", tags=["debate"])


@router.post("/run")
async def run_debate(
    symbol: str,
    max_rounds: int = 3,
    bull_agents: str = "momentum,technicals,sentiment",
    bear_agents: str = "value,risk,fundamentals",
):
    config = DebateConfig(
        symbol=symbol,
        max_rounds=max_rounds,
        bull_agents=[a.strip() for a in bull_agents.split(",") if a.strip()],
        bear_agents=[a.strip() for a in bear_agents.split(",") if a.strip()],
    )
    service = DebateService(config)
    final_round = await service.run_debate()
    return {
        "symbol": symbol,
        "rounds_completed": len(service.rounds),
        "consensus": final_round.consensus,
        "consensus_confidence": final_round.consensus_confidence,
        "summary": final_round.summary,
        "bull_arguments": [
            {"agent": a.agent_name, "thesis": a.thesis, "confidence": a.confidence, "evidence": a.evidence}
            for a in final_round.bull_arguments
        ],
        "bear_arguments": [
            {"agent": a.agent_name, "thesis": a.thesis, "confidence": a.confidence, "evidence": a.evidence}
            for a in final_round.bear_arguments
        ],
        "neutral_arguments": [
            {"agent": a.agent_name, "thesis": a.thesis, "confidence": a.confidence, "evidence": a.evidence}
            for a in final_round.neutral_arguments
        ],
    }


@router.post("/multi-round")
async def multi_round_debate(
    symbol: str,
    rounds: int = 3,
    bull_agents: str = "momentum,technicals,sentiment",
    bear_agents: str = "value,risk,fundamentals",
):
    config = DebateConfig(
        symbol=symbol,
        max_rounds=rounds,
        bull_agents=[a.strip() for a in bull_agents.split(",") if a.strip()],
        bear_agents=[a.strip() for a in bear_agents.split(",") if a.strip()],
    )
    service = DebateService(config)
    prev_round = await service.run_debate()
    for i in range(2, rounds + 1):
        prev_round = await service.debate_round(i, prev_round)
    final = service.rounds[-1] if service.rounds else prev_round
    return {
        "symbol": symbol,
        "rounds_completed": len(service.rounds),
        "consensus": final.consensus,
        "consensus_confidence": final.consensus_confidence,
        "summary": final.summary,
        "rounds": [
            {
                "round": r.round_number,
                "consensus": r.consensus,
                "confidence": r.consensus_confidence,
                "bull_count": len(r.bull_arguments),
                "bear_count": len(r.bear_arguments),
            }
            for r in service.rounds
        ],
        "final_bull_arguments": [
            {"agent": a.agent_name, "thesis": a.thesis, "confidence": a.confidence}
            for a in final.bull_arguments
        ],
        "final_bear_arguments": [
            {"agent": a.agent_name, "thesis": a.thesis, "confidence": a.confidence}
            for a in final.bear_arguments
        ],
    }
