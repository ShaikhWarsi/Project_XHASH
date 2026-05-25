import pytest
import pandas as pd
import numpy as np


class TestSQLAggregator:
    @pytest.fixture
    def agg(self):
        from analytics.research.sql_aggregator import SQLAggregator
        return SQLAggregator("sqlite:///:memory:")

    def test_list_tables_memory(self, agg):
        tables = agg.list_tables()
        assert isinstance(tables, list)

    def test_list_views_memory(self, agg):
        views = agg.list_views()
        assert isinstance(views, list)

    def test_query_returns_dataframe(self, agg):
        df = agg.query("SELECT 1 as val")
        assert isinstance(df, pd.DataFrame)
        assert df["val"].iloc[0] == 1

    def test_register_view(self, agg):
        agg.query("CREATE TABLE test_data (symbol TEXT, value REAL)")
        agg.query("INSERT INTO test_data VALUES ('AAPL', 150.0)")
        agg.register_view("test_view", "SELECT * FROM test_data")
        views = agg.list_views()
        assert "test_view" in views

    def test_daily_returns_needs_bars_table(self, agg):
        with pytest.raises(Exception):
            agg.daily_returns("NONEXISTENT")
