from __future__ import annotations

from unittest.mock import AsyncMock


def test_get_portfolio(client, mock_session):
    resp = client.get("/portfolio")
    assert resp.status_code == 200
    data = resp.json()
    assert "cash" in data
    assert "total_value" in data
    assert "positions" in data


def test_get_portfolio_history(client, mock_session):
    mock_scalars = AsyncMock()
    mock_scalars.all.return_value = []
    mock_session.execute.return_value.scalars.return_value = mock_scalars

    resp = client.get("/portfolio/history")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
