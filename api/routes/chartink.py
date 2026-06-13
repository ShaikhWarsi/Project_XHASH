from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.services.chartink_service import (
    create_strategy,
    get_strategy,
    list_strategies,
    update_strategy,
    delete_strategy,
    process_webhook,
    list_symbol_mappings,
    add_symbol_mapping,
    remove_symbol_mapping,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/openalgo/chartink", tags=["chartink"])


class StrategyCreate(BaseModel):
    name: str
    symbol: str
    exchange: str = "NSE"
    action: str = "BUY"
    quantity: int = 1
    product: str = "MIS"
    pricetype: str = "MARKET"
    intraday: bool = True
    enabled: bool = True


class StrategyUpdate(BaseModel):
    name: str | None = None
    symbol: str | None = None
    exchange: str | None = None
    action: str | None = None
    quantity: int | None = None
    product: str | None = None
    pricetype: str | None = None
    intraday: bool | None = None
    enabled: bool | None = None


class SymbolMappingCreate(BaseModel):
    chartink_symbol: str
    trading_symbol: str
    exchange: str = "NSE"


@router.post("/webhook")
async def webhook(body: dict):
    result = await process_webhook(body)
    return result


@router.get("/strategies")
async def get_strategies():
    return list_strategies()


@router.post("/strategies")
async def create_strategy_endpoint(data: StrategyCreate):
    return create_strategy(data.model_dump())


@router.get("/strategies/{id}")
async def get_strategy_endpoint(id: str):
    strategy = get_strategy(id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return strategy


@router.put("/strategies/{id}")
async def update_strategy_endpoint(id: str, data: StrategyUpdate):
    strategy = update_strategy(id, data.model_dump(exclude_none=True))
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return strategy


@router.delete("/strategies/{id}")
async def delete_strategy_endpoint(id: str):
    if not delete_strategy(id):
        raise HTTPException(status_code=404, detail="Strategy not found")
    return {"status": "deleted"}


@router.get("/symbols")
async def get_symbols():
    return list_symbol_mappings()


@router.post("/symbols")
async def create_symbol_mapping(data: SymbolMappingCreate):
    return add_symbol_mapping(data.model_dump())


@router.delete("/symbols/{id}")
async def delete_symbol_mapping(id: str):
    if not remove_symbol_mapping(id):
        raise HTTPException(status_code=404, detail="Symbol mapping not found")
    return {"status": "deleted"}
