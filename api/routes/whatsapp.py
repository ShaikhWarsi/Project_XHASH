from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from api.services.whatsapp_bot_service import WhatsAppBotService
from api.services.whatsapp_alert_service import WhatsAppAlertService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/openalgo/whatsapp", tags=["openalgo_whatsapp"])

_bot_service = WhatsAppBotService()
_alert_service = WhatsAppAlertService()


@router.get("/config")
async def get_config():
    config = await _bot_service.get_config()
    return {"success": True, "config": config}


@router.post("/config")
async def update_config(request: Request):
    try:
        data = await request.json()
        result = await _bot_service.update_config(data)
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Update config failed: %s", e)
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.post("/pair")
async def pair(request: Request):
    try:
        data = await request.json()
        phone = data.get("phone", "")
        if not phone:
            raise HTTPException(status_code=400, detail={"status": "error", "message": "phone is required"})
        result = await _bot_service.pair(phone)
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Pair failed: %s", e)
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.get("/pair/status")
async def pair_status():
    status = await _bot_service.get_status()
    return {
        "success": True,
        "status": status.get("status"),
        "pairing_code": status.get("pairing_code"),
        "qr_code": status.get("qr_code"),
    }


@router.post("/unlink")
async def unlink():
    result = await _bot_service.unlink()
    return result


@router.post("/bot/start")
async def bot_start():
    result = await _bot_service.start()
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result)
    return result


@router.post("/bot/stop")
async def bot_stop():
    result = await _bot_service.stop()
    return result


@router.get("/bot/status")
async def bot_status():
    status = await _bot_service.get_status()
    return {"success": True, "status": status}


@router.get("/users")
async def list_users():
    users = await _bot_service.get_users()
    return {"success": True, "users": users}


@router.post("/users/{jid}/unlink")
async def unlink_user(jid: str):
    result = await _bot_service.unlink_user(jid)
    return result


@router.post("/send")
async def send_message(request: Request):
    try:
        data = await request.json()
        jid = data.get("jid", "")
        text = data.get("text", "")
        if not jid or not text:
            raise HTTPException(status_code=400, detail={"status": "error", "message": "jid and text are required"})
        result = await _bot_service.send_message(jid, text)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Send message failed: %s", e)
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.post("/broadcast")
async def broadcast(request: Request):
    try:
        data = await request.json()
        text = data.get("text", "")
        if not text:
            raise HTTPException(status_code=400, detail={"status": "error", "message": "text is required"})
        result = await _bot_service.broadcast(text)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Broadcast failed: %s", e)
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.post("/test-message")
async def test_message():
    status = await _bot_service.get_status()
    jid = status.get("connected_jid")
    if not jid:
        raise HTTPException(status_code=400, detail={"status": "error", "message": "No connected device"})
    result = await _bot_service.send_message(jid, "This is a test message from X_KA_HASH WhatsApp Bot.")
    return result


@router.get("/stats")
async def stats():
    stats_data = await _bot_service.get_stats()
    return {"success": True, "stats": stats_data}
