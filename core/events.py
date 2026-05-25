from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable


class EventType(Enum):
    MARKET_DATA = "market_data"
    SIGNAL = "signal"
    DECISION = "decision"
    ORDER = "order"
    FILL = "fill"
    RISK = "risk"
    ERROR = "error"


@dataclass
class Event:
    type: EventType
    payload: Any
    timestamp: datetime = field(default_factory=datetime.utcnow)
    source: str = ""


class MarketEvent(Event):
    def __init__(self, symbol: str, bar: Any, source: str = ""):
        super().__init__(EventType.MARKET_DATA, {"symbol": symbol, "bar": bar}, source=source)


class SignalEvent(Event):
    def __init__(self, signals: list, source: str = ""):
        super().__init__(EventType.SIGNAL, {"signals": signals}, source=source)


class DecisionEvent(Event):
    def __init__(self, ticker: str, decision: dict, source: str = ""):
        super().__init__(EventType.DECISION, {"ticker": ticker, "decision": decision}, source=source)


class OrderEvent(Event):
    def __init__(self, order: Any, source: str = ""):
        super().__init__(EventType.ORDER, {"order": order}, source=source)


class FillEvent(Event):
    def __init__(self, fill: Any, source: str = ""):
        super().__init__(EventType.FILL, {"fill": fill}, source=source)


class RiskEvent(Event):
    def __init__(self, alert: str, details: dict, source: str = ""):
        super().__init__(EventType.RISK, {"alert": alert, "details": details}, source=source)


_SubscriberEntry = tuple[str, Callable, int]


class EventBus:
    """Pub/sub event bus with typed channels and backpressure.

    Each subscriber can specify a max queue size. When the queue is full,
    the oldest event is dropped (backpressure).
    """

    def __init__(self):
        self._subscribers: dict[EventType, list[_SubscriberEntry]] = {}
        self._string_subscribers: dict[str, list[_SubscriberEntry]] = {}
        self._queues: dict[int, deque] = {}
        self._next_id: int = 0

    def subscribe(
        self,
        event_type: EventType,
        callback: Callable,
        max_queue: int = 0,
    ) -> int:
        self._next_id += 1
        entry = (self._next_id, callback, max_queue)
        self._subscribers.setdefault(event_type, []).append(entry)
        if max_queue > 0:
            self._queues[self._next_id] = deque(maxlen=max_queue)
        return self._next_id

    def unsubscribe(self, event_type: EventType, callback: Callable):
        if event_type in self._subscribers:
            self._subscribers[event_type] = [
                entry for entry in self._subscribers[event_type] if entry[1] is not callback
            ]

    def unsubscribe_id(self, sub_id: int):
        for event_type in list(self._subscribers.keys()):
            self._subscribers[event_type] = [
                entry for entry in self._subscribers[event_type] if entry[0] != sub_id
            ]
        self._queues.pop(sub_id, None)

    def publish(self, event: Event):
        for sub_id, cb, max_queue in self._subscribers.get(event.type, []):
            if max_queue > 0:
                q = self._queues.get(sub_id)
                if q is not None:
                    if len(q) >= max_queue:
                        q.popleft()
                    q.append(event)
                    continue
            cb(event)

    def publish_all(self, events: list[Event]):
        for event in events:
            self.publish(event)

    def drain(self, event_type: EventType, sub_id: int) -> list[Event]:
        q = self._queues.get(sub_id)
        if q is None:
            return []
        events = list(q)
        q.clear()
        return events

    def on(self, event_type: str, callback: Callable, max_queue: int = 0) -> int:
        self._next_id += 1
        entry = (self._next_id, callback, max_queue)
        self._string_subscribers.setdefault(event_type, []).append(entry)
        if max_queue > 0:
            self._queues[self._next_id] = deque(maxlen=max_queue)
        return self._next_id

    def emit(self, event_type: str, payload: Any):
        for sub_id, cb, max_queue in self._string_subscribers.get(event_type, []):
            if max_queue > 0:
                q = self._queues.get(sub_id)
                if q is not None:
                    if len(q) >= max_queue:
                        q.popleft()
                    q.append(payload)
                    continue
            cb(payload)
