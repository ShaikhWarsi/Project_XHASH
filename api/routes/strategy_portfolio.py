from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from api.services.strategy_portfolio_service import (
    _validate_payload,
    delete_portfolio_entry,
    get_portfolio_entry,
    list_portfolio,
    save_portfolio_entry,
)
from api.response import success_response, not_found, bad_request

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/openalgo/strategy-portfolio", tags=["openalgo_strategy_portfolio"])


@router.get("/")
async def list_strategies(watchlist: str | None = None):
    try:
        entries = list_portfolio(watchlist)
        return success_response({"strategies": entries, "total": len(entries)})
    except Exception as e:
        logger.exception("List strategies failed: %s", e)
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.get("/{entry_id}")
async def get_strategy(entry_id: int):
    try:
        entry = get_portfolio_entry(entry_id)
        if not entry:
            return not_found(f"Strategy {entry_id} not found")
        return success_response(entry)
    except Exception as e:
        logger.exception("Get strategy failed: %s", e)
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.post("/")
async def create_strategy(data: dict):
    try:
        valid, err = _validate_payload(data)
        if not valid:
            return bad_request(err)
        entry = save_portfolio_entry(
            name=data["name"],
            watchlist=data.get("watchlist", "mytrades"),
            underlying=data["underlying"],
            exchange=data["exchange"],
            expiry=data.get("expiry"),
            legs=data.get("legs", []),
            notes=data.get("notes"),
        )
        return success_response(entry)
    except Exception as e:
        logger.exception("Create strategy failed: %s", e)
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.put("/{entry_id}")
async def update_strategy(entry_id: int, data: dict):
    try:
        existing = get_portfolio_entry(entry_id)
        if not existing:
            return not_found(f"Strategy {entry_id} not found")
        valid, err = _validate_payload(data)
        if not valid:
            return bad_request(err)
        entry = save_portfolio_entry(
            name=data["name"],
            watchlist=data.get("watchlist", "mytrades"),
            underlying=data["underlying"],
            exchange=data["exchange"],
            expiry=data.get("expiry"),
            legs=data.get("legs", []),
            notes=data.get("notes"),
            entry_id=entry_id,
        )
        return success_response(entry)
    except Exception as e:
        logger.exception("Update strategy failed: %s", e)
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.delete("/{entry_id}")
async def delete_strategy(entry_id: int):
    try:
        found = delete_portfolio_entry(entry_id)
        if not found:
            return not_found(f"Strategy {entry_id} not found")
        return success_response({"deleted": True, "id": entry_id})
    except Exception as e:
        logger.exception("Delete strategy failed: %s", e)
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})
