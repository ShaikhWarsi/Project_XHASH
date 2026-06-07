from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

PROMPTS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "prompts.json")

_prompts_store: list[dict[str, Any]] = []


def _load_prompts():
    global _prompts_store
    try:
        if os.path.exists(PROMPTS_FILE):
            with open(PROMPTS_FILE, "r") as f:
                _prompts_store = json.load(f)
        else:
            _prompts_store = []
    except Exception as e:
        logger.warning("Failed to load prompts from file: %s", e)
        _prompts_store = []


def _save_prompts():
    try:
        os.makedirs(os.path.dirname(PROMPTS_FILE), exist_ok=True)
        with open(PROMPTS_FILE, "w") as f:
            json.dump(_prompts_store, f, indent=2, default=str)
    except Exception as e:
        logger.warning("Failed to save prompts to file: %s", e)


_load_prompts()


class CreatePromptRequest(BaseModel):
    name: str
    description: str = ""
    prompt_text: str
    category: str = "general"
    tags: list[str] = []
    is_public: bool = False
    author: str = "anonymous"


class UpdatePromptRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    prompt_text: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    is_public: bool | None = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/prompts")
async def list_prompts():
    return {"prompts": _prompts_store, "total": len(_prompts_store)}


@router.post("/prompts")
async def create_prompt(req: CreatePromptRequest):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    if not req.prompt_text.strip():
        raise HTTPException(status_code=400, detail="prompt_text is required")

    prompt_obj = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "description": req.description,
        "prompt_text": req.prompt_text,
        "category": req.category,
        "tags": req.tags,
        "is_public": req.is_public,
        "created_at": _now(),
        "updated_at": _now(),
        "usage_count": 0,
        "author": req.author,
    }
    _prompts_store.append(prompt_obj)
    _save_prompts()
    return prompt_obj


@router.put("/prompts/{prompt_id}")
async def update_prompt(prompt_id: str, req: UpdatePromptRequest):
    for p in _prompts_store:
        if p["id"] == prompt_id:
            if req.name is not None:
                p["name"] = req.name
            if req.description is not None:
                p["description"] = req.description
            if req.prompt_text is not None:
                p["prompt_text"] = req.prompt_text
            if req.category is not None:
                p["category"] = req.category
            if req.tags is not None:
                p["tags"] = req.tags
            if req.is_public is not None:
                p["is_public"] = req.is_public
            p["updated_at"] = _now()
            _save_prompts()
            return p
    raise HTTPException(status_code=404, detail="Prompt not found")


@router.delete("/prompts/{prompt_id}")
async def delete_prompt(prompt_id: str):
    for i, p in enumerate(_prompts_store):
        if p["id"] == prompt_id:
            deleted = _prompts_store.pop(i)
            _save_prompts()
            return deleted
    raise HTTPException(status_code=404, detail="Prompt not found")


@router.post("/prompts/{prompt_id}/clone")
async def clone_prompt(prompt_id: str):
    for p in _prompts_store:
        if p["id"] == prompt_id:
            clone = {**p, "id": str(uuid.uuid4()), "name": f"{p['name']} (clone)", "created_at": _now(), "updated_at": _now(), "usage_count": 0}
            _prompts_store.append(clone)
            _save_prompts()
            return clone
    raise HTTPException(status_code=404, detail="Prompt not found")
