from __future__ import annotations

import base64
import os
import secrets
import logging
from datetime import datetime, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from cachetools import TTLCache
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from sqlalchemy import Boolean, Column, DateTime, Index, Integer, String, Text, select
from sqlalchemy.orm import relationship

from .multi_db import AuthBase

logger = logging.getLogger(__name__)

ph = PasswordHasher()

_AUTO_SECRETS_FILE = os.path.join(os.path.dirname(__file__), "_auto_secrets.txt")


def _load_or_generate_secret(env_var: str, key_name: str, length: int = 32) -> str:
    env_val = os.getenv(env_var, "").strip()
    if env_val:
        return env_val
    try:
        if os.path.isfile(_AUTO_SECRETS_FILE):
            with open(_AUTO_SECRETS_FILE, "r") as f:
                for line in f:
                    if line.startswith(f"{key_name}="):
                        return line.strip().split("=", 1)[1]
    except OSError:
        pass
    generated = secrets.token_hex(length)
    try:
        with open(_AUTO_SECRETS_FILE, "a") as f:
            f.write(f"{key_name}={generated}\n")
    except OSError:
        pass
    return generated


_pepper_value = _load_or_generate_secret("API_KEY_PEPPER", "API_KEY_PEPPER")
PEPPER = _pepper_value


def _resolve_fernet_salt() -> bytes:
    raw = (os.getenv("FERNET_SALT") or "").strip()
    if raw and len(raw) >= 32:
        try:
            return bytes.fromhex(raw)
        except ValueError:
            pass
    raw_file = _load_or_generate_secret("FERNET_SALT", "FERNET_SALT")
    if len(raw_file) >= 32:
        try:
            return bytes.fromhex(raw_file)
        except ValueError:
            pass
    return b"openalgo_static_salt"


def get_encryption_key():
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_resolve_fernet_salt(),
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(PEPPER.encode()))
    return Fernet(key)


fernet = get_encryption_key()


def get_session_based_cache_ttl():
    try:
        import pytz
        expiry_time = os.getenv("SESSION_EXPIRY_TIME", "03:00")
        hour, minute = map(int, expiry_time.split(":"))
        now_utc = datetime.now(pytz.UTC)
        now_ist = now_utc.astimezone(pytz.timezone("Asia/Kolkata"))
        today_expiry = now_ist.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if now_ist >= today_expiry:
            from datetime import timedelta
            today_expiry += timedelta(days=1)
        time_until_expiry = (today_expiry - now_ist).total_seconds()
        ttl_seconds = max(300, min(time_until_expiry, 24 * 3600))
        return int(ttl_seconds)
    except Exception:
        return 300


auth_cache = TTLCache(maxsize=1024, ttl=get_session_based_cache_ttl())
feed_token_cache = TTLCache(maxsize=1024, ttl=get_session_based_cache_ttl())
broker_cache = TTLCache(maxsize=1024, ttl=3000)
verified_api_key_cache = TTLCache(maxsize=1024, ttl=36000)
invalid_api_key_cache = TTLCache(maxsize=512, ttl=300)
order_mode_cache = TTLCache(maxsize=128, ttl=60)


class Auth(AuthBase):
    __tablename__ = "auth"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True, nullable=False)
    auth = Column(Text, nullable=False)
    feed_token = Column(Text, nullable=True)
    broker = Column(String(20), nullable=False)
    user_id = Column(String(255), nullable=True)
    is_revoked = Column(Boolean, default=False)
    secret_api_key = Column(Text, nullable=True)
    primary_ip = Column(String(45), nullable=True)
    secondary_ip = Column(String(45), nullable=True)
    ip_updated_at = Column(DateTime, nullable=True)
    aux_param1 = Column(Text, nullable=True)
    aux_param2 = Column(Text, nullable=True)
    aux_param3 = Column(Text, nullable=True)
    aux_param4 = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_auth_broker", "broker"),
        Index("idx_auth_user_id", "user_id"),
        Index("idx_auth_is_revoked", "is_revoked"),
    )


class ApiKeys(AuthBase):
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True)
    user_id = Column(String, nullable=False, unique=True)
    api_key_hash = Column(Text, nullable=False)
    api_key_encrypted = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    order_mode = Column(String(20), default="auto")

    __table_args__ = (
        Index("idx_api_keys_order_mode", "order_mode"),
        Index("idx_api_keys_created_at", "created_at"),
    )


class ActiveSession(AuthBase):
    __tablename__ = "active_sessions"
    id = Column(Integer, primary_key=True)
    username = Column(String(255), nullable=False, index=True)
    session_id = Column(String(64), unique=True, nullable=False)
    device_info = Column(String(500), nullable=True)
    ip_address = Column(String(45), nullable=True)
    broker = Column(String(20), nullable=True)
    login_time = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    last_seen = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_active_sessions_username", "username"),
    )


class LoginAttempt(AuthBase):
    __tablename__ = "login_attempts"
    id = Column(Integer, primary_key=True)
    username = Column(String(255), nullable=False)
    ip_address = Column(String(45), nullable=True)
    device_info = Column(String(500), nullable=True)
    status = Column(String(20), nullable=False)
    login_type = Column(String(20), nullable=True)
    broker = Column(String(20), nullable=True)
    failure_reason = Column(String(255), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_login_attempts_username", "username"),
        Index("idx_login_attempts_timestamp", "timestamp"),
        Index("idx_login_attempts_status", "status"),
    )


class PendingOrder(AuthBase):
    __tablename__ = "pending_orders"
    id = Column(Integer, primary_key=True)
    user_id = Column(String(255), nullable=False)
    api_type = Column(String(50), nullable=False)
    order_data = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    created_at_ist = Column(String(50))
    status = Column(String(20), default="pending")
    approved_at = Column(DateTime(timezone=True))
    approved_at_ist = Column(String(50))
    approved_by = Column(String(255))
    rejected_at = Column(DateTime(timezone=True))
    rejected_at_ist = Column(String(50))
    rejected_by = Column(String(255))
    rejected_reason = Column(Text)
    broker_order_id = Column(String(255))
    broker_status = Column(String(20))

    __table_args__ = (
        Index("idx_user_status", "user_id", "status"),
        Index("idx_created_at", "created_at"),
    )


class MasterContractStatus(AuthBase):
    __tablename__ = "master_contract_status"
    broker = Column(String, primary_key=True)
    status = Column(String, default="pending")
    message = Column(String)
    last_updated = Column(DateTime, default=datetime.now)
    total_symbols = Column(String, default="0")
    is_ready = Column(Boolean, default=False)
    last_download_time = Column(DateTime, nullable=True)
    download_date = Column(String, nullable=True)
    exchange_stats = Column(Text, nullable=True)
    download_duration_seconds = Column(Integer, nullable=True)


class Settings(AuthBase):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True)
    config_key = Column(String(100), unique=True, nullable=False, index=True)
    config_value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime)


class SymToken(AuthBase):
    __tablename__ = "symtoken"
    id = Column(Integer, primary_key=True)
    symbol = Column(String, nullable=False, index=True)
    brsymbol = Column(String, nullable=False, index=True)
    name = Column(String)
    exchange = Column(String, index=True)
    brexchange = Column(String, index=True)
    token = Column(String, index=True)
    expiry = Column(String)
    strike = Column(String)
    lotsize = Column(Integer)
    instrumenttype = Column(String)
    tick_size = Column(String)
    contract_value = Column(String)

    __table_args__ = (
        Index("idx_symbol_exchange", "symbol", "exchange"),
        Index("idx_symbol_name", "symbol", "name"),
        Index("idx_brsymbol_exchange", "brsymbol", "exchange"),
    )
