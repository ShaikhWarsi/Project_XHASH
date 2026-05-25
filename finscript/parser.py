from __future__ import annotations

from typing import Optional

from .ast import (
    ArrayExpr, AssignStmt, BinaryExpr, BinOp, BoolExpr, BreakStmt, BuyStmt,
    CallExpr, CommentStmt, CompoundAssignStmt, ContinueStmt, Expr, ExprStmt,
    FnDefStmt, ForLoopStmt, IfStmt, IndexExpr, InputDeclStmt, MapExpr,
    MethodCallExpr, NaExpr, NumberExpr, PlotStmt, PrintStmt, Program,
    RangeExpr, ReturnStmt, SellStmt, Stmt, StrategyStmt, StringExpr,
    StructDefStmt, StructExpr, SwitchStmt, SymbolExpr, TernaryExpr,
    UnaryExpr, UnaryOp, VarDecl, VariableExpr, WhileLoopStmt, AlertStmt,
)
from .tokens import Token, TokenType as T


class ParseError(Exception):
    pass


class Parser:
    def __init__(self, tokens: list[Token]):
        self.tokens = tokens
        self.pos = 0

    def parse(self) -> Program:
        statements: list[Stmt] = []
        while not self._at_end():
            stmt = self._declaration()
            if stmt is not None:
                statements.append(stmt)
        return Program(statements)

    def _declaration(self) -> Optional[Stmt]:
        try:
            if self._match(T.VAR):
                return self._var_declaration()
            if self._match(T.FN):
                return self._fn_declaration()
            if self._match(T.STRUCT):
                return self._struct_declaration()
            if self._match(T.IMPORT):
                return self._import_statement()
            return self._statement()
        except ParseError:
            self._sync()
            return None

    def _var_declaration(self) -> Stmt:
        name = self._consume(T.IDENTIFIER, "Expected variable name").value
        initializer = None
        if self._match(T.EQ):
            initializer = self._expression()
        return VarDecl(name=str(name), initializer=initializer)

    def _fn_declaration(self) -> FnDefStmt:
        name = self._consume(T.IDENTIFIER, "Expected function name").value
        self._consume(T.LPAREN, "Expected '(' after function name")
        params: list[str] = []
        if not self._check(T.RPAREN):
            params.append(str(self._consume(T.IDENTIFIER, "Expected parameter name").value))
            while self._match(T.COMMA):
                params.append(str(self._consume(T.IDENTIFIER, "Expected parameter name").value))
        self._consume(T.RPAREN, "Expected ')' after parameters")
        self._consume(T.LBRACE, "Expected '{' before function body")
        body = self._block()
        return FnDefStmt(name=str(name), params=params, body=body)

    def _struct_declaration(self) -> StructDefStmt:
        name = self._consume(T.IDENTIFIER, "Expected struct name").value
        fields: dict[str, Optional[str]] = {}
        if self._match(T.LBRACE):
            while not self._check(T.RBRACE) and not self._at_end():
                field_name = self._consume(T.IDENTIFIER, "Expected field name").value
                field_type = None
                if self._match(T.COLON):
                    field_type = str(self._consume(T.IDENTIFIER, "Expected field type").value)
                fields[str(field_name)] = field_type
                self._match(T.COMMA)
            self._consume(T.RBRACE, "Expected '}' after struct fields")
        else:
            while self._check(T.IDENTIFIER) and not self._at_end():
                field_name = self._consume(T.IDENTIFIER, "Expected field name").value
                fields[str(field_name)] = None
        return StructDefStmt(name=str(name), fields=fields)

    def _import_statement(self) -> Stmt:
        name = self._consume(T.IDENTIFIER, "Expected module name").value
        return ExprStmt(CallExpr(callee="import", args=[StringExpr(str(name))]))

    def _statement(self) -> Stmt:
        if self._match(T.IF):
            return self._if_statement()
        if self._match(T.FOR):
            return self._for_statement()
        if self._match(T.WHILE):
            return self._while_statement()
        if self._match(T.RETURN):
            return self._return_statement()
        if self._match(T.BREAK):
            return BreakStmt()
        if self._match(T.CONTINUE):
            return ContinueStmt()
        if self._match(T.BUY):
            return self._buy_statement()
        if self._match(T.SELL):
            return self._sell_statement()
        if self._match(T.PLOT):
            return self._plot_statement()
        if self._match(T.STRATEGY):
            return self._strategy_statement()
        if self._match(T.INPUT):
            return self._input_statement()
        if self._match(T.ALERT):
            return self._alert_statement()
        if self._match(T.PRINT):
            return self._print_statement()
        if self._match(T.SWITCH):
            return self._switch_statement()
        if self._match(T.LBRACE):
            body = self._block()
            return ExprStmt(ArrayExpr(body)) if False else body[0] if len(body) == 1 else StmtList(body)

        return self._expression_statement()

    def _block(self) -> list[Stmt]:
        stmts: list[Stmt] = []
        while not self._check(T.RBRACE) and not self._at_end():
            d = self._declaration()
            if d is not None:
                stmts.append(d)
        self._consume(T.RBRACE, "Expected '}' after block")
        return stmts

    def _if_statement(self) -> IfStmt:
        condition = self._expression()
        then_branch = self._block_or_single()
        else_branch: list[Stmt] = []
        if self._match(T.ELSE):
            else_branch = self._block_or_single()
        return IfStmt(condition=condition, then_branch=then_branch, else_branch=else_branch)

    def _for_statement(self) -> ForLoopStmt:
        var = str(self._consume(T.IDENTIFIER, "Expected loop variable").value)
        iterable: Expr
        if self._match(T.ASSIGN):
            start = self._expression()
            self._consume(T.TO, "Expected 'to' after start value")
            end = self._expression()
            iterable = RangeExpr(start=start, end=end)
        else:
            self._consume(T.IN, "Expected 'in' after loop variable")
            iterable = self._expression()
        body = self._block_or_single()
        return ForLoopStmt(var=var, iterable=iterable, body=body)

    def _while_statement(self) -> WhileLoopStmt:
        condition = self._expression()
        body = self._block_or_single()
        return WhileLoopStmt(condition=condition, body=body)

    def _return_statement(self) -> ReturnStmt:
        value = self._expression() if not self._check(T.SEMICOLON) and not self._check(T.RBRACE) else None
        return ReturnStmt(value=value)

    def _buy_statement(self) -> BuyStmt:
        symbol = None
        quantity = None
        limit_price = None
        if self._match(T.LPAREN):
            symbol = self._expression()
            if self._match(T.COMMA):
                quantity = self._expression()
            if self._match(T.COMMA):
                limit_price = self._expression()
            self._consume(T.RPAREN, "Expected ')' after buy args")
        elif not self._check(T.SEMICOLON):
            quantity = self._expression()
        return BuyStmt(symbol=symbol, quantity=quantity, limit_price=limit_price)

    def _sell_statement(self) -> SellStmt:
        symbol = None
        quantity = None
        limit_price = None
        if self._match(T.LPAREN):
            symbol = self._expression()
            if self._match(T.COMMA):
                quantity = self._expression()
            if self._match(T.COMMA):
                limit_price = self._expression()
            self._consume(T.RPAREN, "Expected ')' after sell args")
        elif not self._check(T.SEMICOLON):
            quantity = self._expression()
        return SellStmt(symbol=symbol, quantity=quantity, limit_price=limit_price)

    def _plot_statement(self) -> PlotStmt:
        expr = self._expression()
        title = None
        if self._match(T.COMMA):
            title = str(self._consume(T.STRING, "Expected plot title").value)
        return PlotStmt(expression=expr, title=title)

    def _strategy_statement(self) -> StrategyStmt:
        if self._match(T.LPAREN):
            name_expr = self._expression()
            name = str(getattr(name_expr, 'value', 'strategy'))
            kwargs: dict[str, Expr] = {}
            while self._match(T.COMMA):
                key = str(self._consume(T.IDENTIFIER, "Expected parameter name").value)
                self._consume(T.ASSIGN, "Expected '='")
                kwargs[key] = self._expression()
            self._consume(T.RPAREN, "Expected ')'")
            return StrategyStmt(action=name, kwargs=kwargs)
        action = str(self._consume(T.IDENTIFIER, "Expected strategy action (entry/exit/close)").value)
        kwargs = {}
        if self._match(T.LPAREN):
            while not self._check(T.RPAREN) and not self._at_end():
                key = str(self._consume(T.IDENTIFIER, "Expected parameter name").value)
                self._consume(T.ASSIGN, "Expected '='")
                kwargs[key] = self._expression()
                self._match(T.COMMA)
            self._consume(T.RPAREN, "Expected ')'")
        return StrategyStmt(action=action, kwargs=kwargs)

    def _input_statement(self) -> InputDeclStmt:
        name = str(self._consume(T.IDENTIFIER, "Expected input name").value)
        default_value = NumberExpr(0)
        input_type = None
        if self._match(T.EQ):
            default_value = self._primary()
            if self._match(T.IDENTIFIER):
                input_type = str(self._previous().value)
        return InputDeclStmt(name=name, default_value=default_value, input_type=input_type)

    def _alert_statement(self) -> AlertStmt:
        condition = self._expression()
        message = None
        if self._match(T.COMMA):
            message = str(self._consume(T.STRING, "Expected alert message").value)
        return AlertStmt(condition=condition, message=message)

    def _print_statement(self) -> PrintStmt:
        expr = self._expression()
        return PrintStmt(expression=expr)

    def _switch_statement(self) -> SwitchStmt:
        value = self._expression()
        cases: list[tuple[Optional[Expr], list[Stmt]]] = []
        has_brace = self._match(T.LBRACE)
        while (has_brace and not self._check(T.RBRACE) and not self._at_end()) or (not has_brace and self._check(T.CASE) or self._check(T.DEFAULT)) and not self._at_end():
            if self._match(T.CASE):
                case_val = self._expression()
                if has_brace:
                    self._consume(T.COLON, "Expected ':' after case")
                body: list[Stmt] = []
                stop_tokens = [T.CASE, T.DEFAULT]
                if has_brace:
                    stop_tokens.append(T.RBRACE)
                while not any(self._check(t) for t in stop_tokens) and not self._at_end():
                    d = self._declaration()
                    if d is not None:
                        body.append(d)
                cases.append((case_val, body))
            elif self._match(T.DEFAULT):
                if has_brace:
                    self._consume(T.COLON, "Expected ':' after default")
                    body = self._block()
                else:
                    body = []
                    while not self._check(T.CASE) and not self._check(T.DEFAULT) and not self._at_end():
                        d = self._declaration()
                        if d is not None:
                            body.append(d)
                cases.append((None, body))
        if has_brace:
            self._consume(T.RBRACE, "Expected '}' after switch")
        return SwitchStmt(value=value, cases=cases)

    def _expression_statement(self) -> Stmt:
        expr = self._expression()
        if isinstance(expr, VariableExpr) and self._match(T.ASSIGN):
            return AssignStmt(name=expr.name, value=self._expression())
        if isinstance(expr, VariableExpr) and self._match(T.PLUS_EQ):
            return CompoundAssignStmt(name=expr.name, op="+=", value=self._expression())
        if isinstance(expr, VariableExpr) and self._match(T.MINUS_EQ):
            return CompoundAssignStmt(name=expr.name, op="-=", value=self._expression())
        if isinstance(expr, VariableExpr) and self._match(T.STAR_EQ):
            return CompoundAssignStmt(name=expr.name, op="*=", value=self._expression())
        if isinstance(expr, VariableExpr) and self._match(T.SLASH_EQ):
            return CompoundAssignStmt(name=expr.name, op="/=", value=self._expression())
        self._match(T.SEMICOLON)
        return ExprStmt(expr)

    def _block_or_single(self) -> list[Stmt]:
        if self._match(T.LBRACE):
            return self._block()
        return [self._statement()]

    def _expression(self) -> Expr:
        return self._ternary()

    def _ternary(self) -> Expr:
        expr = self._logical_or()
        if self._match(T.QUESTION):
            then_branch = self._expression()
            self._consume(T.COLON, "Expected ':' in ternary")
            else_branch = self._ternary()
            return TernaryExpr(condition=expr, then_branch=then_branch, else_branch=else_branch)
        return expr

    def _logical_or(self) -> Expr:
        left = self._logical_and()
        while self._match(T.OR):
            right = self._logical_and()
            left = BinaryExpr(left=left, op=BinOp.OR, right=right)
        return left

    def _logical_and(self) -> Expr:
        left = self._equality()
        while self._match(T.AND):
            right = self._equality()
            left = BinaryExpr(left=left, op=BinOp.AND, right=right)
        return left

    def _equality(self) -> Expr:
        left = self._comparison()
        while self._match(T.EQ, T.NEQ):
            op = BinOp.EQ if self._previous().type == T.EQ else BinOp.NEQ
            right = self._comparison()
            left = BinaryExpr(left=left, op=op, right=right)
        return left

    def _comparison(self) -> Expr:
        left = self._term()
        while self._match(T.GT, T.LT, T.GTE, T.LTE):
            op_map = {T.GT: BinOp.GT, T.LT: BinOp.LT, T.GTE: BinOp.GTE, T.LTE: BinOp.LTE}
            op = op_map[self._previous().type]
            right = self._term()
            left = BinaryExpr(left=left, op=op, right=right)
        return left

    def _term(self) -> Expr:
        left = self._factor()
        while self._match(T.PLUS, T.MINUS):
            op = BinOp.ADD if self._previous().type == T.PLUS else BinOp.SUB
            right = self._factor()
            left = BinaryExpr(left=left, op=op, right=right)
        return left

    def _factor(self) -> Expr:
        left = self._unary()
        while self._match(T.STAR, T.SLASH, T.PERCENT):
            op_map = {T.STAR: BinOp.MUL, T.SLASH: BinOp.DIV, T.PERCENT: BinOp.MOD}
            op = op_map[self._previous().type]
            right = self._unary()
            left = BinaryExpr(left=left, op=op, right=right)
        return left

    def _unary(self) -> Expr:
        if self._match(T.MINUS, T.NOT):
            op = UnaryOp.NEG if self._previous().type == T.MINUS else UnaryOp.NOT
            right = self._unary()
            return UnaryExpr(op=op, operand=right)
        return self._power()

    def _power(self) -> Expr:
        left = self._call()
        if self._match(T.CARET):
            right = self._unary()
            return BinaryExpr(left=left, op=BinOp.POW, right=right)
        return left

    def _call(self) -> Expr:
        expr = self._primary()
        while True:
            if self._match(T.LPAREN):
                args = self._finish_call_args()
                if isinstance(expr, VariableExpr):
                    expr = CallExpr(callee=expr.name, args=args)
                elif isinstance(expr, SymbolExpr):
                    expr = CallExpr(callee=expr.name, args=args)
                else:
                    raise ParseError("Cannot call non-identifier")
            elif self._match(T.DOT):
                method = str(self._consume(T.IDENTIFIER, "Expected method name").value)
                self._consume(T.LPAREN, "Expected '(' after method name")
                args = self._finish_call_args()
                expr = MethodCallExpr(obj=expr, method=method, args=args)
            elif self._match(T.LBRACKET):
                index = self._expression()
                self._consume(T.RBRACKET, "Expected ']'")
                expr = IndexExpr(obj=expr, index=index)
            else:
                break
        return expr

    def _finish_call_args(self) -> list[Expr]:
        args: list[Expr] = []
        if not self._check(T.RPAREN):
            args.append(self._expression())
            while self._match(T.COMMA):
                args.append(self._expression())
        self._consume(T.RPAREN, "Expected ')' after arguments")
        return args

    def _primary(self) -> Expr:
        if self._match(T.NUMBER):
            v = self._previous().value
            return NumberExpr(value=v if isinstance(v, (int, float)) else float(v))
        if self._match(T.STRING):
            return StringExpr(value=str(self._previous().value))
        if self._match(T.TRUE):
            return BoolExpr(value=True)
        if self._match(T.FALSE):
            return BoolExpr(value=False)
        if self._match(T.NA):
            return NaExpr()
        if self._match(T.SYMBOL):
            return SymbolExpr(name=str(self._previous().value))
        if self._match(T.IDENTIFIER):
            return VariableExpr(name=str(self._previous().value))
        if self._match(T.LPAREN):
            expr = self._expression()
            self._consume(T.RPAREN, "Expected ')' after expression")
            return expr
        if self._match(T.LBRACKET):
            elements: list[Expr] = []
            if not self._check(T.RBRACKET):
                elements.append(self._expression())
                while self._match(T.COMMA):
                    elements.append(self._expression())
            self._consume(T.RBRACKET, "Expected ']'")
            return ArrayExpr(elements=elements)
        if self._match(T.LBRACE):
            if self._check(T.RBRACE):
                self._advance()
                return MapExpr(pairs=[])
            key = self._expression()
            if self._match(T.COLON):
                value = self._expression()
                pairs = [(key, value)]
                while self._match(T.COMMA):
                    k = self._expression()
                    self._consume(T.COLON, "Expected ':'")
                    v = self._expression()
                    pairs.append((k, v))
                self._consume(T.RBRACE, "Expected '}'")
                return MapExpr(pairs=pairs)
            else:
                self._consume(T.RBRACE, "Expected '}'")
                return MapExpr(pairs=[])
        if self._match(T.MINUS):
            return UnaryExpr(op=UnaryOp.NEG, operand=self._primary())
        raise ParseError(f"Unexpected token: {self._peek()}")

    def _match(self, *types: T) -> bool:
        for t in types:
            if self._check(t):
                self._advance()
                return True
        return False

    def _check(self, t: T) -> bool:
        if self._at_end():
            return False
        return self._peek().type == t

    def _advance(self) -> Token:
        if not self._at_end():
            self.pos += 1
        return self._previous()

    def _consume(self, t: T, msg: str) -> Token:
        if self._check(t):
            return self._advance()
        raise ParseError(f"{msg} at line {self._peek().line}: got {self._peek().type}")

    def _peek(self) -> Token:
        return self.tokens[self.pos]

    def _previous(self) -> Token:
        return self.tokens[self.pos - 1]

    def _at_end(self) -> bool:
        return self._peek().type == T.EOF

    def _sync(self):
        self._advance()
        while not self._at_end():
            if self._previous().type in (T.SEMICOLON, T.RBRACE):
                return
            if self._peek().type in (T.VAR, T.FN, T.IF, T.FOR, T.WHILE, T.RETURN, T.BUY, T.SELL):
                return
            self._advance()


class StmtList(Stmt):
    def __init__(self, stmts: list[Stmt]):
        self.statements = stmts
