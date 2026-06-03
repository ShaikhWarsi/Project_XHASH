from __future__ import annotations
import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from api.services.chat_service import chat_service
from api.websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/chat")
async def ws_chat(websocket: WebSocket):
    await manager.connect("chat", websocket)
    try:
        _ws_max_iter = 1000000
        for _ in range(_ws_max_iter):
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=120)
            except asyncio.TimeoutError:
                continue

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")
            channel = data.get("channel", "team")
            sender = data.get("sender", "anonymous")
            text = data.get("text", "")

            if msg_type == "message" and text:
                enriched = chat_service.add_message({
                    "type": "message",
                    "channel": channel,
                    "sender": sender,
                    "text": text,
                })

                broadcast_data = {
                    "type": "message",
                    "channel": channel,
                    "sender": sender,
                    "text": text,
                    "timestamp": enriched["timestamp"],
                }

                await manager.broadcast("chat", broadcast_data)

                if channel == "ai":
                    ai_response = await chat_service.handle_ai_query(text, sender)
                    ai_enriched = chat_service.add_message({
                        "type": "message",
                        "channel": "ai",
                        "sender": "AI",
                        "text": ai_response,
                    })
                    ai_broadcast = {
                        "type": "message",
                        "channel": "ai",
                        "sender": "AI",
                        "text": ai_response,
                        "timestamp": ai_enriched["timestamp"],
                    }
                    await manager.broadcast("chat", ai_broadcast)

            elif msg_type == "typing":
                typing_broadcast = {
                    "type": "typing",
                    "channel": channel,
                    "sender": sender,
                }
                await manager.broadcast("chat", typing_broadcast)

        logger.warning("ws_chat hit max iterations")
    except WebSocketDisconnect:
        await manager.disconnect("chat", websocket)
    except Exception as e:
        logger.warning("ws_chat error: %s", e)
        await manager.disconnect("chat", websocket)
