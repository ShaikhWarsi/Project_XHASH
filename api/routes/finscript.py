from __future__ import annotations

import asyncio
import importlib.resources
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/finscript", tags=["finscript"])

try:
    _templates_ref = importlib.resources.files("finscript").joinpath("templates")
    TEMPLATES_DIR = Path(str(_templates_ref))
except (ModuleNotFoundError, TypeError):
    TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent / "finscript" / "templates"


def _list_template_files():
    if not TEMPLATES_DIR.exists():
        return []
    return sorted(f for f in TEMPLATES_DIR.iterdir() if f.suffix == ".py")


@router.get("/templates")
async def list_strategy_templates():
    templates = []
    for f in _list_template_files():
        def _read_first_line(path=f):
            with open(path, encoding="utf-8") as fh:
                return fh.readline().strip().strip('"')
        first_line = await asyncio.to_thread(_read_first_line)
        templates.append({
            "name": f.stem,
            "description": first_line,
            "path": str(f.relative_to(TEMPLATES_DIR.parent)),
        })
    return {"templates": templates}


@router.get("/templates/{name}")
async def get_strategy_template(name: str):
    for f in _list_template_files():
        if f.stem == name:
            code = await asyncio.to_thread(lambda p=f: p.read_text(encoding="utf-8"))
            return {"name": name, "code": code}
    raise HTTPException(status_code=404, detail=f"Template '{name}' not found")


class EvaluateRequest(BaseModel):
    code: str
    symbol: str = "AAPL"
    start: str = "2024-01-01"
    end: str = "2024-12-31"


@router.post("/evaluate")
async def evaluate_finscript(req: EvaluateRequest):
    try:
        from finscript import execute_sandboxed as finscript_execute
        import pandas as pd
        import yfinance as yf

        ticker = yf.Ticker(req.symbol)
        df = ticker.history(start=req.start, end=req.end)
        if df.empty:
            return {"error": f"No data for {req.symbol}"}

        df.columns = [c.lower() for c in df.columns]
        data = {req.symbol: df}

        result = finscript_execute(req.code, data)
        return result
    except ImportError as e:
        raise HTTPException(status_code=503, detail=f"Missing dependency: {e}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class ExportRequest(BaseModel):
    code: str
    target: str = "pine_script"
    strategy_name: str = "ExportedStrategy"
    ticker: str = "AAPL"


@router.post("/export")
async def export_finscript(req: ExportRequest):
    try:
        from finscript import parse, PineScriptExporter, MT5Exporter
        from finscript.lexer import Lexer
        from finscript.parser import Parser
        lexer = Lexer(req.code)
        tokens = lexer.tokenize()
        parser = Parser(tokens)
        program = parser.parse()
        indicators = []
        entry_conditions = []
        exit_conditions = []
        for stmt in program.statements:
            from finscript.ast import BuyStmt, SellStmt, PlotStmt
            if isinstance(stmt, BuyStmt):
                entry_conditions.append(f"buy signal at {stmt.quantity}")
            elif isinstance(stmt, SellStmt):
                exit_conditions.append(f"sell signal at {stmt.quantity}")
            elif isinstance(stmt, PlotStmt):
                indicators.append({"name": "unknown", "params": {}})
        if req.target == "pine_script":
            exporter = PineScriptExporter()
            result = exporter.export(
                strategy_name=req.strategy_name,
                indicators=indicators,
                entry_conditions=entry_conditions,
                exit_conditions=exit_conditions,
                ticker=req.ticker,
            )
            return {"target": "pine_script", "code": result, "format": "pinescript"}
        elif req.target == "mt5":
            exporter = MT5Exporter()
            result = exporter.export(req.strategy_name, indicators, entry_conditions, exit_conditions)
            return {"target": "mt5", "code": result, "format": "mq5"}
        else:
            raise HTTPException(status_code=400, detail=f"Unknown target '{req.target}'. Supported: pine_script, mt5")
    except ImportError as e:
        raise HTTPException(status_code=503, detail=f"Missing dependency: {e}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/export/formats")
async def list_export_formats():
    return {"formats": ["pine_script", "mt5"]}
