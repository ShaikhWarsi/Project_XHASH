from __future__ import annotations


def test_get_config(client):
    resp = client.get("/config")
    assert resp.status_code == 200
    data = resp.json()
    assert "llm_provider" in data
    assert "max_position_size_pct" in data
    assert "max_leverage" in data
    assert "max_drawdown_pct" in data
    assert "stop_loss_atr" in data


def test_update_config(client):
    resp = client.put("/config", json={"llm_provider": "ollama"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["config"]["llm_provider"] == "ollama"
