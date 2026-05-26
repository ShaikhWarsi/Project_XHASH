from __future__ import annotations

import json
import logging
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/llm", tags=["llm"])

DEFAULT_MODELS = [
    {"id": "gpt-4o", "name": "GPT-4o", "provider": "openai", "capabilities": ["chat", "reasoning"], "enabled": bool(os.environ.get("OPENAI_API_KEY"))},
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openai", "capabilities": ["chat"], "enabled": bool(os.environ.get("OPENAI_API_KEY"))},
    {"id": "claude-3-opus", "name": "Claude 3 Opus", "provider": "anthropic", "capabilities": ["chat", "reasoning"], "enabled": bool(os.environ.get("ANTHROPIC_API_KEY"))},
    {"id": "claude-3-sonnet", "name": "Claude 3 Sonnet", "provider": "anthropic", "capabilities": ["chat", "reasoning"], "enabled": bool(os.environ.get("ANTHROPIC_API_KEY"))},
]


class CompleteRequest(BaseModel):
    model: str
    prompt: str
    temperature: float = 0.7
    max_tokens: int = 2048
    reasoning: bool = False


def _call_openai(model: str, prompt: str, temperature: float, max_tokens: int) -> str:
    import openai as oa
    client = oa.OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content or ""


def _call_anthropic(model: str, prompt: str, temperature: float, max_tokens: int) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    resp = client.messages.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return resp.content[0].text if resp.content else ""


@router.get("/models")
async def list_models():
    return {"models": DEFAULT_MODELS}


@router.post("/complete")
async def llm_complete(req: CompleteRequest):
    supported_ids = {m["id"] for m in DEFAULT_MODELS}
    if req.model not in supported_ids:
        raise HTTPException(status_code=400, detail=f"Unknown model '{req.model}'. Supported: {', '.join(sorted(supported_ids))}")

    model_config = next(m for m in DEFAULT_MODELS if m["id"] == req.model)
    if not model_config["enabled"]:
        provider = model_config["provider"]
        key_var = f"{provider.upper()}_API_KEY"
        raise HTTPException(
            status_code=503,
            detail=f"Model '{req.model}' ({provider}) not available. Set {key_var} environment variable.",
        )

    try:
        provider = model_config["provider"]
        if provider == "openai":
            content = _call_openai(req.model, req.prompt, req.temperature, req.max_tokens)
        elif provider == "anthropic":
            content = _call_anthropic(req.model, req.prompt, req.temperature, req.max_tokens)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown provider '{provider}'")

        return {
            "model": req.model,
            "content": content,
            "usage": {"prompt_tokens": len(req.prompt) // 4, "completion_tokens": len(content) // 4},
        }
    except ImportError as e:
        pkg = str(e).split("'")[1] if "'" in str(e) else str(e)
        raise HTTPException(status_code=503, detail=f"Package '{pkg}' not installed. Run: pip install {pkg}")
    except Exception as e:
        logger.warning("LLM call failed for %s: %s", req.model, e)
        raise HTTPException(status_code=502, detail=f"LLM provider error: {e}")
