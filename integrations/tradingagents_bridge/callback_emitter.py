"""LangGraph callback adapter — emits SSE events for the frontend stream."""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Callable, Optional

from langchain_core.callbacks import BaseCallbackHandler

logger = logging.getLogger(__name__)


class SSEEvent:
    """An SSE event to be pushed to the frontend."""

    def __init__(self, event: str, data: dict):
        self.event = event
        self.data = data
        self.timestamp = datetime.utcnow().isoformat()

    def serialize(self) -> str:
        payload = {**self.data, "ts": self.timestamp}
        return f"event: {self.event}\ndata: {json.dumps(payload)}\n\n"


class TradingAgentsCallbackHandler(BaseCallbackHandler):
    """LangChain callback that forwards per-node progress to an SSE emitter.

    Emits fine-grained events for tools, analytics, and pipeline stage transitions.

    Usage::

        emitter = TradingAgentsCallbackHandler(push_fn=lambda e: my_queue.put(e))
        graph = TradingAgentsGraph(callbacks=[emitter])
    """

    def __init__(
        self,
        push_fn: Callable[[SSEEvent], None],
        ticker: str = "",
    ):
        super().__init__()
        self.push_fn = push_fn
        self.ticker = ticker
        self._current_node: Optional[str] = None
        self._tool_call_count = 0

    def _emit(self, event: str, data: dict):
        try:
            self.push_fn(SSEEvent(event, data))
        except Exception as exc:
            logger.warning("SSE push failed: %s", exc)

    def on_llm_start(self, serialized, prompts, **kwargs):
        pass

    def on_llm_end(self, response, **kwargs):
        pass

    def on_tool_start(self, serialized, input_str, **kwargs):
        self._tool_call_count += 1
        tool_name = serialized.get("name", "unknown")
        input_preview = (str(input_str)[:200] if input_str else "")
        self._emit("tool_call", {
            "tool": tool_name,
            "input_preview": input_preview,
            "call_count": self._tool_call_count,
            "node": self._current_node or "unknown",
            "ticker": self.ticker,
        })

    def on_tool_end(self, output, **kwargs):
        output_preview = (str(output)[:200] if output else "")
        self._emit("tool_result", {
            "tool": getattr(output, 'name', '') or '',
            "output_preview": output_preview,
            "call_count": self._tool_call_count,
            "node": self._current_node or "unknown",
            "ticker": self.ticker,
        })

    def on_chain_start(self, serialized, inputs, **kwargs):
        node_name = serialized.get("name", "unknown")
        self._current_node = node_name
        self._emit("node_start", {"node": node_name, "ticker": self.ticker})

    def on_chain_end(self, outputs, **kwargs):
        node_name = self._current_node or "unknown"
        self._emit("node_complete", {"node": node_name, "ticker": self.ticker})
        self._current_node = None


def build_stage_event(ticker: str, stage: str, label: str) -> SSEEvent:
    return SSEEvent("stage_update", {
        "ticker": ticker, "stage": stage, "label": label,
    })


def build_analyst_started_event(ticker: str, name: str) -> SSEEvent:
    return SSEEvent("analyst_started", {
        "ticker": ticker, "name": name,
    })


def build_debate_started_event(ticker: str, debate_type: str, round_num: int) -> SSEEvent:
    return SSEEvent("debate_started", {
        "ticker": ticker, "debate_type": debate_type, "round": round_num,
    })


def build_scrape_event(ticker: str, source: str, item_count: int) -> SSEEvent:
    return SSEEvent("scrape_complete", {
        "ticker": ticker, "source": source, "count": item_count,
    })


def build_analyst_event(ticker: str, name: str, report: str) -> SSEEvent:
    return SSEEvent("analyst_complete", {
        "ticker": ticker, "name": name, "report": report[:200],
    })


def build_debate_round_event(ticker: str, speaker: str, round_num: int, content: str) -> SSEEvent:
    return SSEEvent("debate_round", {
        "ticker": ticker, "speaker": speaker, "round": round_num, "content": content[:200],
    })


def build_decision_event(ticker: str, stage: str, decision: str) -> SSEEvent:
    return SSEEvent(f"{stage}_decision", {
        "ticker": ticker, "stage": stage, "decision": decision[:200],
    })


def build_run_complete_event(ticker: str, rating: str) -> SSEEvent:
    return SSEEvent("run_complete", {
        "ticker": ticker, "rating": rating,
    })
