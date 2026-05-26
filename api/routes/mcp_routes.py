from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mcp", tags=["mcp"])


@router.get("/tools")
async def list_mcp_tools():
    from mcp_server import mcp
    tools = []
    for tool in mcp._tool_manager._tools.values():
        tools.append({
            "name": tool.name,
            "description": tool.description,
            "parameters": tool.parameters,
        })
    return {"tools": tools, "count": len(tools)}


@router.get("/providers")
async def list_mcp_providers():
    try:
        from api.mcp_extensions import mcp_server
        return {"status": "available"}
    except ImportError:
        return {"status": "not_loaded"}
