from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["paper"])

_paper_state = {
    "balance": 100000,
    "equity": 100000,
    "buyingPower": 200000,
    "openPnl": 0,
    "totalReturn": 0,
    "totalTrades": 0,
    "winRate": 0,
    "isRunning": False,
}

class PaperAccount(BaseModel):
    balance: float
    equity: float
    buyingPower: float
    openPnl: float
    totalReturn: float
    totalTrades: int
    winRate: float
    isRunning: bool

@router.get("/paper/account")
async def get_paper_account():
    return _paper_state

@router.post("/paper/start")
async def start_paper():
    _paper_state["isRunning"] = True
    return {"success": True}

@router.post("/paper/stop")
async def stop_paper():
    _paper_state["isRunning"] = False
    return {"success": True}

@router.post("/paper/reset")
async def reset_paper():
    _paper_state.update({
        "balance": 100000,
        "equity": 100000,
        "buyingPower": 200000,
        "openPnl": 0,
        "totalReturn": 0,
        "totalTrades": 0,
        "winRate": 0,
        "isRunning": False,
    })
    return {"success": True}
