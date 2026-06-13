from __future__ import annotations

import hashlib
import logging
import os
import secrets
import time
import uuid
from datetime import datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)

# In-memory storage (mirrors OpenAlgo's oauth_db.py)
_clients: dict[str, dict[str, Any]] = {}
_tokens: dict[str, dict[str, Any]] = {}
_auth_codes: dict[str, dict[str, Any]] = {}
_refresh_tokens: dict[str, dict[str, Any]] = {}

MCP_ACCESS_TOKEN_EXPIRY = int(os.environ.get("MCP_ACCESS_TOKEN_EXPIRY_SECONDS", "3600"))
MCP_REFRESH_TOKEN_EXPIRY = int(os.environ.get("MCP_REFRESH_TOKEN_EXPIRY_SECONDS", "2592000"))


def _hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()


def register_client(client_name: str, redirect_uris: list[str] | None = None) -> dict:
    client_id = f"mcp_{secrets.token_hex(16)}"
    client_secret = secrets.token_hex(32)
    _clients[client_id] = {
        "client_id": client_id,
        "client_secret_hash": _hash_secret(client_secret),
        "client_name": client_name,
        "redirect_uris": redirect_uris or [],
        "grant_types": ["authorization_code", "refresh_token"],
        "token_endpoint_auth_method": "client_secret_basic",
        "created_at": datetime.utcnow().isoformat(),
    }
    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "client_name": client_name,
    }


def verify_client(client_id: str, client_secret: str) -> bool:
    client = _clients.get(client_id)
    if not client:
        return False
    return client["client_secret_hash"] == _hash_secret(client_secret)


def get_client(client_id: str) -> dict | None:
    return _clients.get(client_id)


def issue_auth_code(client_id: str, user_id: str, scope: str) -> str:
    code = secrets.token_hex(32)
    _auth_codes[code] = {
        "client_id": client_id,
        "user_id": user_id,
        "scope": scope,
        "expires_at": time.time() + 600,
        "used": False,
    }
    return code


def consume_auth_code(code: str) -> dict | None:
    entry = _auth_codes.pop(code, None)
    if not entry:
        return None
    if entry.get("used"):
        return None
    if time.time() > entry["expires_at"]:
        return None
    entry["used"] = True
    return entry


def issue_token(client_id: str, user_id: str, scope: str) -> dict:
    access_token = f"oa_{secrets.token_hex(24)}"
    refresh_token = f"or_{secrets.token_hex(24)}"
    jti = str(uuid.uuid4())
    now = int(time.time())
    _tokens[access_token] = {
        "jti": jti,
        "client_id": client_id,
        "user_id": user_id,
        "scope": scope,
        "issued_at": now,
        "expires_at": now + MCP_ACCESS_TOKEN_EXPIRY,
    }
    _refresh_tokens[refresh_token] = {
        "client_id": client_id,
        "user_id": user_id,
        "scope": scope,
        "expires_at": now + MCP_REFRESH_TOKEN_EXPIRY,
    }
    return {
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": MCP_ACCESS_TOKEN_EXPIRY,
        "refresh_token": refresh_token,
        "scope": scope,
    }


def verify_access_token(token: str) -> dict | None:
    entry = _tokens.get(token)
    if not entry:
        return None
    if time.time() > entry["expires_at"]:
        _tokens.pop(token, None)
        return None
    return entry


def revoke_token(token: str) -> bool:
    if token in _tokens:
        _tokens.pop(token, None)
        return True
    for rt, rt_data in list(_refresh_tokens.items()):
        if rt == token:
            _refresh_tokens.pop(rt, None)
            return True
    return False


def rotate_refresh_token(old_refresh: str) -> dict | None:
    entry = _refresh_tokens.pop(old_refresh, None)
    if not entry:
        return None
    if time.time() > entry["expires_at"]:
        return None
    return issue_token(entry["client_id"], entry["user_id"], entry["scope"])


def get_jwks() -> list[dict]:
    return [
        {
            "kty": "oct",
            "alg": "HS256",
            "kid": "mcp-oauth-v1",
            "use": "sig",
        }
    ]


def get_discovery_doc(base_url: str) -> dict:
    return {
        "issuer": f"{base_url}/mcp/oauth",
        "authorization_endpoint": f"{base_url}/mcp/oauth/authorize",
        "token_endpoint": f"{base_url}/mcp/oauth/token",
        "revocation_endpoint": f"{base_url}/mcp/oauth/revoke",
        "jwks_uri": f"{base_url}/mcp/oauth/jwks",
        "scopes_supported": ["read", "write:orders", "write:positions"],
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "token_endpoint_auth_methods_supported": ["client_secret_basic"],
        "code_challenge_methods_supported": ["S256"],
    }
