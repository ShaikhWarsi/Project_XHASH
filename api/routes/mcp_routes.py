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
    try:
        tool_manager = mcp.get_tool_manager()
        for tool in tool_manager.list_tools():
            tools.append({
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters,
            })
    except Exception:
        return {"tools": [], "count": 0}
    return {"tools": tools, "count": len(tools)}


@router.get("/providers")
async def list_mcp_providers():
    from mcp_server import mcp
    return {"status": "available", "providers": list(mcp.list_providers()) if hasattr(mcp, "list_providers") else []}
