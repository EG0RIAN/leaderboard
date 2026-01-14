from fastapi import APIRouter, Request, Depends
from backend.bot import process_telegram_update
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook", tags=["webhook"])


@router.post("/telegram")
async def telegram_webhook(request: Request):
    """Handle Telegram webhook updates"""
    try:
        update_data = await request.json()
        await process_telegram_update(update_data)
        return {"ok": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}", exc_info=True)
        return {"ok": False, "error": str(e)}

