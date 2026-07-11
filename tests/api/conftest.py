from __future__ import annotations

import os
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

os.environ["TESTING"] = "1"

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.app import create_app


@pytest.fixture
def app() -> FastAPI:
    return create_app()


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    return TestClient(app)


@pytest.fixture
def mock_session():
    session = AsyncMock()
    session.commit = AsyncMock()
    session.execute = AsyncMock()
    session.add = MagicMock()
    session.delete = AsyncMock()
    return session


@pytest.fixture(autouse=True)
def mock_db_dependency(mock_session):
    patches = [
        "api.routes.market_data.get_session",
        "api.routes.portfolio.get_session",
        "api.routes.backtest_routes.get_session",
        "api.routes.auth.get_session",
        "api.routes.hedge_fund.get_session",
        "api.routes.flows.get_session",
        "api.routes.agent.strategies.get_session",
        "api.routes.agent.jobs.get_session",
        "api.routes.agent.backtests.get_session",
        "api.routes.agent.admin.get_session",
    ]
    mocks = []
    for target in patches:
        p = patch(target)
        mock_obj = p.start()
        mock_obj.return_value.__aenter__.return_value = mock_session
        mocks.append(p)
    yield
    for p in mocks:
        p.stop()
