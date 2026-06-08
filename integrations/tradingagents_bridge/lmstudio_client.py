"""LM Studio LLM client — wraps langchain ChatOpenAI pointing at localhost:1234/v1."""
from __future__ import annotations

import logging
import os
from typing import Any, Optional

from langchain_openai import ChatOpenAI

from integrations.tradingagents.llm_clients.base_client import BaseLLMClient, normalize_content
from integrations.tradingagents.llm_clients.capabilities import get_capabilities, ModelCapabilities
from integrations.tradingagents.llm_clients.openai_client import NormalizedChatOpenAI

logger = logging.getLogger(__name__)


class LMStudioChatOpenAI(NormalizedChatOpenAI):
    """ChatOpenAI subclass for LM Studio.

    LM Studio exposes an OpenAI-compatible endpoint at
    ``http://localhost:1234/v1``.  No API key is required so we
    pass a dummy value that the SDK accepts.

    Structured output and tool calling depend on the loaded model.
    By default we set capabilities to ``none`` for both, forcing
    the ``structured_fallback`` path.
    """

    def with_structured_output(self, schema, *, method=None, **kwargs):
        caps = get_capabilities(self.model_name)
        if caps.preferred_structured_method == "none":
            raise NotImplementedError(
                f"LM Studio model '{self.model_name}' has no structured-output "
                f"method; callers must fall back to free-text generation."
            )
        return super().with_structured_output(schema, method=method, **kwargs)


class LMStudioClient(BaseLLMClient):
    """Client for LM Studio local models."""

    def __init__(
        self,
        model: str,
        base_url: Optional[str] = None,
        provider: str = "lmstudio",
        **kwargs,
    ):
        super().__init__(model, base_url, **kwargs)
        self.provider = provider.lower()

    def get_llm(self) -> Any:
        llm_kwargs = {
            "model": self.model,
            "base_url": self.base_url or os.environ.get("LMSTUDIO_BASE_URL", "http://localhost:1234/v1"),
            "api_key": "lm-studio",
        }
        for key in ("timeout", "max_retries", "temperature"):
            if key in self.kwargs:
                llm_kwargs[key] = self.kwargs[key]
        return LMStudioChatOpenAI(**llm_kwargs)

    def validate_model(self) -> bool:
        return True
