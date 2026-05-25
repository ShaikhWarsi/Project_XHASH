from __future__ import annotations


def test_get_metrics(client):
    resp = client.get("/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_return" in data
    assert "sharpe_ratio" in data
    assert "max_drawdown" in data


def test_get_attribution(client):
    resp = client.get("/metrics/attribution")
    assert resp.status_code == 200
    data = resp.json()
    assert "by_symbol" in data
    assert "by_signal_type" in data
