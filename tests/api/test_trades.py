from __future__ import annotations


def test_get_trades(client):
    resp = client.get("/trades")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
