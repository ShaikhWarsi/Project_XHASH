from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/finscript", tags=["finscript"])


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
