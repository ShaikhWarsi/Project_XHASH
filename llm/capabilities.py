from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ModelCapabilities:
    supports_thinking: bool = False
    requires_reasoning_content_roundtrip: bool = False


_THINKING_MODELS = {
    "o1", "o1-mini", "o1-preview", "o3", "o3-mini",
    "claude-3-7-sonnet", "claude-3-5-sonnet",
    "gemini-2.5-pro", "gemini-2.5-flash",
    "deepseek-r1", "deepseek-v3",
}

_ROUNDTRIP_MODELS = {
    "deepseek-r1", "deepseek-v3",
}


def _probe_thinking(model: str) -> bool:
    try:
        import os
        provider = os.environ.get("LLM_PROVIDER", "openai")
        api_key = os.environ.get("OPENAI_API_KEY", "")
        if not api_key or provider != "openai":
            return False
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "hi"}],
            max_tokens=1,
            reasoning_effort="low",
        )
        return resp.choices[0].message.content is not None
    except Exception:
        return False


def get_capabilities(model: str) -> ModelCapabilities:
    model_lower = model.lower()
    hardcoded = ModelCapabilities(
        supports_thinking=any(t in model_lower for t in _THINKING_MODELS),
        requires_reasoning_content_roundtrip=any(t in model_lower for t in _ROUNDTRIP_MODELS),
    )
    from os import environ
    if environ.get("LLM_PROBE", "").lower() in ("1", "true", "yes"):
        hardcoded.supports_thinking = _probe_thinking(model)
    return hardcoded
