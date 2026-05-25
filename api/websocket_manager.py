from __future__ import annotations
import asyncio
import json
import logging
import time
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, channel: str, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self._connections.setdefault(channel, []).append(ws)

    async def disconnect(self, channel: str, ws: WebSocket):
        async with self._lock:
            conns = self._connections.get(channel, [])
            if ws in conns:
                conns.remove(ws)
            if channel in self._connections and not self._connections[channel]:
                del self._connections[channel]

    def _collect_dead(self, conns: list[WebSocket]) -> list[WebSocket]:
        dead = []
        for ws in conns:
            try:
                if ws.client_state.name == 'DISCONNECTED':
                    dead.append(ws)
            except Exception:
                dead.append(ws)
        return dead

    async def broadcast(self, channel: str, data: dict[str, Any]):
        async with self._lock:
            conns = self._connections.get(channel, [])[:]
        dead = []
        for ws in conns:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    conns = self._connections.get(channel, [])
                    if ws in conns:
                        conns.remove(ws)
                if channel in self._connections and not self._connections[channel]:
                    del self._connections[channel]

    async def broadcast_all(self, data: dict[str, Any]):
        async with self._lock:
            all_conns = [ws for conns in self._connections.values() for ws in conns]
        dead = []
        for ws in all_conns:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for channel in list(self._connections.keys()):
                    for ws in dead:
                        conns = self._connections.get(channel, [])
                        if ws in conns:
                            conns.remove(ws)
                    if channel in self._connections and not self._connections[channel]:
                        del self._connections[channel]

    async def cleanup_zombies(self):
        async with self._lock:
            for channel in list(self._connections.keys()):
                conns = self._connections[channel]
                alive = []
                for ws in conns:
                    try:
                        if ws.client_state.name != 'DISCONNECTED':
                            alive.append(ws)
                    except Exception:
                        pass
                if alive:
                    self._connections[channel] = alive
                else:
                    del self._connections[channel]

manager = ConnectionManager()
