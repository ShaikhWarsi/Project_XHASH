from __future__ import annotations

import logging
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/llm", tags=["llm"])

DEFAULT_MODELS = [
    {"id": "gpt-4o", "name": "GPT-4o", "provider": "openai", "capabilities": ["chat", "reasoning"], "enabled": True},
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openai", "capabilities": ["chat"], "enabled": True},
    {"id": "claude-3-opus", "name": "Claude 3 Opus", "provider": "anthropic", "capabilities": ["chat", "reasoning"], "enabled": True},
    {"id": "claude-3-sonnet", "name": "Claude 3 Sonnet", "provider": "anthropic", "capabilities": ["chat", "reasoning"], "enabled": True},
    {"id": "o1-mini", "name": "O1 Mini", "provider": "openai", "capabilities": ["reasoning"], "enabled": True},
    {"id": "deepseek-r1", "name": "DeepSeek R1", "provider": "deepseek", "capabilities": ["chat", "reasoning"], "enabled": True},
]


class CompleteRequest(BaseModel):
    model: str
    prompt: str
    temperature: float = 0.7
    max_tokens: int = 2048
    reasoning: bool = False


@router.get("/models")
async def list_models():
    return {"models": DEFAULT_MODELS}


@router.post("/complete")
async def llm_complete(req: CompleteRequest):
    supported_ids = {m["id"] for m in DEFAULT_MODELS}
    if req.model not in supported_ids:
        raise HTTPException(status_code=400, detail=f"Unknown model '{req.model}'. Supported: {', '.join(sorted(supported_ids))}")
    return {
        "model": req.model,
        "content": f"[{req.model} placeholder] Received prompt ({len(req.prompt)} chars). Temperature={req.temperature}, max_tokens={req.max_tokens}, reasoning={req.reasoning}.",
        "usage": {"prompt_tokens": len(req.prompt) // 4, "completion_tokens": 16},
    }
