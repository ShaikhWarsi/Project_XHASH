from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from agents.llm.schemas import parse_rating
from analytics.benchmarks.regional import get_benchmark_for_ticker
from llm.client import LLMClient


class TradingMemoryLog:
    def __init__(self, log_path: Optional[str] = None):
        if log_path is None:
            log_path = str(Path.home() / ".trading-engine" / "trading_memory.md")
        self._path = Path(log_path)
        self._path.parent.mkdir(parents=True, exist_ok=True)
        if not self._path.exists():
            self._path.write_text("# Trading Memory Log\n\n")

    def store_pending(self, ticker: str, decision: dict, portfolio_value: float):
        entry = (
            f"## [{datetime.now(timezone.utc).strftime('%Y-%m-%d')} | {ticker} | "
            f"{decision.get('rating', 'hold')} | PENDING | {portfolio_value:.2f}]\n"
            f"- Decision: {json.dumps(decision, indent=2)}\n"
            f"- Status: PENDING\n\n"
        )
        with open(self._path, "a", encoding="utf-8") as f:
            f.write(entry)

    def resolve_pending(self, ticker: str, current_price: float, entry_price: float, benchmark_return: Optional[float] = None) -> Optional[dict]:
        content = self._path.read_text(encoding="utf-8")
        lines = content.split("\n")
        resolved_entry = None
        new_lines = []
        for i, line in enumerate(lines):
            if f"| {ticker} |" in line and "PENDING" in line:
                raw_return = (current_price - entry_price) / entry_price if entry_price != 0 else 0.0
                benchmark = get_benchmark_for_ticker(ticker)
                alpha = (raw_return - (benchmark_return or 0.0)) * 100
                resolved_line = line.replace("PENDING", f"{raw_return:.4f}")
                resolved_entry = {
                    "ticker": ticker,
                    "raw_return": raw_return,
                    "alpha_return": alpha,
                    "benchmark": benchmark,
                }
                new_lines.append(resolved_line)
            else:
                new_lines.append(line)

        if resolved_entry:
            self._path.write_text("\n".join(new_lines), encoding="utf-8")
        return resolved_entry

    def reflect(self, ticker: str, resolved_entry: dict) -> str:
        llm = LLMClient.quick()
        prompt = f"""Review this completed trade for {ticker}:

Raw Return: {resolved_entry['raw_return']:.2%}
Alpha: {resolved_entry['alpha_return']:.2%}
Benchmark: {resolved_entry.get('benchmark', 'SPY')}

Write a brief reflection on what worked, what didn't, and lessons for future trades."""
        reflection = llm.generate(prompt, temperature=0.5)
        with open(self._path, "a", encoding="utf-8") as f:
            f.write(f"**Reflection:** {reflection}\n\n")
        return reflection

    def get_context(self, ticker: str, max_entries: int = 5) -> str:
        content = self._path.read_text(encoding="utf-8")
        sections = content.split("## ")
        matching = []
        for section in sections:
            if f"| {ticker} |" in section.split("\n")[0]:
                matching.append(section)
        return "\n".join(matching[-max_entries:]) if matching else ""

    def get_recent(self, limit: int = 10) -> list[dict]:
        content = self._path.read_text(encoding="utf-8")
        sections = content.split("## ")
        entries = []
        for section in sections[1:]:
            lines = section.strip().split("\n")
            header = lines[0]
            if "|" in header:
                parts = [p.strip() for p in header.split("|")]
                if len(parts) >= 4:
                    entries.append({
                        "date": parts[1] if len(parts) > 1 else "",
                        "ticker": parts[2] if len(parts) > 2 else "",
                        "rating": parts[3] if len(parts) > 3 else "",
                        "return": parts[4] if len(parts) > 4 else "",
                    })
        return entries[-limit:]
