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


def get_capabilities(model: str) -> ModelCapabilities:
    model_lower = model.lower()
    return ModelCapabilities(
        supports_thinking=any(t in model_lower for t in _THINKING_MODELS),
        requires_reasoning_content_roundtrip=any(t in model_lower for t in _ROUNDTRIP_MODELS),
    )
