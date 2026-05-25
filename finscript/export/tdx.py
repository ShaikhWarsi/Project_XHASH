from __future__ import annotations


class TDXExporter:
    def export(self, strategy_name: str, conditions: list[str]) -> str:
        lines = [
            f"{strategy_name}:",
        ]
        for cond in conditions:
            lines.append(f"  {cond}")
        lines.append("")
        lines.append("ENTERLONG:")
        lines.append("  BUY")
        lines.append("EXITLONG:")
        lines.append("  SELL")
        return "\n".join(lines)
