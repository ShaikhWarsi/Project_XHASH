from __future__ import annotations

from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

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
    with patch("api.routes.market_data.get_session") as mock_gs, \
         patch("api.routes.portfolio.get_session") as mock_gs2, \
         patch("api.routes.backtest_routes.get_session") as mock_gs3:
        mock_gs.return_value.__aenter__.return_value = mock_session
        mock_gs2.return_value.__aenter__.return_value = mock_session
        mock_gs3.return_value.__aenter__.return_value = mock_session
        yield
