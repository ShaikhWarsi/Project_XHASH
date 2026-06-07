import logging
import multiprocessing
import signal
import time

from .ast import Program
from .interpreter import Interpreter
from .lexer import Lexer
from .parser import Parser
from .export import PineScriptExporter, MT5Exporter, TDXExporter

logger = logging.getLogger(__name__)

__all__ = ["Lexer", "Parser", "Interpreter", "Program", "execute", "execute_sandboxed", "extract_symbols",
           "PineScriptExporter", "MT5Exporter", "TDXExporter"]

_FINSCRIPT_TIMEOUT = 30


def _execute_in_process(code: str, data: dict | None, result_queue):
    try:
        result = execute(code, data)
        result_queue.put(result)
    except Exception as e:
        result_queue.put({"error": str(e)})


def execute_sandboxed(code: str, data: dict | None = None) -> dict:
    """Execute FinScript in a sandboxed subprocess with timeout.

    Prevents RCE and runaway scripts.
    """
    ctx = multiprocessing.get_context("spawn")
    result_queue = ctx.Queue()
    proc = ctx.Process(target=_execute_in_process, args=(code, data, result_queue))
    proc.start()
    proc.join(timeout=_FINSCRIPT_TIMEOUT)
    if proc.is_alive():
        proc.kill()
        proc.join()
        raise RuntimeError(f"FinScript execution timed out after {_FINSCRIPT_TIMEOUT}s")
    if not result_queue.empty():
        return result_queue.get()
    return {"error": "FinScript execution failed silently"}


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
