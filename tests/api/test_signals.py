from __future__ import annotations


def test_get_signals(client):
    resp = client.get("/signals/")
    assert resp.status_code == 200
    data = resp.json()
    assert "timestamp" in data
    assert "signals" in data
    assert "composite_scores" in data


def test_get_signals_latest(client):
    resp = client.get("/signals/latest")
    assert resp.status_code == 200
    data = resp.json()
    assert "timestamp" in data
    assert "signals" in data
    assert "composite_scores" in data


def test_health_check(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "uptime_seconds" in data
    assert "dependencies" in data
    assert "database" in data["dependencies"]
    assert "ccxt" in data["dependencies"]


def test_root_redirects(client):
    resp = client.get("/", follow_redirects=False)
    assert resp.status_code in (200, 307)
