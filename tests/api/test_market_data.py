from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest


def test_search_default(client):
    resp = client.get("/v1/market/search")
    assert resp.status_code == 200
    data = resp.json()
    assert "results" in data


@pytest.mark.skip("Requires Finnhub API key")
def test_search_with_query(client):
    resp = client.get("/v1/market/search?q=AAPL")
    assert resp.status_code == 200


def test_quote_not_found(client):
    with patch("api.routes.market_data._get_finnhub") as mock_fh:
        mock_fh.return_value.get_quote.side_effect = Exception("API error")
        resp = client.get("/v1/market/quote/INVALID")
        assert resp.status_code == 502


def test_watchlist_empty(client, mock_session):
    mock_scalars = AsyncMock()
    mock_scalars.all.return_value = []
    mock_session.execute.return_value.scalars.return_value = mock_scalars

    resp = client.get("/v1/market/watchlist")
    assert resp.status_code == 200
    data = resp.json()
    assert "watchlist" in data
    assert data["watchlist"] == []


def test_watchlist_add(client, mock_session):
    from persistence.models import WatchlistItem
    mock_session.execute.return_value.scalar_one_or_none.return_value = None

    mock_scalars = AsyncMock()
    mock_scalars.all.return_value = [WatchlistItem(id=1, user_id="default", symbol="AAPL", company="Apple Inc.")]
    mock_session.execute.return_value.scalars.return_value = mock_scalars

    resp = client.post("/v1/market/watchlist", json={"symbol": "AAPL", "company": "Apple Inc."})
    assert resp.status_code == 200
    data = resp.json()
    assert "watchlist" in data


def test_watchlist_add_missing_symbol(client):
    resp = client.post("/v1/market/watchlist", json={})
    assert resp.status_code == 400


def test_watchlist_remove(client, mock_session):
    mock_scalars = AsyncMock()
    mock_scalars.all.return_value = []
    mock_session.execute.return_value.scalars.return_value = mock_scalars

    resp = client.delete("/v1/market/watchlist/AAPL")
    assert resp.status_code == 200
    assert "watchlist" in resp.json()


def test_watchlist_check(client, mock_session):
    mock_session.execute.return_value.scalar_one_or_none.return_value = None
    resp = client.get("/v1/market/watchlist/check/AAPL")
    assert resp.status_code == 200
    assert resp.json() == {"in_watchlist": False}


def test_alerts_empty(client, mock_session):
    mock_scalars = AsyncMock()
    mock_scalars.all.return_value = []
    mock_session.execute.return_value.scalars.return_value = mock_scalars

    resp = client.get("/v1/market/alerts")
    assert resp.status_code == 200
    assert "alerts" in resp.json()


def test_alerts_create(client, mock_session):
    from persistence.models import PriceAlert
    mock_alert = PriceAlert(id=1, user_id="default", symbol="AAPL", target_price=200.0, condition="ABOVE")
    mock_session.add.return_value = None

    resp = client.post("/v1/market/alerts", json={"symbol": "AAPL", "target_price": 200, "condition": "ABOVE"})
    assert resp.status_code == 200
    data = resp.json()
    assert "alert" in data


def test_alerts_create_invalid_condition(client):
    resp = client.post("/v1/market/alerts", json={"symbol": "AAPL", "target_price": 200, "condition": "INVALID"})
    assert resp.status_code == 400


def test_alerts_delete(client, mock_session):
    mock_session.execute.return_value.scalar_one_or_none.return_value = None
    resp = client.delete("/v1/market/alerts/1")
    assert resp.status_code == 200
    assert resp.json() == {"success": False}
