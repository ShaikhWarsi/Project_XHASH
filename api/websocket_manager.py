from __future__ import annotations
import asyncio
import json
import logging
import time
import uuid
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ManagedConnection:
    def __init__(self, ws: WebSocket, channel: str):
        self.ws = ws
        self.channel = channel
        self.id = str(uuid.uuid4())[:8]
        self.created_at = time.time()
        self.last_pong = time.time()

class ConnectionManager:
    MAX_CONNECTIONS_PER_CHANNEL = 20
    PING_INTERVAL = 25.0
    PONG_TIMEOUT = 10.0

    def __init__(self):
        self._connections: dict[str, list[ManagedConnection]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, channel: str, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            conns = self._connections.setdefault(channel, [])
            if len(conns) >= self.MAX_CONNECTIONS_PER_CHANNEL:
                stale = conns.pop(0)
                try:
                    await stale.ws.close(code=1001)
                except Exception:
                    pass
            mc = ManagedConnection(ws, channel)
            conns.append(mc)
            logger.info("ws_connect", extra={"channel": channel, "conn_id": mc.id, "total": len(conns)})
            return mc

    async def disconnect(self, mc: ManagedConnection):
        async with self._lock:
            conns = self._connections.get(mc.channel, [])
            conns[:] = [c for c in conns if c.id != mc.id]
            if not conns:
                self._connections.pop(mc.channel, None)
        logger.info("ws_disconnect", extra={"channel": mc.channel, "conn_id": mc.id})

    async def disconnect_ws(self, channel: str, ws: WebSocket):
        async with self._lock:
            conns = self._connections.get(channel, [])
            conns[:] = [c for c in conns if c.ws is not ws]
            if not conns:
                self._connections.pop(channel, None)

    def get_connections(self, channel: str) -> list[ManagedConnection]:
        return list(self._connections.get(channel, []))

    def get_all_connections(self) -> list[ManagedConnection]:
        return [mc for conns in self._connections.values() for mc in conns]

    async def broadcast(self, channel: str, data: dict[str, Any]):
        async with self._lock:
            conns = list(self._connections.get(channel, []))
        dead: list[ManagedConnection] = []
        for mc in conns:
            try:
                await mc.ws.send_json(data)
            except Exception:
                logger.debug("ws_broadcast_fail", extra={"channel": channel, "conn_id": mc.id})
                dead.append(mc)
        if dead:
            async with self._lock:
                conns = self._connections.get(channel, [])
                conns[:] = [c for c in conns if c.id not in {d.id for d in dead}]
                if not conns:
                    self._connections.pop(channel, None)

    async def broadcast_all(self, data: dict[str, Any]):
        async with self._lock:
            all_conns = [mc for conns in self._connections.values() for mc in conns]
        dead: list[ManagedConnection] = []
        for mc in all_conns:
            try:
                await mc.ws.send_json(data)
            except Exception:
                logger.debug("ws_broadcast_all_fail", extra={"conn_id": mc.id})
                dead.append(mc)
        if dead:
            dead_ids = {d.id for d in dead}
            async with self._lock:
                for channel in list(self._connections.keys()):
                    conns = self._connections[channel]
                    conns[:] = [c for c in conns if c.id not in dead_ids]
                    if not conns:
                        del self._connections[channel]

    async def send_ping(self, mc: ManagedConnection):
        try:
            await mc.ws.send_json({"type": "ping"})
        except Exception:
            pass

    async def heartbeat_loop(self):
        while True:
            await asyncio.sleep(self.PING_INTERVAL)
            now = time.time()
            all_conns = self.get_all_connections()
            dead: list[ManagedConnection] = []
            for mc in all_conns:
                try:
                    if now - mc.last_pong > self.PING_INTERVAL + self.PONG_TIMEOUT:
                        logger.info("ws_heartbeat_timeout", extra={"conn_id": mc.id, "channel": mc.channel})
                        dead.append(mc)
                        continue
                    await mc.ws.send_json({"type": "ping"})
                except Exception:
                    dead.append(mc)
            if dead:
                dead_ids = {d.id for d in dead}
                async with self._lock:
                    for channel in list(self._connections.keys()):
                        conns = self._connections[channel]
                        conns[:] = [c for c in conns if c.id not in dead_ids]
                        if not conns:
                            del self._connections[channel]
                for d in dead:
                    try:
                        await d.ws.close(code=1001)
                    except Exception:
                        pass
                logger.info("ws_heartbeat_cleanup", extra={"removed": len(dead)})

    async def cleanup_zombies(self):
        async with self._lock:
            for channel in list(self._connections.keys()):
                conns = self._connections[channel]
                alive = []
                for mc in conns:
                    try:
                        if mc.ws.client_state.name != 'DISCONNECTED':
                            alive.append(mc)
                    except Exception:
                        logger.debug("ws_cleanup_fail", extra={"conn_id": mc.id})
                if alive:
                    self._connections[channel] = alive
                else:
                    del self._connections[channel]

    async def periodic_cleanup(self, interval: float = 60.0):
        while True:
            await asyncio.sleep(interval)
            try:
                await self.cleanup_zombies()
            except Exception:
                pass

manager = ConnectionManager()
