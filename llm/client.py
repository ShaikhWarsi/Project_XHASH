from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any, Optional

from .capabilities import get_capabilities

logger = logging.getLogger(__name__)

DEFAULT_OPENROUTER_BASE = "https://openrouter.ai/api/v1"
DEFAULT_OLLAMA_HOST = "http://localhost:11434"


class _RateLimiter:
    def __init__(self, max_per_minute: int = 60):
        self._max_per_minute = max_per_minute
        self._tokens: list[float] = []

    def acquire(self) -> float | None:
        now = time.monotonic()
        self._tokens = [t for t in self._tokens if now - t < 60.0]
        if len(self._tokens) >= self._max_per_minute:
            return self._tokens[0] + 60.0 - now
        self._tokens.append(now)
        return None


class LLMClient:
    """Multi-provider LLM client with two-tier architecture and capability-aware dispatch."""

    PROVIDER_OPENAI = "openai"
    PROVIDER_ANTHROPIC = "anthropic"
    PROVIDER_OLLAMA = "ollama"
    PROVIDER_GROQ = "groq"
    PROVIDER_DEEPSEEK = "deepseek"
    PROVIDER_GOOGLE = "google"
    PROVIDER_XAI = "xai"
    PROVIDER_OPENROUTER = "openrouter"
    PROVIDER_QWEN = "qwen"
    PROVIDER_GLM = "glm"
    PROVIDER_MINIMAX = "minimax"
    PROVIDER_AZURE = "azure"

    SUPPORTED_PROVIDERS = {
        PROVIDER_OPENAI, PROVIDER_ANTHROPIC, PROVIDER_OLLAMA,
        PROVIDER_GROQ, PROVIDER_DEEPSEEK, PROVIDER_GOOGLE,
        PROVIDER_XAI, PROVIDER_OPENROUTER, PROVIDER_QWEN,
        PROVIDER_GLM, PROVIDER_MINIMAX, PROVIDER_AZURE,
    }

    _instances: dict[str, "LLMClient"] = {}

    def __new__(cls, provider: str = "openai", model: str = "gpt-4", api_key: Optional[str] = None, **kwargs):
        key = f"{provider}:{model}"
        if key not in cls._instances:
            instance = super().__new__(cls)
            instance._initialized = False
            cls._instances[key] = instance
        return cls._instances[key]

    def __init__(
        self,
        provider: str = "openai",
        model: str = "gpt-4",
        api_key: Optional[str] = None,
        tier: str = "deep",
        rate_limit_per_min: int = 60,
        max_retries: int = 3,
    ):
        if self._initialized:
            return
        self._initialized = True
        if provider not in self.SUPPORTED_PROVIDERS:
            raise ValueError(
                f"Unknown provider '{provider}'. Supported: {', '.join(sorted(self.SUPPORTED_PROVIDERS))}"
            )
        self.provider = provider
        self.model = model
        self.api_key = api_key
        self.tier = tier
        self.capabilities = get_capabilities(model)
        self._rate_limiter = _RateLimiter(max_per_minute=rate_limit_per_min)
        self._max_retries = max_retries

    @classmethod
    def quick(cls, provider: str = "openai", api_key: Optional[str] = None) -> LLMClient:
        """Create a cheap/fast LLM client for analysts."""
        import os
        model = os.environ.get("LLM_QUICK_MODEL", "gpt-4o-mini")
        return cls(provider=provider, model=model, api_key=api_key, tier="quick")

    @classmethod
    def deep(cls, provider: str = "openai", api_key: Optional[str] = None) -> LLMClient:
        """Create a powerful LLM client for managers."""
        import os
        model = os.environ.get("LLM_DEEP_MODEL", "gpt-4o")
        return cls(provider=provider, model=model, api_key=api_key, tier="deep")

    async def generate(
        self,
        prompt: str,
        system: str = "",
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> str:
        wait = self._rate_limiter.acquire()
        if wait is not None:
            logger.info("Rate limited, waiting %.1fs", wait)
            await asyncio.sleep(wait)
        generator = self._get_generator()
        if generator is None:
            return json.dumps({"signal": "neutral", "confidence": 0.0, "reasoning": f"Unsupported provider: {self.provider}"})
        for attempt in range(self._max_retries):
            try:
                return await generator(prompt, system, temperature, max_tokens)
            except Exception as e:
                if attempt < self._max_retries - 1:
                    delay = 2 ** attempt
                    logger.warning("LLM attempt %d failed, retrying in %ds: %s", attempt + 1, delay, e)
                    await asyncio.sleep(delay)
                else:
                    raise
        return json.dumps({"signal": "neutral", "confidence": 0.0, "reasoning": "LLM call failed after retries"})

    def _get_generator(self):
        dispatch = {
            self.PROVIDER_OPENAI: self._generate_openai,
            self.PROVIDER_ANTHROPIC: self._generate_anthropic,
            self.PROVIDER_OLLAMA: self._generate_ollama,
            self.PROVIDER_GROQ: self._generate_groq,
            self.PROVIDER_DEEPSEEK: self._generate_deepseek,
            self.PROVIDER_GOOGLE: self._generate_google,
            self.PROVIDER_XAI: self._generate_xai,
            self.PROVIDER_OPENROUTER: self._generate_openrouter,
            self.PROVIDER_QWEN: self._generate_qwen,
            self.PROVIDER_GLM: self._generate_glm,
            self.PROVIDER_MINIMAX: self._generate_minimax,
            self.PROVIDER_AZURE: self._generate_azure,
        }
        return dispatch.get(self.provider)

    async def generate_structured(
        self,
        prompt: str,
        system: str = "",
        temperature: float = 0.3,
        timeout: float = 30.0,
        schema: Optional[dict] = None,
    ) -> dict[str, Any]:
        try:
            raw = await asyncio.wait_for(
                self.generate(prompt, system=system, temperature=temperature),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            logger.warning(f"LLM call timed out after {timeout}s")
            return {"signal": "neutral", "confidence": 0.0, "reasoning": "LLM call timed out"}
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1]
            raw = raw.rsplit("```", 1)[0]
        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse LLM response as JSON: {raw[:200]}")
            return {"signal": "neutral", "confidence": 0.0, "reasoning": raw[:500]}
        if schema and isinstance(schema, dict):
            required = schema.get("required", [])
            for key in required:
                if key not in result:
                    logger.warning("LLM response missing required key: %s", key)
                    result[key] = None
        return result

    async def _generate_openai(self, prompt: str, system: str, temperature: float, max_tokens: int) -> str:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=self.api_key)
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})
            kwargs = dict(model=self.model, messages=messages, temperature=temperature, max_tokens=max_tokens)
            if self.capabilities.supports_thinking:
                kwargs["reasoning_effort"] = "medium"
            response = await client.chat.completions.create(**kwargs)
            return response.choices[0].message.content or ""
        except ImportError:
            logger.warning("OpenAI package not installed. Install with: pip install openai")
            return json.dumps({"signal": "neutral", "confidence": 0.5, "reasoning": "OpenAI unavailable"})
        except Exception as e:
            logger.error(f"OpenAI generation error (key redacted)")
            return json.dumps({"signal": "neutral", "confidence": 0.0, "reasoning": f"Error: {e}"})

    async def _generate_anthropic(self, prompt: str, system: str, temperature: float, max_tokens: int) -> str:
        try:
            from anthropic import AsyncAnthropic
            client = AsyncAnthropic(api_key=self.api_key)
            kwargs = dict(
                model=self.model, system=system or None,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature, max_tokens=max_tokens,
            )
            if self.capabilities.supports_thinking:
                kwargs["thinking"] = {"type": "enabled", "budget_tokens": int(max_tokens * 0.5)}
            response = await client.messages.create(**kwargs)
            return response.content[0].text if response.content else ""
        except ImportError:
            logger.warning("Anthropic package not installed. Install with: pip install anthropic")
            return json.dumps({"signal": "neutral", "confidence": 0.5, "reasoning": "Anthropic unavailable"})
        except Exception as e:
            logger.error(f"Anthropic generation error (key redacted)")
            return json.dumps({"signal": "neutral", "confidence": 0.0, "reasoning": f"Error: {e}"})

    async def _generate_ollama(self, prompt: str, system: str, temperature: float, max_tokens: int) -> str:
        import aiohttp
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "model": self.model,
                    "prompt": f"{system}\n\n{prompt}" if system else prompt,
                    "stream": False,
                    "options": {"temperature": temperature, "num_predict": max_tokens},
                }
                async with session.post(f"{DEFAULT_OLLAMA_HOST}/api/generate", json=payload) as resp:
                    data = await resp.json()
                    return data.get("response", "")
        except Exception as e:
            logger.error(f"Ollama generation error")
            return json.dumps({"signal": "neutral", "confidence": 0.0, "reasoning": f"Ollama error: {e}"})

    async def _generate_groq(self, prompt: str, system: str, temperature: float, max_tokens: int) -> str:
        return await self._generate_via_openai_compat(prompt, system, temperature, max_tokens, "https://api.groq.com/openai/v1")

    async def _generate_deepseek(self, prompt: str, system: str, temperature: float, max_tokens: int) -> str:
        return await self._generate_via_openai_compat(prompt, system, temperature, max_tokens, "https://api.deepseek.com")

    async def _generate_xai(self, prompt: str, system: str, temperature: float, max_tokens: int) -> str:
        return await self._generate_via_openai_compat(prompt, system, temperature, max_tokens, "https://api.x.ai/v1")

    async def _generate_openrouter(self, prompt: str, system: str, temperature: float, max_tokens: int) -> str:
        return await self._generate_via_openai_compat(prompt, system, temperature, max_tokens, DEFAULT_OPENROUTER_BASE)

    async def _generate_qwen(self, prompt: str, system: str, temperature: float, max_tokens: int) -> str:
        return await self._generate_via_openai_compat(prompt, system, temperature, max_tokens, "https://dashscope-intl.aliyuncs.com/compatible-mode/v1")

    async def _generate_glm(self, prompt: str, system: str, temperature: float, max_tokens: int) -> str:
        return await self._generate_via_openai_compat(prompt, system, temperature, max_tokens, "https://open.bigmodel.cn/api/paas/v4")

    async def _generate_minimax(self, prompt: str, system: str, temperature: float, max_tokens: int) -> str:
        return await self._generate_via_openai_compat(prompt, system, temperature, max_tokens, "https://api.minimaxi.com/v1")

    async def _generate_azure(self, prompt: str, system: str, temperature: float, max_tokens: int) -> str:
        try:
            from openai import AsyncAzureOpenAI
            endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "")
            api_key = self.api_key or os.environ.get("AZURE_OPENAI_API_KEY", "")
            if not endpoint or not api_key:
                return json.dumps({"signal": "neutral", "confidence": 0.0, "reasoning": "Azure endpoint or API key not configured"})
            client = AsyncAzureOpenAI(
                api_key=api_key,
                azure_endpoint=endpoint if endpoint.startswith("https://") else f"https://{endpoint}.openai.azure.com/",
                api_version="2024-02-15-preview",
            )
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})
            response = await client.chat.completions.create(
                model=self.model, messages=messages, temperature=temperature, max_tokens=max_tokens,
            )
            return response.choices[0].message.content or ""
        except ImportError:
            logger.warning("OpenAI package required for Azure. Install with: pip install openai")
            return json.dumps({"signal": "neutral", "confidence": 0.5, "reasoning": "Azure unavailable"})
        except Exception as e:
            logger.error(f"Azure generation error (key redacted)")
            return json.dumps({"signal": "neutral", "confidence": 0.0, "reasoning": f"Error: {e}"})

    async def _generate_via_openai_compat(self, prompt: str, system: str, temperature: float, max_tokens: int, base_url: str) -> str:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=self.api_key or "", base_url=base_url)
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})
            kwargs = dict(model=self.model, messages=messages, temperature=temperature, max_tokens=max_tokens)
            if self.capabilities.requires_reasoning_content_roundtrip:
                kwargs.pop("tool_choice", None)
            response = await client.chat.completions.create(**kwargs)
            return response.choices[0].message.content or ""
        except ImportError:
            logger.warning(f"OpenAI package required for OpenAI-compat. Install with: pip install openai")
            return json.dumps({"signal": "neutral", "confidence": 0.5, "reasoning": "Provider unavailable"})
        except Exception as e:
            logger.error(f"OpenAI-compat generation error (key redacted)")
            return json.dumps({"signal": "neutral", "confidence": 0.0, "reasoning": f"Error: {e}"})
