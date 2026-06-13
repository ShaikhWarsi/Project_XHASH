from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from collections import defaultdict
from typing import Any

import websockets
from websockets.asyncio.server import serve

logger = logging.getLogger(__name__)


class WebSocketProxy:
    def __init__(self, host: str = "127.0.0.1", port: int = 8765):
        self.host = host
        self.port = port
        self.clients: dict[int, Any] = {}
        self.subscriptions: dict[int, set[str]] = {}
        self.user_mapping: dict[int, str] = {}
        self.last_tick_time: dict[str, float] = {}
        self.subscription_index: dict[tuple[str, str, int], set[int]] = defaultdict(set)
        self.last_message_time: dict[tuple[str, str, int], float] = {}
        self.message_throttle_interval = 0.05
        self.running = False
        self._messages_processed = 0
        self._server = None
        self._zmq_task = None

    async def start(self):
        self.running = True
        try:
            self._server = await serve(self.handle_client, self.host, self.port)
            logger.info("WebSocket proxy started on ws://%s:%d", self.host, self.port)
            await self._server.serve_forever()
        except Exception as e:
            logger.exception("Failed to start WebSocket proxy: %s", e)
            raise

    async def stop(self):
        self.running = False
        if self._server:
            self._server.close()
            await self._server.wait_closed()
        for ws in list(self.clients.values()):
            try:
                await ws.close()
            except Exception:
                pass
        self.clients.clear()
        self.subscriptions.clear()
        self.user_mapping.clear()
        self.subscription_index.clear()
        logger.info("WebSocket proxy stopped")

    async def handle_client(self, websocket):
        client_id = id(websocket)
        self.clients[client_id] = websocket
        self.subscriptions[client_id] = set()

        try:
            async for message in websocket:
                try:
                    await self.process_message(client_id, message)
                except Exception as e:
                    logger.exception("Error processing message: %s", e)
                    await self.send_error(client_id, "PROCESSING_ERROR", str(e))
        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            logger.exception("Client error: %s", e)
        finally:
            await self.cleanup_client(client_id)

    async def process_message(self, client_id: int, message: str):
        try:
            data = json.loads(message)
        except json.JSONDecodeError:
            await self.send_error(client_id, "INVALID_JSON", "Invalid JSON")
            return

        action = data.get("action") or data.get("type", "")
        if action in ("authenticate", "auth"):
            await self.authenticate(client_id, data)
        elif action == "subscribe":
            await self.subscribe(client_id, data)
        elif action in ("unsubscribe", "unsubscribe_all"):
            await self.unsubscribe(client_id, data)
        elif action == "ping":
            await self.send_message(client_id, {"type": "pong", "timestamp": time.time()})
        else:
            await self.send_error(client_id, "INVALID_ACTION", f"Unknown action: {action}")

    async def authenticate(self, client_id: int, data: dict):
        api_key = data.get("api_key") or data.get("apikey")
        if not api_key:
            await self.send_error(client_id, "AUTH_ERROR", "API key required")
            return
        user_id = f"user_{api_key[:8]}"
        self.user_mapping[client_id] = user_id
        await self.send_message(client_id, {
            "type": "auth",
            "status": "success",
            "message": "Authenticated",
            "user_id": user_id,
            "supported_features": {"ltp": True, "quote": True, "depth": True},
        })
        logger.info("Client %d authenticated as %s", client_id, user_id)

    async def subscribe(self, client_id: int, data: dict):
        symbol = data.get("symbol", "")
        exchange = data.get("exchange", "NSE")
        mode = data.get("mode", 1)
        sub = json.dumps({"symbol": symbol, "exchange": exchange, "mode": mode})
        self.subscriptions[client_id].add(sub)
        self.subscription_index[(symbol, exchange, mode)].add(client_id)
        await self.send_message(client_id, {
            "type": "subscription",
            "status": "success",
            "symbol": symbol,
            "exchange": exchange,
            "mode": mode,
        })

    async def unsubscribe(self, client_id: int, data: dict):
        symbol = data.get("symbol", "")
        exchange = data.get("exchange", "")
        mode = data.get("mode", 1)
        sub = json.dumps({"symbol": symbol, "exchange": exchange, "mode": mode})
        self.subscriptions[client_id].discard(sub)
        key = (symbol, exchange, mode)
        if key in self.subscription_index:
            self.subscription_index[key].discard(client_id)
            if not self.subscription_index[key]:
                del self.subscription_index[key]

    async def cleanup_client(self, client_id: int):
        self.clients.pop(client_id, None)
        subs = self.subscriptions.pop(client_id, set())
        for sub_json in subs:
            try:
                info = json.loads(sub_json)
                key = (info["symbol"], info["exchange"], info["mode"])
                if key in self.subscription_index:
                    self.subscription_index[key].discard(client_id)
                    if not self.subscription_index[key]:
                        del self.subscription_index[key]
            except Exception:
                pass
        self.user_mapping.pop(client_id, None)

    async def broadcast_tick(self, symbol: str, exchange: str, mode: int, data: dict):
        key = (symbol, exchange, mode)
        now = time.time()
        if key in self.last_message_time and now - self.last_message_time[key] < self.message_throttle_interval:
            return
        self.last_message_time[key] = now
        self._messages_processed += 1
        for cid in list(self.subscription_index.get(key, set())):
            ws = self.clients.get(cid)
            if ws:
                try:
                    await ws.send(json.dumps({"type": "tick", "symbol": symbol, "exchange": exchange, "mode": mode, **data}))
                except Exception:
                    pass
        for uid in self.user_mapping.values():
            self.last_tick_time[uid] = now

    async def send_message(self, client_id: int, data: dict):
        ws = self.clients.get(client_id)
        if ws:
            try:
                await ws.send(json.dumps(data))
            except Exception:
                pass

    async def send_error(self, client_id: int, code: str, message: str):
        await self.send_message(client_id, {"type": "error", "code": code, "message": message})

    def get_health(self) -> dict:
        return {
            "running": self.running,
            "clients": len(self.clients),
            "subscriptions": len(self.subscription_index),
            "messages_processed": self._messages_processed,
        }
