from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class ProviderRegistry:
    _providers: dict[str, Any] = {}

    @classmethod
    def get(cls, name: str) -> Any:
        return cls._providers.get(name)

    @classmethod
    def register(cls, name: str, provider: Any) -> None:
        cls._providers[name] = provider
        logger.info("Registered provider: %s", name)

    @classmethod
    def available_models(cls) -> list[str]:
        return list(cls._providers.keys())

    @classmethod
    def get_provider(cls, name: str) -> Any:
        return cls._providers.get(name)


registry = ProviderRegistry()
