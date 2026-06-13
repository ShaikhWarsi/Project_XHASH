from __future__ import annotations

import json
import logging
import math
import re
from datetime import datetime, timezone
from typing import Any

from api.services.flow_openalgo_client import FlowOpenAlgoClient

logger = logging.getLogger(__name__)

MAX_NODE_DEPTH = 100
MAX_NODE_VISITS = 500


class WorkflowContext:
    def __init__(self, webhook_data: dict | None = None):
        self.variables: dict[str, Any] = {}
        self.condition_results: dict[str, bool] = {}
        self.webhook_data = webhook_data or {}
        self.logs: list[dict] = []

    def set_variable(self, name: str, value: Any):
        self.variables[name] = value

    def get_variable(self, name: str, default: Any = None) -> Any:
        return self.variables.get(name, default)

    def set_condition(self, node_id: str, result: bool):
        self.condition_results[node_id] = result

    def get_condition(self, node_id: str) -> bool | None:
        return self.condition_results.get(node_id)

    def interpolate(self, value: Any) -> Any:
        if isinstance(value, str):
            def _replacer(m: re.Match) -> str:
                expr = m.group(1).strip()
                parts = expr.split(".")
                current: Any = self.variables
                for part in parts:
                    if "[" in part and part.endswith("]"):
                        key, idx = part.split("[")
                        idx = int(idx.rstrip("]"))
                        if isinstance(current, dict):
                            current = current.get(key, {})
                        if isinstance(current, list) and idx < len(current):
                            current = current[idx]
                        else:
                            return ""
                    elif isinstance(current, dict):
                        current = current.get(part, "")
                    elif isinstance(current, list):
                        try:
                            current = current[int(part)]
                        except (ValueError, IndexError):
                            return ""
                    else:
                        return str(current) if current is not None else ""
                return str(current) if current is not None else ""
            return re.sub(r"\{\{(.+?)\}\}", _replacer, value)
        return value

    def add_log(self, node_id: str, node_type: str, status: str, message: str, data: dict | None = None):
        self.logs.append({
            "node_id": node_id,
            "node_type": node_type,
            "status": status,
            "message": message,
            "data": data or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })


class NodeExecutor:
    def __init__(self, client: FlowOpenAlgoClient):
        self.client = client

    async def execute(self, node: dict, ctx: WorkflowContext) -> dict | None:
        node_type = node.get("type", "")
        data = node.get("data", {})
        handler = getattr(self, f"execute_{node_type}", None)
        if handler:
            interpolated = {k: ctx.interpolate(v) for k, v in data.items()}
            return await handler(interpolated, ctx)
        ctx.add_log(node.get("id", ""), node_type, "skipped", f"No handler for {node_type}")
        return None

    async def execute_start(self, data: dict, ctx: WorkflowContext) -> dict:
        ctx.add_log("", "start", "ok", "Workflow started")
        return {"status": "ok"}

    async def execute_webhookTrigger(self, data: dict, ctx: WorkflowContext) -> dict:
        if ctx.webhook_data:
            ctx.variables.update(ctx.webhook_data)
        return {"status": "ok", "webhook": ctx.webhook_data}

    async def execute_priceAlert(self, data: dict, ctx: WorkflowContext) -> dict:
        symbol = data.get("symbol", "")
        exchange = data.get("exchange", "NSE")
        condition = data.get("condition", "greater_than")
        threshold = float(data.get("threshold", 0))
        quote = await self.client.get_quote(symbol, exchange)
        ltp = quote.get("data", {}).get("ltp", 0)
        met = False
        if condition == "greater_than":
            met = ltp > threshold
        elif condition == "less_than":
            met = ltp < threshold
        elif condition == "crossing_up":
            met = ltp >= threshold > ctx.get_variable(f"_prev_ltp_{symbol}", 0)
        elif condition == "crossing_down":
            met = ltp <= threshold < ctx.get_variable(f"_prev_ltp_{symbol}", 0)
        ctx.set_variable(f"_prev_ltp_{symbol}", ltp)
        ctx.set_variable(f"ltp_{symbol}", ltp)
        ctx.add_log("", "priceAlert", "ok" if met else "skip", f"{symbol} LTP={ltp} threshold={threshold} condition={condition} met={met}")
        return {"status": "ok", "condition": met}

    async def execute_placeOrder(self, data: dict, ctx: WorkflowContext) -> dict:
        result = await self.client.place_order(data)
        if result.get("status") == "success":
            ctx.set_variable("last_order", result.get("data", {}))
        ctx.add_log("", "placeOrder", result["status"], str(result.get("data", {})))
        return result

    async def execute_smartOrder(self, data: dict, ctx: WorkflowContext) -> dict:
        result = await self.client.smart_order(data)
        ctx.add_log("", "smartOrder", result["status"], str(result.get("data", {})))
        return result

    async def execute_basketOrder(self, data: dict, ctx: WorkflowContext) -> dict:
        result = await self.client.basket_order(data)
        ctx.add_log("", "basketOrder", result["status"], str(result.get("data", {})))
        return result

    async def execute_splitOrder(self, data: dict, ctx: WorkflowContext) -> dict:
        result = await self.client.split_order(data)
        ctx.add_log("", "splitOrder", result["status"], str(result.get("data", {})))
        return result

    async def execute_cancelAllOrders(self, data: dict, ctx: WorkflowContext) -> dict:
        result = await self.client.cancel_all_orders()
        ctx.add_log("", "cancelAllOrders", result["status"], str(result.get("data", {})))
        return result

    async def execute_closePositions(self, data: dict, ctx: WorkflowContext) -> dict:
        result = await self.client.close_positions(data)
        ctx.add_log("", "closePositions", result["status"], str(result.get("data", {})))
        return result

    async def execute_placeGtt(self, data: dict, ctx: WorkflowContext) -> dict:
        result = await self.client.place_gtt(data)
        ctx.add_log("", "placeGtt", result["status"], str(result.get("data", {})))
        return result

    async def execute_getQuote(self, data: dict, ctx: WorkflowContext) -> dict:
        result = await self.client.get_quote(data.get("symbol", ""), data.get("exchange", "NSE"))
        ltp = result.get("data", {}).get("ltp", 0)
        ctx.set_variable("data", result.get("data", {}))
        ctx.set_variable(f"ltp_{data.get('symbol', '')}", ltp)
        ctx.add_log("", "getQuote", result["status"], f"LTP={ltp}")
        return result

    async def execute_getFunds(self, data: dict, ctx: WorkflowContext) -> dict:
        result = await self.client.get_funds()
        ctx.set_variable("data", result.get("data", {}))
        ctx.add_log("", "getFunds", result["status"], str(result.get("data", {})))
        return result

    async def execute_openPosition(self, data: dict, ctx: WorkflowContext) -> dict:
        result = await self.client.get_positions()
        ctx.set_variable("data", result.get("data", []))
        ctx.add_log("", "openPosition", result["status"], str(result.get("data", [])))
        return result

    async def execute_orderBook(self, data: dict, ctx: WorkflowContext) -> dict:
        result = await self.client.get_orderbook()
        ctx.set_variable("data", result.get("data", []))
        ctx.add_log("", "orderBook", result["status"], str(len(result.get("data", []))))
        return result

    async def execute_gttOrderbook(self, data: dict, ctx: WorkflowContext) -> dict:
        result = await self.client.get_gtt_orderbook()
        ctx.set_variable("data", result.get("data", []))
        ctx.add_log("", "gttOrderbook", result["status"], str(len(result.get("data", []))))
        return result

    async def execute_telegramAlert(self, data: dict, ctx: WorkflowContext) -> dict:
        message = data.get("message", "Flow Alert")
        result = await self.client.send_telegram(message)
        ctx.add_log("", "telegramAlert", result["status"], message)
        return result

    async def execute_delay(self, data: dict, ctx: WorkflowContext) -> dict:
        import asyncio
        seconds = float(data.get("seconds", 1))
        await asyncio.sleep(seconds)
        ctx.add_log("", "delay", "ok", f"Slept {seconds}s")
        return {"status": "ok"}

    async def execute_variable(self, data: dict, ctx: WorkflowContext) -> dict:
        name = data.get("name", "")
        value = data.get("value", "")
        ctx.set_variable(name, value)
        ctx.add_log("", "variable", "ok", f"Set {name}={value}")
        return {"status": "ok"}

    async def execute_mathExpression(self, data: dict, ctx: WorkflowContext) -> dict:
        expression = data.get("expression", "")
        variable = data.get("variable", "result")
        try:
            import ast
            tree = ast.parse(expression, mode="eval")
            for node in ast.walk(tree):
                if isinstance(node, (ast.Module, ast.Expression, ast.Constant, ast.BinOp, ast.UnaryOp, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Mod, ast.Pow, ast.USub, ast.Num, ast.Name)):
                    continue
                raise ValueError(f"Disallowed expression element: {type(node).__name__}")
            result = eval(compile(tree, "<string>", "eval"), {"__builtins__": {}}, {"math": math})
            ctx.set_variable(variable, result)
            ctx.add_log("", "mathExpression", "ok", f"{expression} = {result}")
            return {"status": "ok", "result": result}
        except Exception as e:
            ctx.add_log("", "mathExpression", "error", str(e))
            return {"status": "error", "error": str(e)}

    async def execute_log(self, data: dict, ctx: WorkflowContext) -> dict:
        message = data.get("message", "")
        ctx.add_log("", "log", "ok", message)
        return {"status": "ok"}

    async def execute_priceCondition(self, data: dict, ctx: WorkflowContext) -> dict:
        symbol = data.get("symbol", "")
        operator = data.get("operator", "greater_than")
        value = float(data.get("value", 0))
        ltp = ctx.get_variable(f"ltp_{symbol}", 0)
        if operator == "greater_than":
            met = ltp > value
        elif operator == "less_than":
            met = ltp < value
        elif operator == "equals":
            met = ltp == value
        else:
            met = False
        ctx.add_log("", "priceCondition", "ok" if met else "skip", f"{symbol} LTP={ltp} {operator} {value} = {met}")
        return {"status": "ok", "condition": met}

    async def execute_positionCheck(self, data: dict, ctx: WorkflowContext) -> dict:
        symbol = data.get("symbol", "")
        min_qty = int(data.get("min_quantity", 1))
        result = await self.client.get_positions()
        positions = result.get("data", [])
        pos = next((p for p in positions if p.get("symbol") == symbol), None)
        met = pos is not None and abs(pos.get("quantity", 0)) >= min_qty
        ctx.add_log("", "positionCheck", "ok", f"{symbol} qty={pos.get('quantity',0) if pos else 0} >= {min_qty} = {met}")
        return {"status": "ok", "condition": met}

    async def execute_fundCheck(self, data: dict, ctx: WorkflowContext) -> dict:
        min_balance = float(data.get("min_balance", 0))
        result = await self.client.get_funds()
        balance = result.get("data", {}).get("balance", 0)
        met = balance >= min_balance
        ctx.add_log("", "fundCheck", "ok", f"Balance={balance} >= {min_balance} = {met}")
        return {"status": "ok", "condition": met}

    async def execute_andGate(self, data: dict, ctx: WorkflowContext) -> dict:
        ctx.add_log("", "andGate", "ok", "AND gate (conditions evaluated upstream)")
        return {"status": "ok", "condition": True}

    async def execute_orGate(self, data: dict, ctx: WorkflowContext) -> dict:
        ctx.add_log("", "orGate", "ok", "OR gate (conditions evaluated upstream)")
        return {"status": "ok", "condition": True}

    async def execute_notGate(self, data: dict, ctx: WorkflowContext) -> dict:
        ctx.add_log("", "notGate", "ok", "NOT gate")
        return {"status": "ok", "condition": True}

    async def execute_timeWindow(self, data: dict, ctx: WorkflowContext) -> dict:
        import pytz
        ist = pytz.timezone("Asia/Kolkata")
        now = datetime.now(ist)
        start = data.get("start", "09:15")
        end = data.get("end", "15:30")
        start_h, start_m = map(int, start.split(":"))
        end_h, end_m = map(int, end.split(":"))
        current = now.hour * 60 + now.minute
        start_total = start_h * 60 + start_m
        end_total = end_h * 60 + end_m
        met = start_total <= current <= end_total
        ctx.add_log("", "timeWindow", "ok" if met else "skip", f"{start}-{end} now={now.hour}:{now.minute:02d} met={met}")
        return {"status": "ok", "condition": met}

    async def execute_httpRequest(self, data: dict, ctx: WorkflowContext) -> dict:
        from api.utils.httpx_client import get_async_client
        url = data.get("url", "")
        method = data.get("method", "GET").upper()
        headers = data.get("headers", {})
        body = data.get("body")
        try:
            client = get_async_client()
            resp = await client.request(method, url, headers=headers, json=body)
            result = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text
            ctx.set_variable("data", result)
            ctx.add_log("", "httpRequest", "ok", f"{method} {url} -> {resp.status_code}")
            return {"status": "ok", "data": result}
        except Exception as e:
            ctx.add_log("", "httpRequest", "error", str(e))
            return {"status": "error", "error": str(e)}


async def execute_workflow(workflow: dict, webhook_data: dict | None = None) -> dict:
    nodes = workflow.get("nodes", [])
    edges = workflow.get("edges", [])
    edge_map: dict[str, list[dict]] = {}
    incoming_map: dict[str, list[dict]] = {}
    for e in edges:
        src = e.get("source", "")
        edge_map.setdefault(src, []).append(e)
        tgt = e.get("target", "")
        incoming_map.setdefault(tgt, []).append(e)

    trigger_node = None
    for n in nodes:
        if n.get("type") in ("start", "webhookTrigger", "priceAlert"):
            trigger_node = n
            break
    if not trigger_node and nodes:
        trigger_node = nodes[0]

    if not trigger_node:
        return {"status": "error", "logs": [], "error": "No trigger node found"}

    ctx = WorkflowContext(webhook_data=webhook_data)
    executor = NodeExecutor(FlowOpenAlgoClient())

    visited: dict[str, int] = {}
    depth = 0

    async def walk(node: dict, current_depth: int):
        nonlocal depth
        if current_depth > MAX_NODE_DEPTH:
            ctx.add_log(node.get("id", ""), node.get("type", ""), "error", "Max depth exceeded")
            return
        nid = node.get("id", "")
        visited[nid] = visited.get(nid, 0) + 1
        if visited[nid] > MAX_NODE_VISITS:
            ctx.add_log(nid, node.get("type", ""), "error", "Max visits exceeded (possible loop)")
            return
        result = await executor.execute(node, ctx)
        depth = max(depth, current_depth)
        if result and result.get("condition") is False:
            false_handles = {"false", "no"}
            for edge in edge_map.get(nid, []):
                sh = edge.get("sourceHandle", "")
                if sh in false_handles:
                    target = next((n for n in nodes if n.get("id") == edge.get("target")), None)
                    if target:
                        await walk(target, current_depth + 1)
        else:
            for edge in edge_map.get(nid, []):
                sh = edge.get("sourceHandle", "")
                if sh in ("false", "no"):
                    continue
                target = next((n for n in nodes if n.get("id") == edge.get("target")), None)
                if target:
                    await walk(target, current_depth + 1)

    await walk(trigger_node, 0)

    from api.services.flow_db import add_execution_log
    execution = add_execution_log(workflow.get("id", ""), "completed", ctx.logs)
    return {"status": "completed", "execution_id": execution.get("id"), "logs": ctx.logs, "depth": depth, "node_count": len(visited)}
