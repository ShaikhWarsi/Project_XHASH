from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/llm", tags=["llm"])

DEFAULT_MODELS = [
    {"id": "gpt-4o", "name": "GPT-4o", "provider": "openai", "capabilities": ["chat", "reasoning"], "enabled": bool(os.environ.get("OPENAI_API_KEY"))},
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openai", "capabilities": ["chat"], "enabled": bool(os.environ.get("OPENAI_API_KEY"))},
    {"id": "gpt-4.1", "name": "GPT-4.1", "provider": "openai", "capabilities": ["chat", "reasoning"], "enabled": bool(os.environ.get("OPENAI_API_KEY"))},
    {"id": "claude-sonnet-4", "name": "Claude Sonnet 4", "provider": "anthropic", "capabilities": ["chat", "reasoning"], "enabled": bool(os.environ.get("ANTHROPIC_API_KEY"))},
    {"id": "claude-opus-4", "name": "Claude Opus 4", "provider": "anthropic", "capabilities": ["chat", "reasoning"], "enabled": bool(os.environ.get("ANTHROPIC_API_KEY"))},
]


class CompleteRequest(BaseModel):
    model: str
    prompt: str
    temperature: float = 0.7
    max_tokens: int = 2048
    reasoning: bool = False


class StreamingCompleteRequest(BaseModel):
    model: str
    prompt: str
    temperature: float = 0.7
    max_tokens: int = 4096


async def _call_openai(model: str, prompt: str, temperature: float, max_tokens: int) -> str:
    import openai as oa
    client = oa.OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    resp = await asyncio.to_thread(
        client.chat.completions.create,
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content or ""


async def _call_anthropic(model: str, prompt: str, temperature: float, max_tokens: int) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    resp = await asyncio.to_thread(
        client.messages.create,
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return resp.content[0].text if resp.content else ""


async def _stream_openai(model: str, prompt: str, temperature: float, max_tokens: int) -> AsyncGenerator[str, None]:
    import openai as oa
    client = oa.OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    stream = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta if chunk.choices else None
        if delta and delta.content:
            yield f"data: {json.dumps({'token': delta.content})}\n\n"
    yield f"data: {json.dumps({'done': True})}\n\n"


async def _stream_anthropic(model: str, prompt: str, temperature: float, max_tokens: int) -> AsyncGenerator[str, None]:
    import anthropic
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    with client.messages.stream(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=temperature,
    ) as stream:
        for text in stream.text_stream:
            yield f"data: {json.dumps({'token': text})}\n\n"
    yield f"data: {json.dumps({'done': True})}\n\n"


def _get_model_config(model_id: str) -> dict:
    supported_ids = {m["id"] for m in DEFAULT_MODELS}
    if model_id not in supported_ids:
        raise HTTPException(status_code=400, detail=f"Unknown model '{model_id}'. Supported: {', '.join(sorted(supported_ids))}")
    model_config = next(m for m in DEFAULT_MODELS if m["id"] == model_id)
    if not model_config["enabled"]:
        provider = model_config["provider"]
        key_var = f"{provider.upper()}_API_KEY"
        raise HTTPException(
            status_code=503,
            detail=f"Model '{model_id}' ({provider}) not available. Set {key_var} environment variable.",
        )
    return model_config


@router.get("/models")
async def list_models():
    return {"models": DEFAULT_MODELS}


@router.post("/complete")
async def llm_complete(req: CompleteRequest):
    model_config = _get_model_config(req.model)
    try:
        provider = model_config["provider"]
        if provider == "openai":
            content = await _call_openai(req.model, req.prompt, req.temperature, req.max_tokens)
        elif provider == "anthropic":
            content = await _call_anthropic(req.model, req.prompt, req.temperature, req.max_tokens)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown provider '{provider}'")

        return {
            "model": req.model,
            "content": content,
            "usage": {"prompt_tokens": len(req.prompt) // 4, "completion_tokens": len(content) // 4, "note": "estimated"},
        }
    except ImportError as e:
        raise HTTPException(status_code=503, detail="Required dependency not installed")
    except Exception as e:
        logger.warning("LLM call failed for %s: %s", req.model, e)
        raise HTTPException(status_code=502, detail=f"LLM provider error: {e}")


@router.post("/complete-stream")
async def llm_complete_stream(req: StreamingCompleteRequest):
    model_config = _get_model_config(req.model)
    provider = model_config["provider"]

    try:
        if provider == "openai":
            async def event_stream():
                async for event in _stream_openai(req.model, req.prompt, req.temperature, req.max_tokens):
                    yield event
        elif provider == "anthropic":
            async def event_stream():
                async for event in _stream_anthropic(req.model, req.prompt, req.temperature, req.max_tokens):
                    yield event
        else:
            raise HTTPException(status_code=400, detail=f"Unknown provider '{provider}'")

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except ImportError as e:
        raise HTTPException(status_code=503, detail="Required dependency not installed")
    except Exception as e:
        logger.warning("LLM stream call failed for %s: %s", req.model, e)
        raise HTTPException(status_code=502, detail=f"LLM provider error: {e}")
