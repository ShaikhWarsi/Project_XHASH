from __future__ import annotations

from core.events import Event, EventBus, EventType


class _Collector:
    def __init__(self):
        self.events = []

    def __call__(self, e):
        self.events.append(e)


def test_subscribe_and_publish():
    bus = EventBus()
    c = _Collector()
    bus.subscribe(EventType.MARKET_DATA, c)
    event = Event(EventType.MARKET_DATA, {"price": 100})
    bus.publish(event)
    assert len(c.events) == 1
    assert c.events[0].payload["price"] == 100


def test_unsubscribe():
    bus = EventBus()
    c = _Collector()
    bus.subscribe(EventType.ORDER, c)
    bus.unsubscribe(EventType.ORDER, c)
    bus.publish(Event(EventType.ORDER, {}))
    assert len(c.events) == 0


def test_no_cross_contamination():
    bus = EventBus()
    c = _Collector()
    bus.subscribe(EventType.ORDER, c)
    bus.publish(Event(EventType.MARKET_DATA, {}))
    assert len(c.events) == 0


def test_backpressure_drops_oldest():
    bus = EventBus()
    def _noop(e):
        pass
    sub_id = bus.subscribe(EventType.MARKET_DATA, _noop, max_queue=2)
    bus.publish(Event(EventType.MARKET_DATA, {"i": 1}))
    bus.publish(Event(EventType.MARKET_DATA, {"i": 2}))
    bus.publish(Event(EventType.MARKET_DATA, {"i": 3}))
    events = bus.drain(EventType.MARKET_DATA, sub_id)
    payloads = [e.payload["i"] for e in events]
    assert payloads == [2, 3]


def test_string_on_and_emit():
    bus = EventBus()
    c = _Collector()
    bus.on("test_event", c)
    bus.emit("test_event", {"msg": "hello"})
    assert len(c.events) == 1
    assert c.events[0]["msg"] == "hello"


def test_publish_all():
    bus = EventBus()
    c = _Collector()
    bus.subscribe(EventType.SIGNAL, c)
    events = [
        Event(EventType.SIGNAL, {"i": 1}),
        Event(EventType.SIGNAL, {"i": 2}),
    ]
    bus.publish_all(events)
    assert len(c.events) == 2


def test_unsubscribe_by_id():
    bus = EventBus()
    c = _Collector()
    sid = bus.subscribe(EventType.FILL, c)
    bus.unsubscribe_id(sid)
    bus.publish(Event(EventType.FILL, {}))
    assert len(c.events) == 0
