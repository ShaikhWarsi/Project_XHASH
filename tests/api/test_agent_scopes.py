import pytest
from api.auth.agent_scopes import (
    SCOPE_R, SCOPE_W, SCOPE_B, SCOPE_N, SCOPE_C, SCOPE_T,
    ALL_SCOPES, TOKEN_PREFIX,
    generate_token, hash_token, parse_scopes, parse_csv_list, list_matches,
)


class TestAgentScopes:
    def test_all_scopes_defined(self):
        assert SCOPE_R == "R"
        assert SCOPE_W == "W"
        assert SCOPE_B == "B"
        assert SCOPE_N == "N"
        assert SCOPE_C == "C"
        assert SCOPE_T == "T"
        assert set(ALL_SCOPES) == {"R", "W", "B", "N", "C", "T"}

    def test_token_generation(self):
        full, prefix, h = generate_token()
        assert full.startswith(TOKEN_PREFIX)
        assert len(full) > len(TOKEN_PREFIX)
        assert len(prefix) == len(TOKEN_PREFIX) + 8
        assert h == hash_token(full)
        assert h != full

    def test_token_uniqueness(self):
        _, _, h1 = generate_token()
        _, _, h2 = generate_token()
        assert h1 != h2

    def test_parse_scopes_none(self):
        assert parse_scopes(None) == {SCOPE_R}

    def test_parse_scopes_string(self):
        assert parse_scopes("R,W,B") == {"R", "W", "B"}
        assert parse_scopes("T") == {"T"}

    def test_parse_scopes_invalid_ignored(self):
        assert parse_scopes("R,X,Y,Z") == {"R"}

    def test_parse_scopes_list(self):
        assert parse_scopes(["R", "B"]) == {"R", "B"}

    def test_parse_csv_list_default(self):
        assert parse_csv_list(None) == ["*"]
        assert parse_csv_list("") == ["*"]

    def test_parse_csv_list_values(self):
        assert parse_csv_list("BTC,ETH,SOL") == ["BTC", "ETH", "SOL"]

    def test_list_matches_wildcard(self):
        assert list_matches("BTC", ["*"]) is True
        assert list_matches("BTC", []) is True

    def test_list_matches_exact(self):
        assert list_matches("BTC", ["ETH", "BTC"]) is True
        assert list_matches("SOL", ["ETH", "BTC"]) is False

    def test_list_matches_case_insensitive(self):
        assert list_matches("btc", ["BTC"]) is True
        assert list_matches("BTC", ["btc"]) is True
