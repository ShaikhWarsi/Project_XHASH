from __future__ import annotations

from dataclasses import dataclass
from enum import Enum, auto


class TokenType(Enum):
    NUMBER = auto()
    STRING = auto()
    IDENTIFIER = auto()
    SYMBOL = auto()

    TRUE = auto()
    FALSE = auto()
    NA = auto()

    IF = auto()
    ELSE = auto()
    FOR = auto()
    WHILE = auto()
    FN = auto()
    RETURN = auto()
    BREAK = auto()
    CONTINUE = auto()
    IN = auto()

    BUY = auto()
    SELL = auto()
    PLOT = auto()
    STRATEGY = auto()
    INPUT = auto()
    STRUCT = auto()
    ALERT = auto()
    PRINT = auto()
    SWITCH = auto()
    CASE = auto()
    DEFAULT = auto()
    IMPORT = auto()
    EXPORT = auto()
    AND = auto()
    OR = auto()
    NOT = auto()
    VAR = auto()
    TO = auto()

    PLUS = auto()
    MINUS = auto()
    STAR = auto()
    SLASH = auto()
    PERCENT = auto()
    CARET = auto()

    EQ = auto()
    NEQ = auto()
    GT = auto()
    LT = auto()
    GTE = auto()
    LTE = auto()

    ASSIGN = auto()
    PLUS_EQ = auto()
    MINUS_EQ = auto()
    STAR_EQ = auto()
    SLASH_EQ = auto()

    LPAREN = auto()
    RPAREN = auto()
    LBRACE = auto()
    RBRACE = auto()
    LBRACKET = auto()
    RBRACKET = auto()

    COMMA = auto()
    DOT = auto()
    COLON = auto()
    SEMICOLON = auto()
    ARROW = auto()
    DOTDOT = auto()
    QUESTION = auto()
    PIPE = auto()

    EOF = auto()


@dataclass
class Token:
    type: TokenType
    value: str | int | float | None
    line: int
    col: int

    def __repr__(self):
        return f"Token({self.type}, {self.value}, L{self.line}:{self.col})"
