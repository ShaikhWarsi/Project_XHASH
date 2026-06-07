from __future__ import annotations

from core.async_events import AsyncEventBus
from core.events import Event, EventType


def test_event_bus_subscribe_and_publish():
    bus = AsyncEventBus()
    received = []

    async def callback(event: Event):
        received.append(event)

    bus.subscribe(EventType.SIGNAL, callback)

    event = Event(type=EventType.SIGNAL, payload={"test": True})
    bus._queue.put_nowait(event)

    assert len(received) == 1
    assert received[0].payload["test"] is True


def test_event_type_enum():
    assert EventType.MARKET_DATA.value == "market_data"
    assert EventType.SIGNAL.value == "signal"
    assert EventType.ERROR.value == "error"
