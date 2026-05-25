from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from signals.alpha_zoo.registry import get_default_registry, RegistryError, SkipAlpha

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/alphas", tags=["alphas"])


@router.get("")
async def list_alphas(
    zoo: str | None = Query(None),
    theme: str | None = Query(None),
    universe: str | None = Query(None),
):
    reg = get_default_registry()
    ids = reg.list(zoo=zoo, theme=theme, universe=universe)
    items = []
    for aid in ids:
        alpha = reg.get(aid)
        items.append({"id": alpha.id, "zoo": alpha.zoo, "meta": alpha.meta})
    return {"alphas": items, "count": len(items), "health": reg.health()}


@router.get("/{alpha_id}")
async def get_alpha(alpha_id: str):
    reg = get_default_registry()
    try:
        alpha = reg.get(alpha_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Alpha {alpha_id} not found")
    try:
        source = reg.get_source(alpha_id)
    except (RegistryError, NotImplementedError):
        source = ""
    return {"alpha": {"id": alpha.id, "zoo": alpha.zoo, "meta": alpha.meta}, "source": source}


@router.get("/{alpha_id}/source")
async def get_alpha_source(alpha_id: str):
    reg = get_default_registry()
    try:
        source = reg.get_source(alpha_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Alpha {alpha_id} not found")
    except RegistryError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"id": alpha_id, "source": source}


class BenchRequest(BaseModel):
    zoo: str
    alpha_ids: list[str] | None = None
    symbols: list[str] | None = None
    start_date: str = "2024-01-01"
    end_date: str = "2025-01-01"
    show_skipped: bool = False


@router.post("/bench")
async def bench_alphas(req: BenchRequest):
    import pandas as pd
    import yfinance as yf

    reg = get_default_registry()

    alpha_ids = req.alpha_ids
    if not alpha_ids:
        alpha_ids = reg.list(zoo=req.zoo)
    if not alpha_ids:
        raise HTTPException(status_code=400, detail=f"No alphas found for zoo={req.zoo}")

    symbols = req.symbols or ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM", "V", "JNJ"]

    panel: dict[str, pd.DataFrame] = {}
    for s in symbols:
        ticker = yf.Ticker(s)
        df = ticker.history(start=req.start_date, end=req.end_date)
        if df.empty:
            continue
        df.columns = [c.lower() for c in df.columns]
        df.index.name = "date"
        for col in ["open", "high", "low", "close", "volume"]:
            if col not in panel:
                panel[col] = pd.DataFrame(index=df.index)
            panel[col][s] = df[col]

    from signals.alpha_zoo.bench_runner import run_bench

    result = run_bench(req.zoo, alpha_ids, panel, registry=reg)

    if not req.show_skipped:
        result.pop("skipped", None)
        result.pop("rows", None)

    return result


@router.get("/{alpha_id}/bench")
async def get_alpha_bench(alpha_id: str):
    reg = get_default_registry()
    try:
        alpha = reg.get(alpha_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Alpha {alpha_id} not found")
    return {
        "alpha_id": alpha_id,
        "zoo": alpha.zoo,
        "status": "not_benchmarked",
        "metrics": {},
    }


@router.get("/health")
async def registry_health():
    reg = get_default_registry()
    return reg.health()


@router.get("/manifest")
async def registry_manifest():
    reg = get_default_registry()
    return reg.export_manifest()
