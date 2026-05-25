from .ast import Program
from .interpreter import Interpreter
from .lexer import Lexer
from .parser import Parser
from .export import PineScriptExporter, MT5Exporter, TDXExporter

__all__ = ["Lexer", "Parser", "Interpreter", "Program", "execute", "extract_symbols",
           "PineScriptExporter", "MT5Exporter", "TDXExporter"]


def execute(code: str, data: dict | None = None) -> dict:
    """Execute a FinScript strategy script.

    Args:
        code: FinScript source code (PineScript-like syntax)
        data: Optional dict of {symbol: pd.DataFrame} with OHLCV data

    Returns:
        dict with keys: signals, plots, alerts, strategy, globals
    """
    lexer = Lexer(code)
    tokens = lexer.tokenize()
    parser = Parser(tokens)
    program = parser.parse()
    interpreter = Interpreter(data)
    return interpreter.execute(program)


def extract_symbols(code: str) -> list[str]:
    """Extract all uppercase ticker symbols referenced in the code."""
    lexer = Lexer(code)
    tokens = lexer.tokenize()
    parser = Parser(tokens)
    program = parser.parse()
    return program.extract_symbols()
