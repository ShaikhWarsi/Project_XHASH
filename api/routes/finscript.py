from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/finscript", tags=["finscript"])

TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent / "finscript" / "templates"


def _list_template_files():
    if not TEMPLATES_DIR.exists():
        return []
    return sorted(f for f in TEMPLATES_DIR.iterdir() if f.suffix == ".py")


@router.get("/templates")
async def list_strategy_templates():
    templates = []
    for f in _list_template_files():
        with open(f, encoding="utf-8") as fh:
            first_line = fh.readline().strip().strip('"')
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
            return {"name": name, "code": f.read_text(encoding="utf-8")}
    raise HTTPException(status_code=404, detail=f"Template '{name}' not found")


class EvaluateRequest(BaseModel):
    code: str
    symbol: str = "AAPL"
    start: str = "2024-01-01"
    end: str = "2024-12-31"


@router.post("/evaluate")
async def evaluate_finscript(req: EvaluateRequest):
    try:
        from finscript import execute as finscript_execute
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
