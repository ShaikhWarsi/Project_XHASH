from __future__ import annotations

import logging
import secrets
from datetime import datetime, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from persistence.models_auth import (
    ApiKeys, verified_api_key_cache, invalid_api_key_cache,
    order_mode_cache, auth_cache, feed_token_cache, broker_cache,
    PEPPER, fernet,
)

logger = logging.getLogger(__name__)

ph = PasswordHasher()


def generate_api_key(user_id: str) -> tuple[str, str, str]:
    raw_key = secrets.token_hex(32)
    peppered = f"{raw_key}{PEPPER}"
    key_hash = ph.hash(peppered)
    key_encrypted = fernet.encrypt(raw_key.encode()).decode()
    return raw_key, key_hash, key_encrypted


async def verify_api_key(session, user_id: str, provided_key: str) -> bool:
    cache_key = f"{user_id}:{provided_key[:16]}"

    cached = verified_api_key_cache.get(cache_key)
    if cached is not None:
        return cached

    invalid = invalid_api_key_cache.get(cache_key)
    if invalid is not None:
        return False

    from sqlalchemy import select
    result = await session.execute(
        select(ApiKeys).where(ApiKeys.user_id == user_id)
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        invalid_api_key_cache[cache_key] = False
        return False

    try:
        peppered = f"{provided_key}{PEPPER}"
        ph.verify(api_key.api_key_hash, peppered)
        verified_api_key_cache[cache_key] = True
        return True
    except VerifyMismatchError:
        invalid_api_key_cache[cache_key] = False
        return False


async def get_order_mode(session, user_id: str) -> str:
    cached = order_mode_cache.get(user_id)
    if cached is not None:
        return cached

    from sqlalchemy import select
    result = await session.execute(
        select(ApiKeys.order_mode).where(ApiKeys.user_id == user_id)
    )
    mode = result.scalar_one_or_none()

    if mode:
        order_mode_cache[user_id] = mode
        return mode
    return "auto"


async def decrypt_api_key(session, user_id: str) -> str | None:
    from sqlalchemy import select
    result = await session.execute(
        select(ApiKeys.api_key_encrypted).where(ApiKeys.user_id == user_id)
    )
    encrypted = result.scalar_one_or_none()
    if encrypted:
        try:
            return fernet.decrypt(encrypted.encode()).decode()
        except Exception:
            return None
    return None


def invalidate_user_cache(user_id: str):
    for cache in [verified_api_key_cache, order_mode_cache, auth_cache, feed_token_cache, broker_cache]:
        keys_to_delete = [k for k in cache if str(k).startswith(str(user_id))]
        for k in keys_to_delete:
            cache.pop(k, None)
