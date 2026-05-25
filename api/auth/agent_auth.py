from __future__ import annotations

import json
import logging
import threading
import time
from datetime import datetime
from functools import wraps
from typing import Any, Callable, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse

from api.auth.agent_scopes import (
    SCOPE_R,
    ALL_SCOPES,
    TOKEN_PREFIX,
    hash_token,
    parse_scopes,
    parse_csv_list,
    list_matches,
)
from persistence.database import get_session
from persistence.models import AgentToken, AgentAudit
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

_REDACT_KEYS = {"password", "secret", "token", "apikey", "api_key", "authorization"}

_rate_state: dict[int, list[float]] = {}
_rate_lock = threading.Lock()


def _check_rate_limit(token_id: int, limit_per_min: int) -> bool:
    now = time.time()
    window_start = now - 60.0
    with _rate_lock:
        bucket = [t for t in _rate_state.get(token_id, []) if t >= window_start]
        if len(bucket) >= max(1, int(limit_per_min)):
            _rate_state[token_id] = bucket
            return False
        bucket.append(now)
        _rate_state[token_id] = bucket
        return True


def _redact(obj: Any, depth: int = 0) -> Any:
    if depth > 3:
        return "<truncated>"
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if str(k).lower() in _REDACT_KEYS:
                out[k] = "<redacted>"
            else:
                out[k] = _redact(v, depth + 1)
        return out
    if isinstance(obj, list):
        return [_redact(v, depth + 1) for v in obj[:20]]
    if isinstance(obj, (str, int, float, bool)) or obj is None:
        if isinstance(obj, str) and len(obj) > 500:
            return obj[:500] + "..."
        return obj
    return str(type(obj).__name__)


class AgentTokenData:
    def __init__(self, row: AgentToken):
        self.id = row.id
        self.user_id = row.user_id
        self.name = row.name
        self.scopes = parse_scopes(row.scopes)
        self.markets = parse_csv_list(row.markets)
        self.instruments = parse_csv_list(row.instruments)
        self.paper_only = row.paper_only
        self.rate_limit_per_min = row.rate_limit_per_min
        self.status = row.status
        self.expires_at = row.expires_at


async def agent_required(
    request: Request,
    scope: str = SCOPE_R,
    db: AsyncSession = Depends(get_session),
) -> AgentTokenData:
    if scope not in ALL_SCOPES:
        raise ValueError(f"invalid scope: {scope}")

    auth_header = request.headers.get("Authorization", "")
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": 401, "message": "Missing or malformed agent token"},
        )

    raw_token = parts[1]
    if not raw_token.startswith(TOKEN_PREFIX):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": 401, "message": "Missing or malformed agent token"},
        )

    token_hash = hash_token(raw_token)
    result = await db.execute(select(AgentToken).where(AgentToken.token_hash == token_hash))
    row = result.scalar_one_or_none()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": 401, "message": "Unknown agent token"},
        )

    if row.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": 401, "message": f"Token is {row.status}"},
        )

    if row.expires_at and row.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": 401, "message": "Token expired"},
        )

    token_data = AgentTokenData(row)

    if scope not in token_data.scopes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": 403,
                "message": f"Token lacks required scope: {scope}",
                "granted": sorted(token_data.scopes),
            },
        )

    if not _check_rate_limit(row.id, token_data.rate_limit_per_min):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": 429,
                "message": "Rate limit exceeded for this token",
                "retriable": True,
                "limit_per_min": token_data.rate_limit_per_min,
            },
        )

    row.last_used_at = datetime.utcnow()
    await db.commit()

    request.state.agent_token = token_data
    request.state.agent_user_id = row.user_id

    return token_data


def scope_required(scope: str = SCOPE_R):
    async def dependency(
        request: Request,
        token: AgentTokenData = Depends(lambda req=Depends(agent_required): req),
    ) -> AgentTokenData:
        return token

    return dependency


async def write_audit_log(
    db: AsyncSession,
    token: Optional[AgentTokenData],
    user_id: int,
    route: str,
    method: str,
    scope_class: str,
    status_code: int,
    duration_ms: int,
    request_obj: Request,
    response_summary: Any = None,
) -> None:
    try:
        req_summary = {"args": _redact(dict(request_obj.query_params))}
        if request_obj.method in ("POST", "PUT", "PATCH"):
            try:
                body = await request_obj.json()
                req_summary["json"] = _redact(body)
            except Exception:
                req_summary["json"] = "<unreadable>"

        audit = AgentAudit(
            user_id=user_id,
            agent_token_id=token.id if token else None,
            agent_name=token.name if token else None,
            route=route,
            method=method,
            scope_class=scope_class,
            status_code=status_code,
            idempotency_key=request_obj.headers.get("Idempotency-Key"),
            request_summary=json.dumps(req_summary, default=str)[:8000],
            response_summary=json.dumps(_redact(response_summary), default=str)[:8000]
            if response_summary is not None
            else None,
            duration_ms=int(duration_ms),
        )
        db.add(audit)
        await db.commit()
    except Exception as exc:
        logger.warning("Audit write failed: %s", exc)


def market_allowed(token: AgentTokenData, market: str) -> bool:
    return list_matches(market, token.markets)


def instrument_allowed(token: AgentTokenData, symbol: str) -> bool:
    return list_matches(symbol, token.instruments)


def paper_only(token: AgentTokenData) -> bool:
    return token.paper_only
