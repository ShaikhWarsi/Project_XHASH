from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


@dataclass
class Event:
    type: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class OrderPlacedEvent(Event):
    type: str = "order_placed"
    user_id: str = ""
    symbol: str = ""
    action: str = ""
    quantity: int = 0
    order_id: str = ""
    request_data: dict = field(default_factory=dict)
    response_data: dict = field(default_factory=dict)


@dataclass
class OrderFailedEvent(Event):
    type: str = "order_failed"
    user_id: str = ""
    error: str = ""
    request_data: dict = field(default_factory=dict)


@dataclass
class OrderApprovedEvent(Event):
    type: str = "order_approved"
    pending_order_id: int = 0
    user_id: str = ""
    approved_by: str = ""


@dataclass
class OrderRejectedEvent(Event):
    type: str = "order_rejected"
    pending_order_id: int = 0
    user_id: str = ""
    rejected_by: str = ""
    reason: str = ""


@dataclass
class SandboxOrderEvent(Event):
    type: str = "sandbox_order"
    user_id: str = ""
    symbol: str = ""
    action: str = ""
    quantity: int = 0
    order_id: str = ""


@dataclass
class HealthAlertEvent(Event):
    type: str = "health_alert"
    alert_type: str = ""
    severity: str = ""
    message: str = ""


Handler = Callable[[Event], None]


class EventBus:
    def __init__(self):
        self._subscribers: Dict[str, List[Handler]] = {}

    def subscribe(self, event_type: str, handler: Handler):
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)
        logger.debug(f"Handler subscribed to '{event_type}'")

    def unsubscribe(self, event_type: str, handler: Handler):
        if event_type in self._subscribers:
            self._subscribers[event_type] = [h for h in self._subscribers[event_type] if h != handler]

    def publish(self, event: Event):
        handlers = self._subscribers.get(event.type, [])
        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                logger.error(f"Event handler error for '{event.type}': {e}")

    def clear(self):
        self._subscribers.clear()


event_bus = EventBus()
