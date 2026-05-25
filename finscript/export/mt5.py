from __future__ import annotations

from typing import Any


class MT5Exporter:
    def export(self, strategy_name: str, entry_conditions: list[str], exit_conditions: list[str], params: dict[str, Any] = None) -> str:
        params = params or {}
        lines = [
            f"// {strategy_name} - MetaTrader 5 Expert Advisor",
            "#property copyright \"Trading-Engine\"",
            "#property link \"https://github.com/trading-engine\"",
            "#property version \"1.00\"",
            "#property strict",
            "",
            "//+------------------------------------------------------------------+",
            "//| Expert initialization function                                   |",
            "//+------------------------------------------------------------------+",
            "int OnInit()",
            "{",
            "   return(INIT_SUCCEEDED);",
            "}",
            "",
            "//+------------------------------------------------------------------+",
            "//| Expert tick function                                             |",
            "//+------------------------------------------------------------------+",
            "void OnTick()",
            "{",
        ]
        for i, cond in enumerate(entry_conditions):
            lines.append(f"   if({cond})")
            lines.append("   {")
            lines.append(f"      OrderSend(Symbol(), OP_BUY, 0.1, Ask, 3, 0, 0, \"{strategy_name}\", 0, 0, Green);")
            lines.append("   }")
        for i, cond in enumerate(exit_conditions):
            lines.append(f"   if({cond})")
            lines.append("   {")
            lines.append("      for(int i=OrdersTotal()-1; i>=0; i--)")
            lines.append("      {")
            lines.append("         if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))")
            lines.append("            if(OrderSymbol()==Symbol())")
            lines.append("               OrderClose(OrderTicket(), OrderLots(), Bid, 3, Red);")
            lines.append("      }")
            lines.append("   }")
        lines.append("}")
        return "\n".join(lines)
