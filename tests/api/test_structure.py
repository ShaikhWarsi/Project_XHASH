from __future__ import annotations

from unittest.mock import patch


def test_structure_endpoint(client):
    with patch("api.routes.structure.StructureFusionEngine") as mock_engine:
        mock_instance = mock_engine.return_value
        mock_instance.fuse.return_value = None
        resp = client.get("/v1/structure/AAPL")
        assert resp.status_code == 200
        data = resp.json()
        assert "composite_bias" in data or "total_signals" in data
