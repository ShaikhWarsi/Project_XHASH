from __future__ import annotations

import pytest
from finscript.lexer import Lexer
from finscript.tokens import TokenType


def tokenize(code: str) -> list:
    return Lexer(code).tokenize()


def test_number_tokens():
    tokens = tokenize("42 3.14")
    assert tokens[0].type == TokenType.NUMBER
    assert tokens[0].value == 42
    assert tokens[1].type == TokenType.NUMBER
    assert tokens[1].value == 3.14


def test_string_tokens():
    tokens = tokenize('"hello" \'world\'')
    assert tokens[0].type == TokenType.STRING
    assert tokens[0].value == "hello"
    assert tokens[1].type == TokenType.STRING
    assert tokens[1].value == "world"


def test_identifier_and_keyword():
    tokens = tokenize("if else for while fn return")
    assert tokens[0].type == TokenType.IF
    assert tokens[1].type == TokenType.ELSE
    assert tokens[2].type == TokenType.FOR
    assert tokens[3].type == TokenType.WHILE
    assert tokens[4].type == TokenType.FN
    assert tokens[5].type == TokenType.RETURN


def test_symbol_tokens():
    tokens = tokenize("AAPL CLOSE OPEN HIGH LOW VOLUME")
    non_eof = [t for t in tokens if t.type != TokenType.EOF]
    assert len(non_eof) == 6
    for t in non_eof:
        assert t.type == TokenType.SYMBOL


def test_operator_tokens():
    tokens = tokenize("+ - * / % ^")
    assert tokens[0].type == TokenType.PLUS
    assert tokens[1].type == TokenType.MINUS
    assert tokens[2].type == TokenType.STAR
    assert tokens[3].type == TokenType.SLASH
    assert tokens[4].type == TokenType.PERCENT
    assert tokens[5].type == TokenType.CARET


def test_comparison_tokens():
    tokens = tokenize("== != > < >= <=")
    assert tokens[0].type == TokenType.EQ
    assert tokens[1].type == TokenType.NEQ
    assert tokens[2].type == TokenType.GT
    assert tokens[3].type == TokenType.LT
    assert tokens[4].type == TokenType.GTE
    assert tokens[5].type == TokenType.LTE


def test_assignment_tokens():
    tokens = tokenize("= += -= *= /=")
    assert tokens[0].type == TokenType.ASSIGN
    assert tokens[1].type == TokenType.PLUS_EQ
    assert tokens[2].type == TokenType.MINUS_EQ
    assert tokens[3].type == TokenType.STAR_EQ
    assert tokens[4].type == TokenType.SLASH_EQ


def test_delimiter_tokens():
    tokens = tokenize("( ) { } [ ] , . : ;")
    assert tokens[0].type == TokenType.LPAREN
    assert tokens[1].type == TokenType.RPAREN
    assert tokens[2].type == TokenType.LBRACE
    assert tokens[3].type == TokenType.RBRACE
    assert tokens[4].type == TokenType.LBRACKET
    assert tokens[5].type == TokenType.RBRACKET
    assert tokens[6].type == TokenType.COMMA
    assert tokens[7].type == TokenType.DOT
    assert tokens[8].type == TokenType.COLON
    assert tokens[9].type == TokenType.SEMICOLON


def test_two_char_operators():
    tokens = tokenize(".. ->")
    assert tokens[0].type == TokenType.DOTDOT
    assert tokens[1].type == TokenType.ARROW


def test_comments_skipped():
    tokens = tokenize("// this is a comment\n42")
    assert len(tokens) >= 1
    assert tokens[0].type == TokenType.NUMBER


def test_keywords():
    tokens = tokenize("buy sell plot strategy input struct alert print switch case default var")
    assert tokens[0].type == TokenType.BUY
    assert tokens[1].type == TokenType.SELL
    assert tokens[2].type == TokenType.PLOT
    assert tokens[3].type == TokenType.STRATEGY
    assert tokens[4].type == TokenType.INPUT
    assert tokens[5].type == TokenType.STRUCT
    assert tokens[6].type == TokenType.ALERT
    assert tokens[7].type == TokenType.PRINT
    assert tokens[8].type == TokenType.SWITCH
    assert tokens[9].type == TokenType.CASE
    assert tokens[10].type == TokenType.DEFAULT
    assert tokens[11].type == TokenType.VAR


def test_logical_operators():
    tokens = tokenize("and or not")
    assert tokens[0].type == TokenType.AND
    assert tokens[1].type == TokenType.OR
    assert tokens[2].type == TokenType.NOT


def test_boolean_literals():
    tokens = tokenize("true false")
    assert tokens[0].type == TokenType.TRUE
    assert tokens[1].type == TokenType.FALSE


def test_identifier_names():
    tokens = tokenize("myVar sma_20 calculate_rsi")
    non_eof = [t for t in tokens if t.type != TokenType.EOF]
    assert len(non_eof) == 3
    for t in non_eof:
        assert t.type == TokenType.IDENTIFIER


def test_eof_token():
    tokens = tokenize("")
    assert len(tokens) >= 1
    assert tokens[-1].type == TokenType.EOF


def test_line_and_col_tracking():
    tokens = tokenize("42\n3.14")
    assert tokens[0].line == 1
    assert tokens[0].col == 1
    assert tokens[1].line == 2
    assert tokens[1].col == 1
