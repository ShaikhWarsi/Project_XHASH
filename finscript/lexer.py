from __future__ import annotations

from .tokens import Token, TokenType as T

_KEYWORDS: dict[str, T] = {
    "if": T.IF, "else": T.ELSE, "for": T.FOR, "while": T.WHILE,
    "fn": T.FN, "return": T.RETURN, "break": T.BREAK, "continue": T.CONTINUE,
    "in": T.IN, "true": T.TRUE, "false": T.FALSE, "na": T.NA,
    "buy": T.BUY, "sell": T.SELL, "plot": T.PLOT, "strategy": T.STRATEGY,
    "input": T.INPUT, "struct": T.STRUCT, "alert": T.ALERT, "print": T.PRINT,
    "switch": T.SWITCH, "case": T.CASE, "default": T.DEFAULT,
    "import": T.IMPORT, "export": T.EXPORT, "and": T.AND, "or": T.OR,
    "not": T.NOT, "var": T.VAR, "to": T.TO,
}

_TWO_CHAR: dict[str, T] = {
    "==": T.EQ, "!=": T.NEQ, ">=": T.GTE, "<=": T.LTE,
    "+=": T.PLUS_EQ, "-=": T.MINUS_EQ, "*=": T.STAR_EQ, "/=": T.SLASH_EQ,
    "..": T.DOTDOT, "->": T.ARROW,
}


class LexerError(Exception):
    pass


class Lexer:
    def __init__(self, source: str):
        self.source = source
        self.tokens: list[Token] = []
        self.start = 0
        self.start_col = 1
        self.current = 0
        self.line = 1
        self.col = 1

    def tokenize(self) -> list[Token]:
        while not self._at_end():
            self.start = self.current
            self.start_col = self.col
            self._scan_token()
        self.tokens.append(Token(T.EOF, None, self.line, self.col))
        return self.tokens

    def _scan_token(self):
        c = self._advance()
        if c in " \t\r":
            self.col += 1
            return
        if c == "\n":
            self.line += 1
            self.col = 1
            return

        if c == "/" and self._peek() == "/":
            while self._peek() != "\n" and not self._at_end():
                self._advance()
            return
        if c == "/" and self._peek() == "*":
            self._advance()
            while not self._at_end():
                if self._peek() == "*" and self._peek_next() == "/":
                    self._advance()
                    self._advance()
                    break
                if self._peek() == "\n":
                    self.line += 1
                    self.col = 1
                self._advance()
            return

        if c.isdigit() or (c == "." and self._peek().isdigit()):
            self._number(c)
        elif c.isalpha() or c == "_":
            self._identifier()
        elif c == '"' or c == "'":
            self._string(c)
        else:
            self._operator(c)

    def _number(self, first: str):
        while self._peek().isdigit():
            self._advance()
        if self._peek() == "." and self._peek_next().isdigit():
            self._advance()
            while self._peek().isdigit():
                self._advance()
        val = float(self.source[self.start:self.current])
        if val == int(val):
            val = int(val)
        self._emit(T.NUMBER, val)

    def _identifier(self):
        while self._peek().isalnum() or self._peek() == "_":
            self._advance()
        word = self.source[self.start:self.current]
        kw = _KEYWORDS.get(word)
        if kw:
            self._emit(kw, word)
        elif word.isupper():
            self._emit(T.SYMBOL, word)
        else:
            self._emit(T.IDENTIFIER, word)

    def _string(self, quote: str):
        while self._peek() != quote and not self._at_end():
            if self._peek() == "\\":
                self._advance()
            self._advance()
        if self._at_end():
            raise LexerError(f"Unterminated string at line {self.line}")
        self._advance()
        val = self.source[self.start + 1:self.current - 1]
        self._emit(T.STRING, val)

    def _operator(self, c: str):
        two = c + self._peek()
        if two in _TWO_CHAR:
            self._advance()
            self._emit(_TWO_CHAR[two], two)
            return

        single: dict[str, T] = {
            "+": T.PLUS, "-": T.MINUS, "*": T.STAR, "/": T.SLASH,
            "%": T.PERCENT, "^": T.CARET, "(": T.LPAREN, ")": T.RPAREN,
            "{": T.LBRACE, "}": T.RBRACE, "[": T.LBRACKET, "]": T.RBRACKET,
            ",": T.COMMA, ".": T.DOT, ":": T.COLON, ";": T.SEMICOLON,
            "?": T.QUESTION, "|": T.PIPE, "=": T.ASSIGN,
            ">": T.GT, "<": T.LT,
        }
        t = single.get(c)
        if t:
            self._emit(t, c)
        else:
            raise LexerError(f"Unexpected character '{c}' at line {self.line}")

    def _advance(self) -> str:
        c = self.source[self.current]
        self.current += 1
        self.col += 1
        return c

    def _peek(self) -> str:
        return self.source[self.current] if self.current < len(self.source) else "\0"

    def _peek_next(self) -> str:
        return self.source[self.current + 1] if self.current + 1 < len(self.source) else "\0"

    def _at_end(self) -> bool:
        return self.current >= len(self.source)

    def _emit(self, t: T, value: str | float | None = None):
        self.tokens.append(Token(t, value, self.line, self.start_col))
