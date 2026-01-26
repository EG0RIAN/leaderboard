from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from backend.database import get_db
from backend.services import leaderboard_service
from backend.telegram_auth import validate_telegram_init_data
from backend.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


async def get_current_user_id(
    x_init_data: Optional[str] = Header(None, alias="X-Init-Data")
) -> int:
    """Extract and validate user from Telegram initData"""
    if not x_init_data:
        raise HTTPException(status_code=401, detail="Missing X-Init-Data header")
    
    user_data = validate_telegram_init_data(x_init_data)
    if not user_data or not user_data.get("tg_id"):
        raise HTTPException(status_code=401, detail="Invalid initData")
    
    return user_data["tg_id"]


@router.get("/collected")
async def get_total_collected(
    session: AsyncSession = Depends(get_db),
    _: int = Depends(get_current_user_id)
):
    """Get total collected funds (for status bar). Value in same unit as donations (charts)."""
    total = await leaderboard_service.get_total_collected(session)
    return {"total_charts": total}


@router.get("/all-time")
async def get_all_time_leaderboard(
    limit: int = settings.leaderboard_limit,
    offset: int = 0,
    session: AsyncSession = Depends(get_db),
    _: int = Depends(get_current_user_id)
):
    """Get all-time leaderboard"""
    return await leaderboard_service.get_all_time_leaderboard(session, limit, offset)


@router.get("/week")
async def get_week_leaderboard(
    week_key: Optional[str] = None,
    limit: int = settings.leaderboard_limit,
    offset: int = 0,
    session: AsyncSession = Depends(get_db),
    _: int = Depends(get_current_user_id)
):
    """Get weekly leaderboard"""
    return await leaderboard_service.get_week_leaderboard(session, week_key, limit, offset)


@router.get("/referrals")
async def get_referrals_leaderboard(
    limit: int = settings.leaderboard_limit,
    offset: int = 0,
    session: AsyncSession = Depends(get_db),
    _: int = Depends(get_current_user_id)
):
    """Get referrals leaderboard"""
    return await leaderboard_service.get_referrals_leaderboard(session, limit, offset)

