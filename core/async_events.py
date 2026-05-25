from __future__ import annotations

import asyncio
import logging
from typing import Any, Callable

from .events import Event, EventType

logger = logging.getLogger(__name__)


class AsyncEventBus:
    def __init__(self):
        self._subscribers: dict[EventType, list[Callable]] = {}
        self._string_subscribers: dict[str, list[Callable]] = {}
        self._queue: asyncio.Queue = asyncio.Queue()
        self._running = False
        self._task: asyncio.Task | None = None
        self._handler_tasks: set[asyncio.Task] = set()

    def subscribe(self, event_type: EventType, callback: Callable):
        self._subscribers.setdefault(event_type, []).append(callback)

    def unsubscribe(self, event_type: EventType, callback: Callable):
        if event_type in self._subscribers:
            self._subscribers[event_type] = [cb for cb in self._subscribers[event_type] if cb is not callback]

    async def publish(self, event: Event):
        await self._queue.put(event)

    def on(self, topic: str, callback: Callable):
        self._string_subscribers.setdefault(topic, []).append(callback)

    async def emit(self, topic: str, payload: Any):
        for cb in self._string_subscribers.get(topic, []):
            if asyncio.iscoroutinefunction(cb):
                task = asyncio.create_task(cb(payload))
                self._handler_tasks.add(task)
                task.add_done_callback(self._handler_tasks.discard)
            else:
                cb(payload)

    def publish_sync(self, event: Event):
        for cb in self._subscribers.get(event.type, []):
            cb(event)

    async def start(self):
        self._running = True
        self._task = asyncio.create_task(self._process_loop())

    async def stop(self):
        self._running = False
        if self._handler_tasks:
            await asyncio.gather(*self._handler_tasks, return_exceptions=True)
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _process_loop(self):
        while self._running:
            try:
                event = await asyncio.wait_for(self._queue.get(), timeout=1.0)
                for cb in self._subscribers.get(event.type, []):
                    try:
                        if asyncio.iscoroutinefunction(cb):
                            task = asyncio.create_task(cb(event))
                            self._handler_tasks.add(task)
                            task.add_done_callback(self._handler_tasks.discard)
                        else:
                            cb(event)
                    except Exception as e:
                        logger.error(f"Event handler error: {e}")
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Event loop error: {e}")
