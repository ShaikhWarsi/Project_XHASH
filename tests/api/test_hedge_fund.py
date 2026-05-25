from __future__ import annotations


def test_hedge_fund_agents(client):
    resp = client.get("/hedge-fund/agents")
    assert resp.status_code == 200
    data = resp.json()
    assert "agents" in data
    assert len(data["agents"]) > 0
    assert "key" in data["agents"][0]
    assert "display_name" in data["agents"][0]
