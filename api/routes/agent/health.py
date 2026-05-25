from fastapi import Depends

from api.auth.agent_scopes import SCOPE_R
from api.auth.agent_auth import agent_required, AgentTokenData
from api.routes.agent import agent_v1


@agent_v1.get("/health")
async def health():
    return {"status": "ok", "service": "agent_gateway_v1"}


@agent_v1.get("/whoami")
async def whoami(token: AgentTokenData = Depends(agent_required)):
    return {
        "id": token.id,
        "name": token.name,
        "scopes": sorted(token.scopes),
        "paper_only": token.paper_only,
        "rate_limit_per_min": token.rate_limit_per_min,
    }
