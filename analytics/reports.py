from __future__ import annotations

import json
from datetime import datetime
from typing import Optional

from .attribution import AttributionResult
from .metrics import PerformanceMetrics


class ReportGenerator:
    """Generate performance reports in various formats."""

    @staticmethod
    def text_report(
        metrics: PerformanceMetrics,
        attribution: Optional[AttributionResult] = None,
        title: str = "Performance Report",
    ) -> str:
        lines = [
            f"╔{'═' * 48}╗",
            f"║ {title:^46} ║",
            f"╚{'═' * 48}╝",
            "",
            "Returns:",
            f"  Total Return:      {metrics.total_return:>+8.2%}",
            f"  Annualized Return: {metrics.annualized_return:>+8.2%}",
            "",
            "Risk:",
            f"  Annualized Vol:    {metrics.annualized_volatility:>8.2%}",
            f"  Max Drawdown:      {metrics.max_drawdown:>8.2%}",
            f"  VaR (95%):         {metrics.value_at_risk_95:>+8.2%}",
            f"  CVaR (95%):        {metrics.conditional_var_95:>+8.2%}",
            "",
            "Risk-Adjusted:",
            f"  Sharpe Ratio:      {metrics.sharpe_ratio:>8.2f}",
            f"  Sortino Ratio:     {metrics.sortino_ratio:>8.2f}",
            f"  Calmar Ratio:      {metrics.calmar_ratio:>8.2f}",
            f"  Martin Ratio:      {metrics.martin_ratio:>8.2f}",
            "",
            "Trading:",
            f"  Total Trades:      {metrics.total_trades:>8d}",
            f"  Win Rate:          {metrics.win_rate:>8.2%}",
            f"  Profit Factor:     {metrics.profit_factor:>8.2f}",
            f"  Avg Win:           {metrics.avg_win:>+8.2%}",
            f"  Avg Loss:          {metrics.avg_loss:>+8.2%}",
            f"  Expectancy:        {metrics.expectancy:>+8.2%}",
        ]

        if attribution:
            lines.extend([
                "",
                "Attribution:",
                f"  Long Contribution:  {attribution.long_contribution:>+10.2f}",
                f"  Short Contribution: {attribution.short_contribution:>+10.2f}",
            ])
            if attribution.by_symbol:
                lines.append("  By Symbol:")
                for sym, pnl in sorted(attribution.by_symbol.items(), key=lambda x: -abs(x[1])):
                    lines.append(f"    {sym:<10s} {pnl:>+10.2f}")

        return "\n".join(lines)

    @staticmethod
    def json_report(
        metrics: PerformanceMetrics,
        attribution: Optional[AttributionResult] = None,
    ) -> str:
        data = {
            "generated_at": datetime.utcnow().isoformat(),
            "metrics": {
                "total_return": metrics.total_return,
                "annualized_return": metrics.annualized_return,
                "sharpe_ratio": metrics.sharpe_ratio,
                "sortino_ratio": metrics.sortino_ratio,
                "max_drawdown": metrics.max_drawdown,
                "win_rate": metrics.win_rate,
                "profit_factor": metrics.profit_factor,
                "total_trades": metrics.total_trades,
            },
        }
        if attribution:
            data["attribution"] = {
                "long_contribution": attribution.long_contribution,
                "short_contribution": attribution.short_contribution,
                "by_symbol": attribution.by_symbol,
                "by_signal_type": attribution.by_signal_type,
            }
        return json.dumps(data, indent=2)
