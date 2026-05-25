from __future__ import annotations


def test_backtest_sma_cross_strategy(client):
    resp = client.post("/backtest/run", json={
        "tickers": ["AAPL"],
        "start": "2024-01-01",
        "end": "2024-03-01",
        "capital": 100000,
        "strategy": "sma_cross",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "total_return" in data


def test_backtest_momentum_strategy(client):
    resp = client.post("/backtest/run", json={
        "tickers": ["AAPL"],
        "start": "2024-01-01",
        "end": "2024-03-01",
        "capital": 100000,
        "strategy": "momentum",
    })
    assert resp.status_code == 200
    assert "total_return" in resp.json()


def test_backtest_mean_reversion_strategy(client):
    resp = client.post("/backtest/run", json={
        "tickers": ["AAPL"],
        "start": "2024-01-01",
        "end": "2024-03-01",
        "capital": 100000,
        "strategy": "mean_reversion",
    })
    assert resp.status_code == 200
    assert "total_return" in resp.json()


def test_backtest_default_strategy_is_sma_cross(client):
    resp = client.post("/backtest/run", json={
        "tickers": ["AAPL"],
        "start": "2024-01-01",
        "end": "2024-03-01",
        "capital": 100000,
    })
    assert resp.status_code == 200
    assert "total_return" in resp.json()


def test_backtest_invalid_strategy_falls_back(client):
    resp = client.post("/backtest/run", json={
        "tickers": ["AAPL"],
        "start": "2024-01-01",
        "end": "2024-03-01",
        "capital": 100000,
        "strategy": "nonexistent",
    })
    assert resp.status_code == 200
    assert "total_return" in resp.json()


def test_backtest_engine_param(client):
    resp = client.post("/backtest/run", json={
        "tickers": ["AAPL"],
        "start": "2024-01-01",
        "end": "2024-03-01",
        "capital": 100000,
        "engine_type": "us_equity",
        "leverage": 1.5,
    })
    assert resp.status_code == 200
    assert "total_return" in resp.json()


def test_backtest_list_engines(client):
    resp = client.get("/backtest/engines")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "id" in data[0]
    assert "label" in data[0]


def test_backtest_list_runs(client):
    client.post("/backtest/run", json={
        "tickers": ["AAPL"],
        "start": "2024-01-01",
        "end": "2024-03-01",
        "capital": 100000,
    })
    resp = client.get("/backtest/list")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
