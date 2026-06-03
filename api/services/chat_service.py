from __future__ import annotations
import time
from typing import Any

_MAX_HISTORY = 500


class ChatService:
    def __init__(self):
        self._messages: list[dict[str, Any]] = []
        self._offset = 0

    def add_message(self, msg: dict[str, Any]) -> dict[str, Any]:
        enriched = {
            **msg,
            "id": f"msg_{int(time.time() * 1000)}_{len(self._messages)}",
            "timestamp": int(time.time()),
        }
        self._messages.append(enriched)
        if len(self._messages) > _MAX_HISTORY:
            excess = len(self._messages) - _MAX_HISTORY
            self._messages = self._messages[excess:]
            self._offset += excess
        return enriched

    def get_history(self, channel: str, limit: int = 50) -> list[dict[str, Any]]:
        filtered = [m for m in self._messages if m.get("channel") == channel]
        return filtered[-limit:]

    async def handle_ai_query(self, text: str, sender: str) -> str:
        try:
            from api.services.agent_service import query_agent
            response = await query_agent(text, context="chat")
            return response
        except ImportError:
            return f"AI agent not available. You said: {text}"
        except Exception as e:
            return f"AI error: {e!s}"


chat_service = ChatService()
