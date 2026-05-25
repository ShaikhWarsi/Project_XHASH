from __future__ import annotations

import logging
import math
from typing import Any, Optional

import pandas as pd

logger = logging.getLogger(__name__)

from .ast import (
    ArrayExpr, AssignStmt, BinaryExpr, BinOp, BoolExpr, BreakStmt, BuyStmt,
    CallExpr, CompoundAssignStmt, ContinueStmt, Expr, ExprStmt, FnDefStmt,
    ForLoopStmt, IfStmt, IndexExpr, InputDeclStmt, MapExpr, MethodCallExpr,
    NaExpr, NumberExpr, PlotStmt, PrintStmt, Program, RangeExpr, ReturnStmt,
    SellStmt, Stmt, StrategyStmt, StringExpr, StructExpr, SymbolExpr,
    SwitchStmt, TernaryExpr, UnaryExpr, UnaryOp, VarDecl, VariableExpr,
    WhileLoopStmt, AlertStmt,
)
from .builtins import FinScriptRuntime

NAN = float("nan")


class InterpreterError(Exception):
    pass


class ReturnException(Exception):
    def __init__(self, value: Any):
        self.value = value


class BreakException(Exception):
    pass


class ContinueException(Exception):
    pass


class Interpreter:
    def __init__(self, data: Optional[dict[str, pd.DataFrame]] = None):
        self.runtime = FinScriptRuntime()
        self.globals: dict[str, Any] = {}
        self.signals: list[dict] = []
        self.plots: list[dict] = []
        self.alerts: list[dict] = []
        self.functions: dict[str, FnDefStmt] = {}
        self.strategy_state: dict[str, Any] = {
            "position": 0,
            "entry_price": 0.0,
            "equity": 0.0,
            "trades": [],
        }
        if data:
            for symbol, df in data.items():
                self.runtime.set_data(symbol, df)

    def execute(self, program: Program) -> dict[str, Any]:
        self.globals["bar_index"] = lambda: self.runtime.bar_index()
        self.globals["sma"] = lambda s=None, p=14: self.runtime.sma(s, int(p))
        self.globals["ema"] = lambda s=None, p=14: self.runtime.ema(s, int(p))
        self.globals["rma"] = lambda s=None, p=14: self.runtime.rma(s, int(p))
        self.globals["wma"] = lambda s=None, p=14: self.runtime.wma(s, int(p))
        self.globals["hma"] = lambda s=None, p=14: self.runtime.hma(s, int(p))
        self.globals["rsi"] = lambda s=None, p=14: self.runtime.rsi(s, int(p))
        self.globals["macd"] = lambda f=12, sl=26, sg=9: self.runtime.macd(int(f), int(sl), int(sg))
        self.globals["bb"] = lambda s=None, p=20, st=2: self.runtime.bb(s, int(p), int(st))
        self.globals["stoch"] = lambda k=14, d=3: self.runtime.stochastic(int(k), int(d))
        self.globals["atr"] = lambda p=14: self.runtime.atr(int(p))
        self.globals["adx"] = lambda p=14: self.runtime.adx(int(p))
        self.globals["vwap"] = lambda: self.runtime.vwap()
        self.globals["sar"] = lambda a=0.02, m=0.2: self.runtime.sar(float(a), float(m))
        self.globals["crossover"] = lambda a, b: self.runtime.crossover(a, b)
        self.globals["crossunder"] = lambda a, b: self.runtime.crossunder(a, b)
        self.globals["highest"] = lambda s=None, p=10: self.runtime.highest(s, int(p))
        self.globals["lowest"] = lambda s=None, p=10: self.runtime.lowest(s, int(p))
        self.globals["stdev"] = lambda s=None, p=14: self.runtime.stdev(s, int(p))
        self.globals["linreg"] = lambda s=None, p=14: self.runtime.linreg(s, int(p))
        self.globals["change"] = lambda s=None, p=1: self.runtime.change(s, int(p))
        self.globals["roc"] = lambda s=None, p=12: self.runtime.roc(s, int(p))
        self.globals["cum"] = lambda s: self.runtime.cum(s)
        self.globals["tr"] = lambda: self.runtime.tr()
        self.globals["mfi"] = lambda p=14: self.runtime.mfi(int(p))
        self.globals["cci"] = lambda p=20: self.runtime.cci(int(p))
        self.globals["williams_r"] = lambda p=14: self.runtime.williams_r(int(p))
        self.globals["obv"] = lambda: self.runtime.obv()
        self.globals["pivothigh"] = lambda s=None, l=2, r=2: self.runtime.pivot_high(s, int(l), int(r))
        self.globals["pivotlow"] = lambda s=None, l=2, r=2: self.runtime.pivot_low(s, int(l), int(r))
        self.globals["percentrank"] = lambda s, p=50: self.runtime.percentrank(s, int(p))
        self.globals["correlation"] = lambda a, b, p=14: self.runtime.correlation(a, b, int(p))
        self.globals["beta"] = lambda a, b, p=14: self.runtime.beta(a, b, int(p))
        self.globals["sharpe"] = lambda s, r=0.0: self.runtime.sharpe(s, r)
        self.globals["sortino"] = lambda s, r=0.0: self.runtime.sortino(s, r)
        self.globals["max_drawdown"] = lambda s: self.runtime.max_drawdown(s)
        self.globals["cross"] = lambda a, b: self.runtime.cross(a, b)
        self.globals["tostring"] = lambda v: str(v)
        self.globals["tonumber"] = lambda v: float(v) if v is not None else NAN
        self.globals["typeof"] = lambda v: type(v).__name__
        self.globals["abs"] = abs
        self.globals["min"] = min
        self.globals["max"] = max
        self.globals["sqrt"] = math.sqrt
        self.globals["log"] = math.log
        self.globals["exp"] = math.exp
        self.globals["floor"] = math.floor
        self.globals["ceil"] = math.ceil
        self.globals["round"] = round
        self.globals["sin"] = math.sin
        self.globals["cos"] = math.cos
        self.globals["tan"] = math.tan
        self.globals["array"] = lambda *a: list(a)
        self.globals["na"] = NAN
        self.globals["pi"] = math.pi

        try:
            for stmt in program.statements:
                self._execute_stmt(stmt)
        except ReturnException:
            pass

        return {
            "signals": self.signals,
            "plots": self.plots,
            "alerts": self.alerts,
            "strategy": self.strategy_state,
            "globals": {k: v for k, v in self.globals.items() if not callable(v) and not k.startswith("_")},
        }

    def _execute_stmt(self, stmt: Stmt, local_vars: Optional[dict] = None):
        scope = local_vars if local_vars is not None else self.globals

        if isinstance(stmt, ExprStmt):
            self._eval_expr(stmt.expr, scope)
        elif isinstance(stmt, VarDecl):
            val = self._eval_expr(stmt.initializer, scope) if stmt.initializer else NAN
            scope[stmt.name] = val
        elif isinstance(stmt, AssignStmt):
            scope[stmt.name] = self._eval_expr(stmt.value, scope)
        elif isinstance(stmt, CompoundAssignStmt):
            if stmt.name not in scope:
                scope[stmt.name] = 0.0
            current = scope[stmt.name]
            val = self._eval_expr(stmt.value, scope)
            if stmt.op == "+=":
                scope[stmt.name] = current + val if not (isinstance(current, float) and math.isnan(current)) else val
            elif stmt.op == "-=":
                scope[stmt.name] = current - val if not (isinstance(current, float) and math.isnan(current)) else -val
            elif stmt.op == "*=":
                scope[stmt.name] = current * val if not (isinstance(current, float) and math.isnan(current)) else 0
            elif stmt.op == "/=":
                scope[stmt.name] = current / val if not (isinstance(current, float) and math.isnan(current)) else 0
        elif isinstance(stmt, IfStmt):
            cond = self._eval_expr(stmt.condition, scope)
            if self._truthy(cond):
                for s in stmt.then_branch:
                    self._execute_stmt(s, scope)
            else:
                for s in stmt.else_branch:
                    self._execute_stmt(s, scope)
        elif isinstance(stmt, ForLoopStmt):
            iterable = self._eval_expr(stmt.iterable, scope)
            if isinstance(iterable, pd.Series):
                iterable = iterable.values
            for item in (iterable if isinstance(iterable, (list, tuple, range)) else []):
                scope[stmt.var] = item
                try:
                    for s in stmt.body:
                        self._execute_stmt(s, scope)
                except BreakException:
                    break
                except ContinueException:
                    continue
        elif isinstance(stmt, WhileLoopStmt):
            while self._truthy(self._eval_expr(stmt.condition, scope)):
                try:
                    for s in stmt.body:
                        self._execute_stmt(s, scope)
                except BreakException:
                    break
                except ContinueException:
                    continue
        elif isinstance(stmt, FnDefStmt):
            self.functions[stmt.name] = stmt
            scope[stmt.name] = lambda *args, fn=stmt: self._call_user_fn(fn, args, scope)
        elif isinstance(stmt, ReturnStmt):
            val = self._eval_expr(stmt.value, scope) if stmt.value else None
            raise ReturnException(val)
        elif isinstance(stmt, BreakStmt):
            raise BreakException()
        elif isinstance(stmt, ContinueStmt):
            raise ContinueException()
        elif isinstance(stmt, BuyStmt):
            quantity = self._eval_expr(stmt.quantity, scope) if stmt.quantity else 1.0
            self.signals.append({"action": "buy", "symbol": "current", "quantity": float(quantity)})
            self.strategy_state["position"] += float(quantity)
            price = self.runtime.get_last(self.runtime.close()) if not self.runtime.close().empty else 0.0
            self.strategy_state["entry_price"] = price
            self.strategy_state["trades"].append({
                "action": "buy", "quantity": float(quantity), "price": price,
            })
        elif isinstance(stmt, SellStmt):
            quantity = self._eval_expr(stmt.quantity, scope) if stmt.quantity else self.strategy_state["position"]
            self.signals.append({"action": "sell", "symbol": "current", "quantity": float(quantity)})
            price = self.runtime.get_last(self.runtime.close()) if not self.runtime.close().empty else 0.0
            if self.strategy_state["position"] > 0:
                pnl = (price - self.strategy_state["entry_price"]) * min(float(quantity), self.strategy_state["position"])
                self.strategy_state["equity"] += pnl
            self.strategy_state["position"] -= float(quantity)
            self.strategy_state["trades"].append({
                "action": "sell", "quantity": float(quantity), "price": price,
            })
        elif isinstance(stmt, PlotStmt):
            val = self._eval_expr(stmt.expression, scope)
            plot_val = float(val) if isinstance(val, (int, float)) else (float(val.iloc[-1]) if isinstance(val, pd.Series) and not val.empty else NAN)
            self.plots.append({
                "value": plot_val,
                "title": stmt.title or "plot",
            })
        elif isinstance(stmt, StrategyStmt):
            self.signals.append({"action": f"strategy.{stmt.action}", **{k: self._eval_expr(v, scope) for k, v in stmt.kwargs.items()}})
        elif isinstance(stmt, InputDeclStmt):
            scope[stmt.name] = self._eval_expr(stmt.default_value, scope)
        elif isinstance(stmt, AlertStmt):
            cond = self._eval_expr(stmt.condition, scope)
            if self._truthy(cond):
                self.alerts.append({
                    "message": stmt.message or "Alert triggered",
                    "condition": str(cond),
                })
        elif isinstance(stmt, PrintStmt):
            val = self._eval_expr(stmt.expression, scope)
            logger.info("FinScript: %s", val)
        elif isinstance(stmt, SwitchStmt):
            value = self._eval_expr(stmt.value, scope)
            matched = False
            for case_val, body in stmt.cases:
                if case_val is None:
                    for s in body:
                        self._execute_stmt(s, scope)
                    break
                cv = self._eval_expr(case_val, scope)
                if value == cv:
                    for s in body:
                        self._execute_stmt(s, scope)
                    matched = True
                    break
            if not matched:
                for case_val, body in stmt.cases:
                    if case_val is None:
                        for s in body:
                            self._execute_stmt(s, scope)
                        break

    def _eval_expr(self, expr: Optional[Expr], scope: dict) -> Any:
        if expr is None:
            return None
        if isinstance(expr, NumberExpr):
            return expr.value
        if isinstance(expr, BoolExpr):
            return expr.value
        if isinstance(expr, StringExpr):
            return expr.value
        if isinstance(expr, NaExpr):
            return NAN
        if isinstance(expr, SymbolExpr):
            series_map = {
                "CLOSE": self.runtime.close,
                "OPEN": self.runtime.open,
                "HIGH": self.runtime.high,
                "LOW": self.runtime.low,
                "VOLUME": self.runtime.volume,
            }
            fn = series_map.get(expr.name)
            if fn:
                return fn()
            return scope.get(expr.name, NAN)
        if isinstance(expr, VariableExpr):
            if expr.name in scope:
                return scope[expr.name]
            series_map = {
                "close": self.runtime.close, "open": self.runtime.open,
                "high": self.runtime.high, "low": self.runtime.low,
                "volume": self.runtime.volume,
                "hl2": self.runtime.hl2, "hlc3": self.runtime.hlc3,
                "ohlc4": self.runtime.ohlc4,
            }
            fn = series_map.get(expr.name.lower())
            if fn:
                return fn()
            return NAN
        if isinstance(expr, BinaryExpr):
            left = self._eval_expr(expr.left, scope)
            right = self._eval_expr(expr.right, scope)
            if isinstance(left, pd.Series) and isinstance(right, (int, float)):
                right = pd.Series(right, index=left.index)
            if isinstance(right, pd.Series) and isinstance(left, (int, float)):
                left = pd.Series(left, index=right.index)

            if expr.op == BinOp.ADD:
                return left + right
            if expr.op == BinOp.SUB:
                return left - right
            if expr.op == BinOp.MUL:
                return left * right
            if expr.op == BinOp.DIV:
                if isinstance(right, pd.Series):
                    return left / right.replace(0, NAN)
                return left / right if right != 0 else NAN
            if expr.op == BinOp.MOD:
                return left % right if right != 0 else NAN
            if expr.op == BinOp.POW:
                return left ** right
            if expr.op == BinOp.GT:
                return left > right
            if expr.op == BinOp.LT:
                return left < right
            if expr.op == BinOp.GTE:
                return left >= right
            if expr.op == BinOp.LTE:
                return left <= right
            if expr.op == BinOp.EQ:
                if isinstance(left, float) and math.isnan(left):
                    return isinstance(right, float) and math.isnan(right)
                return left == right
            if expr.op == BinOp.NEQ:
                if isinstance(left, float) and math.isnan(left):
                    return not isinstance(right, float) or not math.isnan(right)
                return left != right
            if expr.op == BinOp.AND:
                return self._truthy(left) and self._truthy(right)
            if expr.op == BinOp.OR:
                return self._truthy(left) or self._truthy(right)
        if isinstance(expr, UnaryExpr):
            val = self._eval_expr(expr.operand, scope)
            if expr.op == UnaryOp.NEG:
                return -val
            if expr.op == UnaryOp.NOT:
                return not self._truthy(val)
        if isinstance(expr, CallExpr):
            if expr.callee in self.functions:
                fn = self.functions[expr.callee]
                args = [self._eval_expr(a, scope) for a in expr.args]
                return self._call_user_fn(fn, args, scope)
            fn = scope.get(expr.callee)
            if callable(fn):
                args = [self._eval_expr(a, scope) for a in expr.args]
                try:
                    return fn(*args)
                except Exception as e:
                    logger.debug("FinScript fn call failed: %s", e)
                    return NAN
            return NAN
        if isinstance(expr, MethodCallExpr):
            obj = self._eval_expr(expr.obj, scope)
            args = [self._eval_expr(a, scope) for a in expr.args]
            if isinstance(obj, str) and hasattr(obj, expr.method):
                return getattr(obj, expr.method)(*args)
            if isinstance(obj, list) and expr.method in ("push", "pop", "len"):
                if expr.method == "push":
                    obj.append(args[0])
                    return None
                if expr.method == "pop":
                    return obj.pop()
                if expr.method == "len":
                    return len(obj)
            return NAN
        if isinstance(expr, IndexExpr):
            obj = self._eval_expr(expr.obj, scope)
            index = self._eval_expr(expr.index, scope)
            if isinstance(obj, pd.Series):
                if isinstance(index, int):
                    if index < 0:
                        idx = len(obj) + index
                    else:
                        idx = index
                    return float(obj.iloc[idx]) if 0 <= idx < len(obj) else NAN
                return NAN
            if isinstance(obj, (list, tuple)):
                return obj[int(index)] if 0 <= int(index) < len(obj) else NAN
            if isinstance(obj, dict):
                return obj.get(index, NAN)
            return NAN
        if isinstance(expr, RangeExpr):
            start = self._eval_expr(expr.start, scope) if expr.start else 0
            end = self._eval_expr(expr.end, scope) if expr.end else 0
            return range(int(start), int(end))
        if isinstance(expr, TernaryExpr):
            cond = self._eval_expr(expr.condition, scope)
            if self._truthy(cond):
                return self._eval_expr(expr.then_branch, scope)
            return self._eval_expr(expr.else_branch, scope)
        if isinstance(expr, ArrayExpr):
            return [self._eval_expr(e, scope) for e in expr.elements]
        if isinstance(expr, MapExpr):
            return {str(self._eval_expr(k, scope)): self._eval_expr(v, scope) for k, v in expr.pairs}
        if isinstance(expr, StructExpr):
            return {k: self._eval_expr(v, scope) for k, v in expr.fields.items()}
        return NAN

    def _call_user_fn(self, fn: FnDefStmt, args: list, parent_scope: dict) -> Any:
        local_scope = dict(parent_scope)
        for param, arg in zip(fn.params, args):
            local_scope[param] = arg
        try:
            for stmt in fn.body:
                self._execute_stmt(stmt, local_scope)
        except ReturnException as e:
            return e.value
        return None

    @staticmethod
    def _truthy(val: Any) -> bool:
        if isinstance(val, bool):
            return val
        if isinstance(val, (int, float)):
            return not math.isnan(val) and val != 0
        if isinstance(val, pd.Series):
            return bool(val.iloc[-1]) if not val.empty else False
        if val is None:
            return False
        if isinstance(val, (list, tuple)):
            return len(val) > 0
        if isinstance(val, str):
            return len(val) > 0
        return True
