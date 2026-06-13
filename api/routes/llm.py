from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import time
from collections import defaultdict
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/llm", tags=["llm"])

from .llm_usage import track_usage
from .llm_cache import cache_get, cache_set

_LLM_TIMEOUT = float(os.environ.get("LLM_TIMEOUT", "60.0"))
_LLM_MAX_RETRIES = int(os.environ.get("LLM_MAX_RETRIES", "3"))
_DAILY_BUDGET = float(os.environ.get("LLM_DAILY_BUDGET", "10.0"))
_LLM_GLOBAL_SEM = asyncio.Semaphore(int(os.environ.get("LLM_MAX_CONCURRENT", "8")))

_MODEL_TIERS = {
    "cheap": {"max_tokens": 1024, "models": ["gpt-4o-mini"]},
    "standard": {"max_tokens": 4096, "models": ["gpt-4o", "claude-sonnet-4"]},
    "reasoning": {"max_tokens": 8192, "models": ["gpt-4.1", "claude-opus-4"]},
}


def _route_to_tier(prompt: str) -> str:
    prompt_len = len(prompt)
    if prompt_len < 500:
        return "cheap"
    elif prompt_len < 4000:
        return "standard"
    else:
        return "reasoning"


_user_sems: dict[str, asyncio.Semaphore] = {}
_user_budgets: dict[str, tuple[float, float]] = {}
_budget_lock = asyncio.Lock()
_user_context_budgets: dict[str, int] = {}
_context_budget_lock = asyncio.Lock()
_MAX_CONTEXT_TOKENS = int(os.environ.get("MAX_CONTEXT_TOKENS", "32000"))


async def _check_context_budget(user_id: str, estimated_tokens: int) -> bool:
    async with _context_budget_lock:
        used = _user_context_budgets.get(user_id, 0)
        if used + estimated_tokens > _MAX_CONTEXT_TOKENS:
            logger.warning("User %s context budget exceeded: %d/%d", user_id, used, _MAX_CONTEXT_TOKENS)
            return False
        _user_context_budgets[user_id] = used + estimated_tokens
    return True


async def _reset_context_budget(user_id: str):
    async with _context_budget_lock:
        _user_context_budgets[user_id] = 0


def _get_day_key() -> str:
    return time.strftime("%Y-%m-%d")


def _count_tokens(text: str, model: str = "gpt-4o") -> int:
    try:
        import tiktoken
        enc = tiktoken.encoding_for_model(model)
        return len(enc.encode(text))
    except Exception:
        logger.debug("tiktoken not available, using fallback token count")
        return len(text) // 4 + 1


def _truncate_prompt(prompt: str, max_tokens: int = 8000, model: str = "gpt-4o") -> str:
    estimated = _count_tokens(prompt, model)
    if estimated <= max_tokens:
        return prompt
    ratio = max_tokens / estimated
    keep = int(len(prompt) * ratio * 0.9)
    head = prompt[: keep // 2]
    tail = prompt[-(keep // 2):]
    logger.info("Truncated prompt from %d tokens to ~%d tokens (model=%s)", estimated, max_tokens, model)
    return head + "\n...[truncated]...\n" + tail


async def _check_budget(user_id: str, estimated_cost: float = 0.0) -> bool:
    async with _budget_lock:
        day = _get_day_key()
        spent, cached_day = _user_budgets.get(user_id, (0.0, ""))
        if cached_day != day:
            _user_budgets[user_id] = (0.0, day)
            spent = 0.0
        if spent + estimated_cost > _DAILY_BUDGET:
            logger.warning("User %s exceeds daily budget: spent=%.2f, est=%.2f, limit=%.2f", user_id, spent, estimated_cost, _DAILY_BUDGET)
            return False
        return True


async def _record_spend(user_id: str, cost: float):
    async with _budget_lock:
        day = _get_day_key()
        spent, cached_day = _user_budgets.get(user_id, (0.0, ""))
        if cached_day != day:
            _user_budgets[user_id] = (cost, day)
        else:
            _user_budgets[user_id] = (spent + cost, day)


def _get_user_semaphore(user_id: str, max_concurrent: int = 4) -> asyncio.Semaphore:
    sem = _user_sems.get(user_id)
    if sem is None:
        sem = asyncio.Semaphore(max_concurrent)
        _user_sems[user_id] = sem
    return sem


def _estimate_cost(model: str, prompt_tokens: int, completion_tokens: int = 500) -> float:
    rates = {
        "gpt-4o": (0.01, 0.03),
        "gpt-4o-mini": (0.0015, 0.006),
        "gpt-4.1": (0.01, 0.03),
        "claude-sonnet-4": (0.003, 0.015),
        "claude-opus-4": (0.015, 0.075),
    }
    inp, out = rates.get(model, (0.01, 0.03))
    return (inp * prompt_tokens / 1000) + (out * completion_tokens / 1000)

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
    seed: Optional[int] = None


class StreamingCompleteRequest(BaseModel):
    model: str
    prompt: str
    temperature: float = 0.7
    max_tokens: int = 4096


async def _call_openai(model: str, prompt: str, temperature: float, max_tokens: int, seed: Optional[int] = None) -> tuple[str, dict]:
    import openai as oa
    client = oa.OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    kwargs = dict(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    if seed is not None:
        kwargs["seed"] = seed
    async with _LLM_GLOBAL_SEM:
        resp = await asyncio.wait_for(
            asyncio.to_thread(
                client.chat.completions.create,
                **kwargs,
            ),
            timeout=_LLM_TIMEOUT,
        )
    content = resp.choices[0].message.content or ""
    usage = {"prompt_tokens": resp.usage.prompt_tokens, "completion_tokens": resp.usage.completion_tokens} if resp.usage else {"prompt_tokens": 0, "completion_tokens": 0}
    return content, usage


async def _call_anthropic(model: str, prompt: str, temperature: float, max_tokens: int) -> tuple[str, dict]:
    import anthropic
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    async with _LLM_GLOBAL_SEM:
        resp = await asyncio.wait_for(
            asyncio.to_thread(
                client.messages.create,
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
            ),
            timeout=_LLM_TIMEOUT,
        )
    content = resp.content[0].text if resp.content else ""
    usage = {"prompt_tokens": resp.usage.input_tokens, "completion_tokens": resp.usage.output_tokens} if resp.usage else {"prompt_tokens": 0, "completion_tokens": 0}
    return content, usage


async def _stream_openai(model: str, prompt: str, temperature: float, max_tokens: int) -> AsyncGenerator[str, None]:
    import openai as oa
    client = oa.OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    async with _LLM_GLOBAL_SEM:
        stream = await asyncio.wait_for(
            asyncio.to_thread(
                client.chat.completions.create,
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            ),
            timeout=_LLM_TIMEOUT,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield f"data: {json.dumps({'token': delta.content})}\n\n"
    yield f"data: {json.dumps({'done': True})}\n\n"


async def _stream_anthropic(model: str, prompt: str, temperature: float, max_tokens: int) -> AsyncGenerator[str, None]:
    import anthropic
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    async with _LLM_GLOBAL_SEM:
        stream = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: client.messages.stream(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
            ),
            timeout=_LLM_TIMEOUT,
        )
        with stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'token': text})}\n\n"
    yield f"data: {json.dumps({'done': True})}\n\n"


async def _call_llm(provider: str, model: str, prompt: str, temperature: float, max_tokens: int, user_id: str = "", seed: Optional[int] = None) -> tuple[str, dict]:
    prompt = _truncate_prompt(prompt, 8000, model)

    if user_id:
        user_sem = _get_user_semaphore(user_id)
        if not await _check_budget(user_id, _estimate_cost(model, _count_tokens(prompt, model))):
            raise HTTPException(status_code=429, detail="Daily LLM budget exceeded")
        prompt_tokens = _count_tokens(prompt, model)
        if not await _check_context_budget(user_id, prompt_tokens):
            raise HTTPException(status_code=429, detail="Context window budget exceeded")

    last_error = ""
    for attempt in range(_LLM_MAX_RETRIES):
        try:
            if provider == "openai":
                content, usage = await _call_openai(model, prompt, temperature, max_tokens, seed=seed)
            elif provider == "anthropic":
                content, usage = await _call_anthropic(model, prompt, temperature, max_tokens)
            else:
                raise HTTPException(status_code=400, detail=f"Unknown provider '{provider}'")

            if user_id:
                cost = _estimate_cost(model, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0))
                await _record_spend(user_id, cost)

            return content, usage
        except asyncio.TimeoutError:
            last_error = f"LLM call timed out after {_LLM_TIMEOUT}s"
            if attempt < _LLM_MAX_RETRIES - 1:
                delay = 2 ** attempt
                logger.warning("%s attempt %d/%d: timeout, retrying in %ds", model, attempt + 1, _LLM_MAX_RETRIES, delay)
                await asyncio.sleep(delay)
        except HTTPException:
            raise
        except Exception as e:
            last_error = str(e)
            if attempt < _LLM_MAX_RETRIES - 1 and "429" in str(e):
                delay = 2 ** attempt * 5
                logger.warning("%s attempt %d/%d: rate-limited, retrying in %ds", model, attempt + 1, _LLM_MAX_RETRIES, delay)
                await asyncio.sleep(delay)
            elif attempt < _LLM_MAX_RETRIES - 1:
                delay = 2 ** attempt
                logger.warning("%s attempt %d/%d failed: %s, retrying in %ds", model, attempt + 1, _LLM_MAX_RETRIES, last_error, delay)
                await asyncio.sleep(delay)

    raise HTTPException(status_code=502, detail=last_error or "LLM provider error")


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
async def llm_complete(req: CompleteRequest, request: Request):
    user_id = request.headers.get("X-User-Id", "")
    model_config = _get_model_config(req.model)
    cached = cache_get(req.model, req.prompt)
    if cached is not None:
        return {
            "model": req.model,
            "content": cached,
            "cached": True,
        }
    content, usage = await _call_llm(model_config["provider"], req.model, req.prompt, req.temperature, req.max_tokens, user_id=user_id, seed=req.seed)
    track_usage(req.model, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0))
    cache_set(req.model, req.prompt, content)
    return {
        "model": req.model,
        "content": content,
        "usage": usage,
        "cached": False,
    }


@router.get("/cache/stats")
async def llm_cache_stats():
    from .llm_cache import cache_stats
    return cache_stats()


async def _stream_wrapper(provider: str, model: str, prompt: str, temperature: float, max_tokens: int):
    try:
        if provider == "openai":
            async for event in _stream_openai(model, prompt, temperature, max_tokens):
                yield event
        elif provider == "anthropic":
            async for event in _stream_anthropic(model, prompt, temperature, max_tokens):
                yield event
        else:
            yield f"data: {json.dumps({'error': 'Unknown provider'})}\n\n"
    except ImportError:
        yield f"data: {json.dumps({'error': 'Required dependency not installed'})}\n\n"
    except Exception as e:
        logger.warning("LLM stream call failed for %s: %s", model, e)
        yield f"data: {json.dumps({'error': f'LLM provider error: {type(e).__name__}: {e}'[:500]})}\n\n"


@router.post("/complete-stream")
@router.post("/stream")
async def llm_complete_stream(req: StreamingCompleteRequest, request: Request):
    user_id = request.headers.get("X-User-Id", "")
    model_config = _get_model_config(req.model)
    provider = model_config["provider"]

    return StreamingResponse(
        _stream_wrapper(provider, req.model, req.prompt, req.temperature, req.max_tokens),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
