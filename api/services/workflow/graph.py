from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable

logger = logging.getLogger(__name__)


@dataclass
class AgentState:
    messages: list[dict] = field(default_factory=list)
    agent_name: str = ""
    role: str = ""
    output: dict | None = None
    confidence: float = 0.0
    reflection: str = ""
    next_agent: str = ""


@dataclass
class WorkflowState:
    workflow_id: str = ""
    symbol: str = ""
    status: str = "pending"
    current_step: str = ""
    steps: dict[str, AgentState] = field(default_factory=dict)
    consensus: str = ""
    consensus_confidence: float = 0.0
    final_report: str = ""
    error: str = ""
    created_at: str = ""


class WorkflowGraph:
    def __init__(self):
        self.nodes: dict[str, Callable] = {}
        self.edges: list[tuple[str, str, str]] = []
        self.checkpoints: list[WorkflowState] = []

    def add_node(self, name: str, fn: Callable) -> WorkflowGraph:
        self.nodes[name] = fn
        return self

    def add_edge(self, from_node: str, to_node: str, condition: str = "always") -> WorkflowGraph:
        self.edges.append((from_node, to_node, condition))
        return self

    async def run(self, workflow_id: str, symbol: str) -> WorkflowState:
        state = WorkflowState(
            workflow_id=workflow_id,
            symbol=symbol,
            status="running",
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        for name, fn in self.nodes.items():
            state.current_step = name
            logger.info("Running node: %s", name)
            try:
                agent_state = AgentState(agent_name=name, role=name)
                if callable(fn):
                    result = await fn(symbol, state)
                    if isinstance(result, AgentState):
                        agent_state = result
                    elif isinstance(result, dict):
                        agent_state.output = result
                state.steps[name] = agent_state
                self.checkpoints.append(state)
                self._save_checkpoint(workflow_id, state)
            except Exception as e:
                state.status = "failed"
                state.error = f"Node {name}: {e}"
                return state
        state.status = "completed"
        self._build_consensus(state)
        self._save_checkpoint(workflow_id, state)
        return state

    def _build_consensus(self, state: WorkflowState) -> None:
        bull_conf = 0.0
        bear_conf = 0.0
        for name, s in state.steps.items():
            role = s.role.lower()
            conf = s.confidence
            if "bull" in role or "momentum" in role or "growth" in role:
                bull_conf += conf
            elif "bear" in role or "risk" in role or "value" in role:
                bear_conf += conf
            else:
                bull_conf += conf * 0.5
                bear_conf += conf * 0.5
        total = bull_conf + bear_conf
        if total > 0:
            if bull_conf > bear_conf:
                state.consensus = "bullish"
                state.consensus_confidence = bull_conf / total
            else:
                state.consensus = "bearish"
                state.consensus_confidence = bear_conf / total
        else:
            state.consensus = "neutral"
            state.consensus_confidence = 0.5

    def _save_checkpoint(self, workflow_id: str, state: WorkflowState) -> None:
        try:
            import os
            from pathlib import Path
            d = Path.home() / ".trading-engine" / "workflows"
            d.mkdir(parents=True, exist_ok=True)
            with open(d / f"{workflow_id}.json", "w") as f:
                json.dump({
                    "workflow_id": state.workflow_id,
                    "symbol": state.symbol,
                    "status": state.status,
                    "current_step": state.current_step,
                    "consensus": state.consensus,
                    "consensus_confidence": state.consensus_confidence,
                    "created_at": state.created_at,
                }, f, indent=2, default=str)
        except Exception as e:
            logger.warning("Checkpoint save failed: %s", e)

    @staticmethod
    def load(workflow_id: str) -> dict | None:
        try:
            from pathlib import Path
            p = Path.home() / ".trading-engine" / "workflows" / f"{workflow_id}.json"
            if p.is_file():
                with open(p) as f:
                    return json.load(f)
        except Exception as e:
            logger.warning("Failed to load workflow %s: %s", workflow_id, e)
        return None

    @staticmethod
    def list_workflows() -> list[dict]:
        try:
            from pathlib import Path
            d = Path.home() / ".trading-engine" / "workflows"
            if not d.is_dir():
                return []
            results = []
            for p in d.glob("*.json"):
                with open(p) as f:
                    results.append(json.load(f))
            return sorted(results, key=lambda x: x.get("created_at", ""), reverse=True)
        except Exception as e:
            logger.warning("Failed to list workflows: %s", e)
            return []


async def researcher_bull(symbol: str, state: WorkflowState) -> AgentState:
    import yfinance as yf
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="6mo")
        if hist.empty:
            return AgentState(agent_name="bull_researcher", role="bull", output={"signal": "neutral", "confidence": 0.3}, confidence=0.3)
        price = float(hist["Close"].iloc[-1])
        sma20 = float(hist["Close"].rolling(20).mean().iloc[-1])
        sma50 = float(hist["Close"].rolling(50).mean().iloc[-1])
        rsi = _calc_rsi(hist["Close"])
        vol = float(hist["Volume"].iloc[-1])
        vol_avg = float(hist["Volume"].rolling(20).mean().iloc[-1])
        bullish = 0
        total = 0
        if price > sma20: bullish += 1
        total += 1
        if sma20 > sma50: bullish += 1
        total += 1
        if rsi > 50: bullish += 1
        total += 1
        if vol > vol_avg: bullish += 1
        total += 1
        conf = bullish / total if total > 0 else 0.5
        return AgentState(
            agent_name="bull_researcher", role="bull",
            output={"price": price, "sma20": sma20, "sma50": sma50, "rsi": rsi, "signal": "bullish" if bullish > total / 2 else "neutral"},
            confidence=conf,
            reflection=f"Price ${price:.2f}, SMA20 ${sma20:.2f}, SMA50 ${sma50:.2f}, RSI {rsi:.1f}. {bullish}/{total} bullish signals.",
        )
    except Exception as e:
        return AgentState(agent_name="bull_researcher", role="bull", output={"error": str(e)}, confidence=0.3)


async def researcher_bear(symbol: str, state: WorkflowState) -> AgentState:
    import yfinance as yf
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="6mo")
        if hist.empty:
            return AgentState(agent_name="bear_researcher", role="bear", output={"signal": "neutral", "confidence": 0.3}, confidence=0.3)
        price = float(hist["Close"].iloc[-1])
        high_52w = float(hist["High"].max())
        low_52w = float(hist["Low"].min())
        rsi = _calc_rsi(hist["Close"])
        hist["return"] = hist["Close"].pct_change()
        volatility = float(hist["return"].std() * (252 ** 0.5))
        bearish = 0
        total = 0
        if price > high_52w * 0.9: bearish += 1
        total += 1
        if rsi > 70: bearish += 1
        total += 1
        if volatility > 0.4: bearish += 1
        total += 1
        conf = bearish / total if total > 0 else 0.5
        return AgentState(
            agent_name="bear_researcher", role="bear",
            output={"price": price, "high_52w": high_52w, "low_52w": low_52w, "rsi": rsi, "volatility": volatility, "signal": "bearish" if bearish > total / 2 else "neutral"},
            confidence=conf,
            reflection=f"Price ${price:.2f}, 52w high ${high_52w:.2f}, RSI {rsi:.1f}, vol {volatility:.2%}. {bearish}/{total} bearish signals.",
        )
    except Exception as e:
        return AgentState(agent_name="bear_researcher", role="bear", output={"error": str(e)}, confidence=0.3)


async def risk_debater(symbol: str, state: WorkflowState) -> AgentState:
    bull = state.steps.get("bull_researcher")
    bear = state.steps.get("bear_researcher")
    bull_conf = bull.confidence if bull else 0.3
    bear_conf = bear.confidence if bear else 0.3
    diff = abs(bull_conf - bear_conf)
    if diff < 0.15:
        confidence = 0.4
        signal = "neutral"
        reflection = "Bull and bear signals are too close — no clear edge."
    elif bull_conf > bear_conf:
        confidence = bull_conf
        signal = "bullish"
        reflection = f"Bull case stronger ({bull_conf:.0%} vs {bear_conf:.0%})."
    else:
        confidence = bear_conf
        signal = "bearish"
        reflection = f"Bear case stronger ({bear_conf:.0%} vs {bull_conf:.0%})."
    return AgentState(
        agent_name="risk_debater", role="risk",
        output={"signal": signal, "bull_confidence": bull_conf, "bear_confidence": bear_conf},
        confidence=confidence,
        reflection=reflection,
    )


async def reflection_layer(symbol: str, state: WorkflowState) -> AgentState:
    risk = state.steps.get("risk_debater")
    if not risk:
        return AgentState(agent_name="reflector", role="reflector", output={"final": "neutral"}, confidence=0.5)
    signal = risk.output.get("signal", "neutral")
    conf = risk.confidence
    if signal == "bullish" and conf < 0.5:
        signal = "neutral"
        reflection = "Downgraded to neutral due to low confidence."
    elif signal == "bearish" and conf < 0.5:
        signal = "neutral"
        reflection = "Downgraded to neutral due to low confidence."
    else:
        reflection = f"Confirmed {signal} with {conf:.0%} confidence."
    return AgentState(
        agent_name="reflector", role="reflector",
        output={"final": signal},
        confidence=conf,
        reflection=reflection,
    )


def _calc_rsi(prices):
    if len(prices) < 15:
        return 50.0
    delta = prices.diff()
    gain = delta.where(delta > 0, 0).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
    rs = gain / loss.replace(0, float("inf"))
    last_rs = rs.iloc[-1]
    return float(100 - (100 / (1 + last_rs))) if last_rs != float("inf") else 50.0


def build_default_workflow() -> WorkflowGraph:
    return (WorkflowGraph()
        .add_node("bull_researcher", researcher_bull)
        .add_node("bear_researcher", researcher_bear)
        .add_node("risk_debater", risk_debater)
        .add_node("reflector", reflection_layer)
        .add_edge("bull_researcher", "risk_debater", "always")
        .add_edge("bear_researcher", "risk_debater", "always")
        .add_edge("risk_debater", "reflector", "always"))
