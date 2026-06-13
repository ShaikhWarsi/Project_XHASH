from __future__ import annotations

import logging
from typing import Callable

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from persistence.models_traffic import IPBan, Error404Tracker, InvalidAPIKeyTracker
from persistence.multi_db import multi_db

logger = logging.getLogger(__name__)


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "unknown"

        if client_ip in ("127.0.0.1", "::1", "localhost"):
            return await call_next(request)

        if await self._is_banned(client_ip):
            return JSONResponse(status_code=403, content={"detail": "Your IP has been banned"})

        response = await call_next(request)

        if response.status_code == 404:
            await self._track_404(client_ip, request.url.path)

        return response

    async def _is_banned(self, ip: str) -> bool:
        try:
            factory = multi_db.get_factory("logs")
            async with factory() as session:
                from sqlalchemy import select
                result = await session.execute(
                    select(IPBan).where(IPBan.ip_address == ip)
                )
                ban = result.scalar_one_or_none()
                if ban:
                    if ban.is_permanent:
                        return True
                    if ban.expires_at:
                        from datetime import datetime, timezone
                        if datetime.now(timezone.utc) < ban.expires_at.replace(tzinfo=timezone.utc):
                            return True
                        await session.delete(ban)
                        await session.commit()
                    return False
                return False
        except Exception:
            return False

    async def _track_404(self, ip: str, path: str):
        try:
            factory = multi_db.get_factory("logs")
            async with factory() as session:
                from sqlalchemy import select
                from datetime import datetime, timezone

                result = await session.execute(
                    select(Error404Tracker).where(Error404Tracker.ip_address == ip)
                )
                tracker = result.scalar_one_or_none()

                now = datetime.now(timezone.utc)

                if tracker:
                    if hasattr(tracker.first_error_at, 'tzinfo') and tracker.first_error_at.tzinfo and (now - tracker.first_error_at).days >= 1:
                        tracker.error_count = 1
                        tracker.first_error_at = now
                        tracker.paths_attempted = f'["{path}"]'
                    else:
                        tracker.error_count += 1
                        import json
                        paths = json.loads(tracker.paths_attempted or "[]")
                        if path not in paths:
                            paths.append(path)
                            tracker.paths_attempted = json.dumps(paths[-50:])
                    tracker.last_error_at = now
                else:
                    tracker = Error404Tracker(
                        ip_address=ip,
                        error_count=1,
                        paths_attempted=f'["{path}"]',
                    )
                    session.add(tracker)
                await session.commit()
        except Exception as e:
            logger.error(f"Error tracking 404: {e}")
