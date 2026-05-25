from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from execution.exchanges.base import BaseRestClient

logger = logging.getLogger(__name__)


def create_exchange_client(
    exchange: str,
    api_key: str = "",
    api_secret: str = "",
    passphrase: str = "",
    config: Optional[Dict[str, Any]] = None,
) -> Optional[BaseRestClient]:
    name = exchange.lower().strip()

    if name in ("binance", "binance_futures"):
        from execution.exchanges.binance import BinanceFuturesClient
        return BinanceFuturesClient(api_key=api_key, api_secret=api_secret, config=config)

    if name == "binance_spot":
        from execution.exchanges.binance_spot import BinanceSpotClient
        return BinanceSpotClient(api_key=api_key, api_secret=api_secret, config=config)

    if name == "okx":
        from execution.exchanges.okx import OkxClient
        return OkxClient(api_key=api_key, api_secret=api_secret, passphrase=passphrase, config=config)

    if name == "bybit":
        from execution.exchanges.bybit import BybitClient
        return BybitClient(api_key=api_key, api_secret=api_secret, config=config)

    if name in ("coinbase", "coinbase_exchange"):
        from execution.exchanges.coinbase import CoinbaseExchangeClient
        return CoinbaseExchangeClient(api_key=api_key, api_secret=api_secret, passphrase=passphrase, config=config)

    if name in ("kraken", "kraken_spot"):
        from execution.exchanges.kraken import KrakenClient
        return KrakenClient(api_key=api_key, api_secret=api_secret, config=config)

    if name == "kraken_futures":
        from execution.exchanges.kraken_futures import KrakenFuturesClient
        return KrakenFuturesClient(api_key=api_key, api_secret=api_secret, config=config)

    if name == "kucoin":
        from execution.exchanges.kucoin import KucoinSpotClient
        return KucoinSpotClient(api_key=api_key, api_secret=api_secret, passphrase=passphrase, config=config)

    if name in ("gate", "gate_spot"):
        from execution.exchanges.gate import GateSpotClient
        return GateSpotClient(api_key=api_key, api_secret=api_secret, config=config)

    if name in ("bitget", "bitget_mix"):
        from execution.exchanges.bitget import BitgetMixClient
        return BitgetMixClient(api_key=api_key, api_secret=api_secret, passphrase=passphrase, config=config)

    if name == "bitget_spot":
        from execution.exchanges.bitget_spot import BitgetSpotClient
        return BitgetSpotClient(api_key=api_key, api_secret=api_secret, config=config)

    if name == "deepcoin":
        from execution.exchanges.deepcoin import DeepcoinClient
        return DeepcoinClient(api_key=api_key, api_secret=api_secret, config=config)

    if name == "htx":
        from execution.exchanges.htx import HtxClient
        return HtxClient(api_key=api_key, api_secret=api_secret, config=config)

    logger.warning("Unknown exchange: %s", exchange)
    return None


_client_cache: Dict[str, BaseRestClient] = {}


def get_or_create_exchange_client(
    exchange: str,
    api_key: str = "",
    api_secret: str = "",
    passphrase: str = "",
    config: Optional[Dict[str, Any]] = None,
) -> Optional[BaseRestClient]:
    cache_key = f"{exchange}:{api_key[:8]}"
    if cache_key in _client_cache:
        return _client_cache[cache_key]

    client = create_exchange_client(exchange, api_key, api_secret, passphrase, config)
    if client:
        _client_cache[cache_key] = client
    return client
