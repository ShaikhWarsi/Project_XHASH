from __future__ import annotations

import logging
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse

from api.services.mcp_oauth_service import (
    _clients,
    consume_auth_code,
    get_client,
    get_discovery_doc,
    get_jwks,
    issue_auth_code,
    issue_token,
    register_client,
    revoke_token,
    rotate_refresh_token,
    verify_client,
    verify_access_token,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mcp/oauth", tags=["mcp_oauth"])
wellknown_router = APIRouter(tags=["mcp_wellknown"])


@wellknown_router.get("/.well-known/oauth-authorization-server")
async def discovery_doc(request: Request):
    base = str(request.base_url).rstrip("/")
    return get_discovery_doc(base)


@wellknown_router.get("/.well-known/openid-configuration")
async def openid_config(request: Request):
    base = str(request.base_url).rstrip("/")
    return get_discovery_doc(base)


@router.get("/clients")
async def list_clients():
    return {"clients": [{"client_id": c["client_id"], "client_name": c["client_name"], "grant_types": c["grant_types"]} for c in _clients.values()]}


@router.get("/jwks")
async def jwks():
    return {"keys": get_jwks()}


@router.post("/register")
async def register(body: dict):
    client_name = body.get("client_name", body.get("application_type", "mcp-client"))
    redirect_uris = body.get("redirect_uris", [])
    result = register_client(client_name, redirect_uris)
    return {
        "client_id": result["client_id"],
        "client_secret": result["client_secret"],
        "client_id_issued_at": 0,
        "client_secret_expires_at": 0,
    }


@router.post("/token")
async def token(request: Request):
    form_data: dict
    content_type = request.headers.get("content-type", "")
    if "application/x-www-form-urlencoded" in content_type:
        form_data = dict(await request.form())
    else:
        form_data = await request.json()

    grant_type = form_data.get("grant_type", "authorization_code")

    if grant_type == "authorization_code":
        code = form_data.get("code", "")
        client_id = form_data.get("client_id", "")
        client_secret = form_data.get("client_secret", "")
        redirect_uri = form_data.get("redirect_uri", "")

        if not verify_client(client_id, client_secret):
            raise HTTPException(401, "Invalid client credentials")

        auth = consume_auth_code(code)
        if not auth:
            raise HTTPException(400, "Invalid or expired authorization code")

        tokens = issue_token(client_id, auth["user_id"], auth["scope"])
        return tokens

    elif grant_type == "refresh_token":
        refresh = form_data.get("refresh_token", "")
        result = rotate_refresh_token(refresh)
        if not result:
            raise HTTPException(400, "Invalid or expired refresh token")
        return result

    raise HTTPException(400, f"Unsupported grant_type: {grant_type}")


@router.get("/authorize")
async def authorize_get(
    request: Request,
    response_type: str = "code",
    client_id: str = "",
    redirect_uri: str = "",
    scope: str = "read",
    state: str = "",
):
    return await _authorize(response_type, client_id, redirect_uri, scope, state)


@router.post("/authorize")
async def authorize_post(body: dict):
    return await _authorize(
        body.get("response_type", "code"),
        body.get("client_id", ""),
        body.get("redirect_uri", ""),
        body.get("scope", "read"),
        body.get("state", ""),
    )


async def _authorize(response_type: str, client_id: str, redirect_uri: str, scope: str, state: str):
    if not client_id:
        raise HTTPException(400, "client_id required")
    client = get_client(client_id)
    if not client:
        raise HTTPException(400, "Invalid client_id")

    code = issue_auth_code(client_id, "default_user", scope)
    params = {"code": code, "state": state}
    if redirect_uri:
        return RedirectResponse(f"{redirect_uri}?{urlencode(params)}")
    return {"code": code, "state": state}


@router.post("/revoke")
async def revoke(body: dict):
    token_hint = body.get("token", "")
    revoke_token(token_hint)
    return {"ok": True}
