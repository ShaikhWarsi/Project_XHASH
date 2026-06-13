from __future__ import annotations

import asyncio
import logging
import time
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class WhatsAppBotState(str, Enum):
    UNPAIRED = "unpaired"
    PAIRING = "pairing"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"


class WhatsAppBotService:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._state: dict[str, Any] = {
            "status": WhatsAppBotState.UNPAIRED,
            "pairing_code": None,
            "qr_code": None,
            "connected_jid": None,
            "started_at": None,
            "message_count": 0,
            "alert_count": 0,
        }
        self._linked_users: dict[str, dict] = {}
        self._config: dict[str, Any] = {
            "webhook_url": "",
            "auto_start": False,
            "notification_types": {
                "order_fill": True,
                "signal": True,
                "error": True,
                "drawdown": False,
                "risk": True,
            },
        }
        self._client = None
        self._thread = None

    async def _ensure_client(self):
        if self._client is not None:
            return self._client
        try:
            from wars import WhatsApp  # type: ignore
            self._client = WhatsApp()
            return self._client
        except ImportError:
            logger.warning("wars library not installed — using simulated client")
            return None

    async def start(self) -> dict:
        async with self._lock:
            if self._state["status"] == WhatsAppBotState.CONNECTED:
                return {"success": True, "message": "Bot already running"}
            client = await self._ensure_client()
            if client is None:
                self._state["status"] = WhatsAppBotState.CONNECTED
                self._state["started_at"] = time.time()
                self._state["connected_jid"] = "simulated@whatsapp.net"
                return {"success": True, "message": "Bot started (simulated mode)"}
            try:
                await client.start()
                self._state["status"] = WhatsAppBotState.CONNECTED
                self._state["started_at"] = time.time()
                self._state["connected_jid"] = getattr(client, "jid", None)
                return {"success": True, "message": "Bot started"}
            except Exception as e:
                self._state["status"] = WhatsAppBotState.ERROR
                return {"success": False, "message": str(e)}

    async def stop(self) -> dict:
        async with self._lock:
            self._state["status"] = WhatsAppBotState.DISCONNECTED
            self._state["connected_jid"] = None
            self._state["started_at"] = None
            if self._client is not None:
                try:
                    await self._client.stop()
                except Exception:
                    pass
            return {"success": True, "message": "Bot stopped"}

    async def get_pairing_code(self) -> str | None:
        return self._state.get("pairing_code")

    async def get_qr_code(self) -> str | None:
        return self._state.get("qr_code")

    async def pair(self, phone_number: str) -> dict:
        async with self._lock:
            client = await self._ensure_client()
            self._state["status"] = WhatsAppBotState.PAIRING
            self._state["pairing_code"] = None
            self._state["qr_code"] = None
            if client is None:
                code = f"SIM-{int(time.time())}"
                self._state["pairing_code"] = code
                self._state["status"] = WhatsAppBotState.CONNECTED
                self._state["connected_jid"] = f"{phone_number}@s.whatsapp.net"
                return {
                    "success": True,
                    "method": "pairing_code",
                    "pairing_code": code,
                    "message": "Pairing initiated (simulated)",
                }
            try:
                result = await client.pair(phone_number)
                if "pairing_code" in result:
                    self._state["pairing_code"] = result["pairing_code"]
                if "qr" in result:
                    self._state["qr_code"] = result["qr"]
                self._state["status"] = WhatsAppBotState.CONNECTED
                self._state["connected_jid"] = result.get("jid")
                return {"success": True, **result}
            except Exception as e:
                self._state["status"] = WhatsAppBotState.ERROR
                return {"success": False, "message": str(e)}

    async def unlink(self, jid: str | None = None) -> dict:
        async with self._lock:
            if jid:
                self._linked_users.pop(jid, None)
                return {"success": True, "message": f"Unlinked {jid}"}
            self._state["status"] = WhatsAppBotState.UNPAIRED
            self._state["connected_jid"] = None
            self._state["pairing_code"] = None
            self._state["qr_code"] = None
            return {"success": True, "message": "Device unlinked"}

    async def send_message(self, jid: str, text: str) -> dict:
        async with self._lock:
            self._state["message_count"] += 1
            client = await self._ensure_client()
            if client is None:
                return {"success": True, "message": "Message sent (simulated)", "jid": jid}
            try:
                await client.send_message(jid, text)
                return {"success": True, "message": "Message sent", "jid": jid}
            except Exception as e:
                return {"success": False, "message": str(e)}

    async def broadcast(self, text: str) -> dict:
        results = []
        async with self._lock:
            for jid in list(self._linked_users.keys()):
                result = await self.send_message(jid, text)
                results.append(result)
        return {
            "success": all(r["success"] for r in results),
            "results": results,
            "total": len(results),
        }

    async def send_alert(self, jid: str, title: str, message: str, level: str = "info") -> dict:
        formatted = f"*[{level.upper()}]* {title}\n\n{message}"
        async with self._lock:
            self._state["alert_count"] += 1
        return await self.send_message(jid, formatted)

    async def get_status(self) -> dict:
        async with self._lock:
            return dict(self._state)

    async def get_stats(self) -> dict:
        async with self._lock:
            return {
                "message_count": self._state.get("message_count", 0),
                "alert_count": self._state.get("alert_count", 0),
                "linked_users": len(self._linked_users),
                "uptime_seconds": int(time.time() - self._state["started_at"]) if self._state.get("started_at") else 0,
                "status": self._state["status"],
            }

    async def get_config(self) -> dict:
        async with self._lock:
            return dict(self._config)

    async def update_config(self, config: dict) -> dict:
        async with self._lock:
            self._config.update(config)
            return {"success": True, "message": "Config updated", "config": dict(self._config)}

    async def get_users(self) -> list[dict]:
        async with self._lock:
            return [{"jid": jid, **info} for jid, info in self._linked_users.items()]

    async def link_user(self, jid: str, username: str = "", phone: str = "") -> dict:
        async with self._lock:
            self._linked_users[jid] = {
                "username": username,
                "phone": phone,
                "linked_at": time.time(),
                "alerts_enabled": True,
            }
            return {"success": True, "message": f"User {jid} linked"}

    async def unlink_user(self, jid: str) -> dict:
        async with self._lock:
            self._linked_users.pop(jid, None)
            return {"success": True, "message": f"User {jid} unlinked"}
