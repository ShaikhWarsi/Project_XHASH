from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Any, Optional


class BinOp(Enum):
    ADD = "+"
    SUB = "-"
    MUL = "*"
    DIV = "/"
    MOD = "%"
    POW = "^"
    EQ = "=="
    NEQ = "!="
    GT = ">"
    LT = "<"
    GTE = ">="
    LTE = "<="
    AND = "and"
    OR = "or"


class UnaryOp(Enum):
    NEG = "-"
    NOT = "not"


@dataclass
class Expr:
    pass


@dataclass
class NumberExpr(Expr):
    value: float


@dataclass
class BoolExpr(Expr):
    value: bool


@dataclass
class StringExpr(Expr):
    value: str


@dataclass
class SymbolExpr(Expr):
    name: str


@dataclass
class VariableExpr(Expr):
    name: str


@dataclass
class NaExpr(Expr):
    pass


@dataclass
class BinaryExpr(Expr):
    left: Expr
    op: BinOp
    right: Expr


@dataclass
class UnaryExpr(Expr):
    op: UnaryOp
    operand: Expr


@dataclass
class CallExpr(Expr):
    callee: str
    args: list[Expr]


@dataclass
class MethodCallExpr(Expr):
    obj: Expr
    method: str
    args: list[Expr]


@dataclass
class IndexExpr(Expr):
    obj: Expr
    index: Expr


@dataclass
class RangeExpr(Expr):
    start: Optional[Expr]
    end: Optional[Expr]


@dataclass
class TernaryExpr(Expr):
    condition: Expr
    then_branch: Expr
    else_branch: Expr


@dataclass
class ArrayExpr(Expr):
    elements: list[Expr]


@dataclass
class MapExpr(Expr):
    pairs: list[tuple[Expr, Expr]]


@dataclass
class StructExpr(Expr):
    name: str
    fields: dict[str, Expr]


@dataclass
class Stmt:
    pass


@dataclass
class ExprStmt(Stmt):
    expr: Expr


@dataclass
class VarDecl(Stmt):
    name: str
    initializer: Optional[Expr]


@dataclass
class AssignStmt(Stmt):
    name: str
    value: Expr


@dataclass
class CompoundAssignStmt(Stmt):
    name: str
    op: str
    value: Expr


@dataclass
class IfStmt(Stmt):
    condition: Expr
    then_branch: list[Stmt]
    else_branch: list[Stmt]


@dataclass
class ForLoopStmt(Stmt):
    var: str
    iterable: Expr
    body: list[Stmt]


@dataclass
class WhileLoopStmt(Stmt):
    condition: Expr
    body: list[Stmt]


@dataclass
class FnDefStmt(Stmt):
    name: str
    params: list[str]
    body: list[Stmt]


@dataclass
class ReturnStmt(Stmt):
    value: Optional[Expr]


@dataclass
class BreakStmt(Stmt):
    pass


@dataclass
class ContinueStmt(Stmt):
    pass


@dataclass
class BuyStmt(Stmt):
    symbol: Optional[Expr]
    quantity: Optional[Expr]
    limit_price: Optional[Expr]


@dataclass
class SellStmt(Stmt):
    symbol: Optional[Expr]
    quantity: Optional[Expr]
    limit_price: Optional[Expr]


@dataclass
class PlotStmt(Stmt):
    expression: Expr
    title: Optional[str]


@dataclass
class StrategyStmt(Stmt):
    action: str
    kwargs: dict[str, Expr]


@dataclass
class InputDeclStmt(Stmt):
    name: str
    default_value: Expr
    input_type: Optional[str]


@dataclass
class AlertStmt(Stmt):
    condition: Expr
    message: Optional[str]


@dataclass
class PrintStmt(Stmt):
    expression: Expr


@dataclass
class StructDefStmt(Stmt):
    name: str
    fields: dict[str, Optional[str]]


@dataclass
class SwitchStmt(Stmt):
    value: Expr
    cases: list[tuple[Optional[Expr], list[Stmt]]]


@dataclass
class CommentStmt(Stmt):
    text: str


@dataclass
class Program:
    statements: list[Stmt]
    source: str = ""

    def extract_symbols(self) -> list[str]:
        symbols: set[str] = set()

        def _walk_expr(e: Expr):
            if isinstance(e, SymbolExpr):
                symbols.add(e.name)
            elif isinstance(e, BinaryExpr):
                _walk_expr(e.left)
                _walk_expr(e.right)
            elif isinstance(e, UnaryExpr):
                _walk_expr(e.operand)
            elif isinstance(e, CallExpr):
                for a in e.args:
                    _walk_expr(a)
            elif isinstance(e, MethodCallExpr):
                _walk_expr(e.obj)
                for a in e.args:
                    _walk_expr(a)
            elif isinstance(e, IndexExpr):
                _walk_expr(e.obj)
                _walk_expr(e.index)
            elif isinstance(e, TernaryExpr):
                _walk_expr(e.condition)
                _walk_expr(e.then_branch)
                _walk_expr(e.else_branch)
            elif isinstance(e, ArrayExpr):
                for el in e.elements:
                    _walk_expr(el)
            elif isinstance(e, MapExpr):
                for k, v in e.pairs:
                    _walk_expr(k)
                    _walk_expr(v)

        def _walk_stmt(s: Stmt):
            if isinstance(s, ExprStmt):
                _walk_expr(s.expr)
            elif isinstance(s, VarDecl) and s.initializer:
                _walk_expr(s.initializer)
            elif isinstance(s, AssignStmt):
                _walk_expr(s.value)
            elif isinstance(s, CompoundAssignStmt):
                _walk_expr(s.value)
            elif isinstance(s, IfStmt):
                _walk_expr(s.condition)
                for st in s.then_branch:
                    _walk_stmt(st)
                for st in s.else_branch:
                    _walk_stmt(st)
            elif isinstance(s, ForLoopStmt):
                _walk_expr(s.iterable)
                for st in s.body:
                    _walk_stmt(st)
            elif isinstance(s, WhileLoopStmt):
                _walk_expr(s.condition)
                for st in s.body:
                    _walk_stmt(st)
            elif isinstance(s, FnDefStmt):
                for st in s.body:
                    _walk_stmt(st)
            elif isinstance(s, ReturnStmt) and s.value:
                _walk_expr(s.value)
            elif isinstance(s, BuyStmt):
                if s.symbol: _walk_expr(s.symbol)
                if s.quantity: _walk_expr(s.quantity)
            elif isinstance(s, SellStmt):
                if s.symbol: _walk_expr(s.symbol)
                if s.quantity: _walk_expr(s.quantity)
            elif isinstance(s, PlotStmt):
                _walk_expr(s.expression)
            elif isinstance(s, StrategyStmt):
                for v in s.kwargs.values():
                    _walk_expr(v)
            elif isinstance(s, AlertStmt):
                _walk_expr(s.condition)
            elif isinstance(s, PrintStmt):
                _walk_expr(s.expression)
            elif isinstance(s, SwitchStmt):
                _walk_expr(s.value)
                for _, case_body in s.cases:
                    for st in case_body:
                        _walk_stmt(st)

        for stmt in self.statements:
            _walk_stmt(stmt)

        return sorted(symbols)
