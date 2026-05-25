from __future__ import annotations

import pytest
from finscript.lexer import Lexer
from finscript.parser import Parser


def parse(code: str):
    tokens = Lexer(code).tokenize()
    return Parser(tokens).parse()


def test_parse_number_expression():
    program = parse("42")
    assert len(program.statements) > 0


def test_parse_binary_expression():
    program = parse("1 + 2")
    assert len(program.statements) > 0


def test_parse_variable_declaration():
    program = parse("x = 10")
    assert len(program.statements) > 0


def test_parse_var_declaration():
    program = parse("var x = 10")
    assert len(program.statements) > 0


def test_parse_if_statement():
    code = """
if close > sma(close, 20)
    buy("AAPL", 10)
"""
    program = parse(code)
    assert len(program.statements) > 0


def test_parse_if_else():
    code = """
if close > open
    buy("AAPL", 10)
else
    sell("AAPL", 10)
"""
    program = parse(code)
    assert len(program.statements) > 0


def test_parse_for_loop():
    code = """
for i = 0 to 10
    x = x + i
"""
    program = parse(code)
    assert len(program.statements) > 0


def test_parse_while_loop():
    code = """
while x < 100
    x = x * 2
"""
    program = parse(code)
    assert len(program.statements) > 0


def test_parse_function_definition():
    code = """
fn calculate_sma(data, period)
    result = sma(data, period)
    return result
"""
    program = parse(code)
    assert len(program.statements) > 0


def test_parse_buy_sell():
    code = 'buy("AAPL", 100)\nsell("AAPL", 50)'
    program = parse(code)
    assert len(program.statements) > 0


def test_parse_plot():
    code = 'plot(sma(close, 20))'
    program = parse(code)
    assert len(program.statements) > 0


def test_parse_strategy():
    code = 'strategy("MyStrategy", overlay=true)'
    program = parse(code)
    assert len(program.statements) > 0


def test_parse_struct():
    code = """
struct Trade
    price
    quantity
"""
    program = parse(code)
    assert len(program.statements) > 0


def test_parse_switch():
    code = """
switch x
    case 1
        y = 10
    case 2
        y = 20
    default
        y = 0
"""
    program = parse(code)
    assert len(program.statements) > 0


def test_parse_function_call():
    program = parse('sma(close, 14)')
    assert len(program.statements) > 0


def test_parse_array():
    program = parse('x = [1, 2, 3]')
    assert len(program.statements) > 0


def test_parse_map():
    program = parse('x = {"key": "value"}')
    assert len(program.statements) > 0
