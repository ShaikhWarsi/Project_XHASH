from __future__ import annotations

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)

HAS_NAUTILUS = False
try:
    from nautilus_trader.backtest.engine import BacktestEngine as NautilusBacktestEngine
    from nautilus_trader.config import BacktestEngineConfig, TradingNodeConfig
    from nautilus_trader.model.data import Bar, BarSpecification, BarType
    from nautilus_trader.model.enums import MarketDataType, OrderSide, PositionSide
    from nautilus_trader.model.identifiers import InstrumentId, Symbol, Venue
    from nautilus_trader.model.instruments import Instrument
    from nautilus_trader.trading.strategy import Strategy

    HAS_NAUTILUS = True
except ImportError:
    NautilusBacktestEngine = object  # type: ignore
    Strategy = object  # type: ignore


class NautilusAdapter:
    def __init__(
        self,
        venue_name: str = "EXCHANGE",
        cash: float = 100_000.0,
        engine_config: Optional[Dict[str, Any]] = None,
    ):
        if not HAS_NAUTILUS:
            raise ImportError("nautilus_trader is required. Install: pip install trading-engine[execution]")
        self.venue_name = venue_name
        self.cash = cash
        self.engine_config = engine_config or {}

    def create_engine(
        self,
        instruments: List[Dict[str, Any]],
        start: str,
        end: str,
    ) -> NautilusBacktestEngine:
        engine = NautilusBacktestEngine(
            config=BacktestEngineConfig(
                **self.engine_config,
            )
        )
        for inst in instruments:
            instrument = self._create_instrument(inst)
            engine.add_instrument(instrument)
        engine.add_venue(self.venue_name, oms_type="netting", account_type="cash")
        engine.add_bar_data(instruments, start, end)
        return engine

    def run_strategy(
        self,
        engine: NautilusBacktestEngine,
        strategy: Strategy,
    ) -> Dict[str, Any]:
        engine.add_strategy(strategy)
        engine.run()
        result = self._extract_results(engine)
        engine.reset()
        return result

    def _create_instrument(self, config: Dict[str, Any]) -> Instrument:
        return Instrument(
            instrument_id=InstrumentId(
                Symbol(config["symbol"]),
                Venue(self.venue_name),
            ),
            native_symbol=Symbol(config["symbol"]),
            currency=config.get("currency", "USD"),
            price_precision=config.get("price_precision", 2),
            size_precision=config.get("size_precision", 8),
            price_increment=Decimal(str(config.get("price_increment", "0.01"))),
            size_increment=Decimal(str(config.get("size_increment", "0.00000001"))),
        )

    def _extract_results(self, engine: NautilusBacktestEngine) -> Dict[str, Any]:
        result = engine.get_result()
        return {
            "total_return": float(result.get("total_return", 0)),
            "sharpe": float(result.get("sharpe", 0)),
            "max_drawdown": float(result.get("max_drawdown", 0)),
            "total_trades": int(result.get("total_trades", 0)),
            "win_rate": float(result.get("win_rate", 0)),
        }
