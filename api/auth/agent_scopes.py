from __future__ import annotations

import hashlib
import secrets
from typing import Iterable, Optional

SCOPE_R = "R"
SCOPE_W = "W"
SCOPE_B = "B"
SCOPE_N = "N"
SCOPE_C = "C"
SCOPE_T = "T"

ALL_SCOPES = (SCOPE_R, SCOPE_W, SCOPE_B, SCOPE_N, SCOPE_C, SCOPE_T)

TOKEN_PREFIX = "te_agent_"


def generate_token() -> tuple[str, str, str]:
    body = secrets.token_urlsafe(32).rstrip("=")
    full = f"{TOKEN_PREFIX}{body}"
    prefix = full[: len(TOKEN_PREFIX) + 8]
    return full, prefix, hash_token(full)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def parse_scopes(raw: str | Iterable[str] | None) -> set[str]:
    if raw is None:
        return {SCOPE_R}
    if isinstance(raw, str):
        items = [p.strip().upper() for p in raw.split(",") if p.strip()]
    else:
        items = [str(p).strip().upper() for p in raw if str(p).strip()]
    return {p for p in items if p in ALL_SCOPES}


def parse_csv_list(raw: str | None, default: str = "*") -> list[str]:
    if not raw:
        return [default]
    items = [p.strip() for p in str(raw).split(",") if p.strip()]
    return items or [default]


def list_matches(item: str, allowlist: list[str]) -> bool:
    if not allowlist or "*" in allowlist:
        return True
    needle = (item or "").strip().upper()
    return any(needle == a.strip().upper() for a in allowlist)
