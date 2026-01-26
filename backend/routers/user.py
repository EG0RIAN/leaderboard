from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, field_validator
from typing import Optional, Union
from backend.database import get_db
from backend.models import User
from backend.services import user_service, leaderboard_service
from backend.telegram_auth import validate_telegram_init_data, extract_ref_code
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["user"])


class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None  # Custom display name (instead of Telegram username)
    custom_title: Optional[str] = None  # Short title for leaderboard
    custom_text: Optional[str] = None   # Description for profile modal
    custom_link: Optional[str] = None   # Clickable link


async def get_current_user_data(
    x_init_data: str = Header(..., alias="X-Init-Data")
) -> dict:
    """Extract and validate user data from Telegram initData"""
    user_data = validate_telegram_init_data(x_init_data)
    if not user_data or not user_data.get("tg_id"):
        raise HTTPException(status_code=401, detail="Invalid initData")
    return user_data


@router.get("/me")
async def get_me(
    x_init_data: str = Header(..., alias="X-Init-Data"),
    session: AsyncSession = Depends(get_db)
):
    """Get current user info and stats, create/update user if needed"""
    user_data = validate_telegram_init_data(x_init_data)
    if not user_data or not user_data.get("tg_id"):
        raise HTTPException(status_code=401, detail="Invalid initData")
    
    tg_id = user_data["tg_id"]
    
    # Get or create user
    user, is_new = await user_service.get_or_create_user(
        session=session,
        tg_id=tg_id,
        username=user_data.get("username"),
        first_name=user_data.get("first_name"),
        last_name=user_data.get("last_name"),
        language_code=user_data.get("language_code"),
        is_premium=user_data.get("is_premium"),
        photo_url=user_data.get("photo_url"),
        init_data=x_init_data
    )
    
    # Get user stats
    stats = await leaderboard_service.get_user_stats(session, tg_id)
    
    from backend.config import settings
    
    return {
        "tg_id": user.tg_id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "display_name": user.display_name,  # Custom display name set by user
        "photo_url": user.photo_url,
        "is_premium": user.is_premium,
        "language_code": user.language_code,
        "custom_title": user.custom_title,
        "custom_text": user.custom_text,
        "custom_link": user.custom_link,
        "balance_charts": float(user.balance_charts or 0),  # Internal balance
        "bot_username": settings.telegram_bot_username,
        **stats
    }


@router.get("/transactions")
async def get_transactions(
    limit: int = 50,
    offset: int = 0,
    x_init_data: str = Header(..., alias="X-Init-Data"),
    session: AsyncSession = Depends(get_db)
):
    """Get user transaction history"""
    user_data = validate_telegram_init_data(x_init_data)
    if not user_data or not user_data.get("tg_id"):
        raise HTTPException(status_code=401, detail="Invalid initData")
    
    tg_id = user_data["tg_id"]
    
    from sqlalchemy import select, desc
    from backend.models import Payment
    
    query = (
        select(Payment)
        .where(Payment.tg_id == tg_id)
        .order_by(desc(Payment.created_at))
        .limit(limit)
        .offset(offset)
    )
    
    result = await session.execute(query)
    payments = result.scalars().all()
    
    transactions = []
    for payment in payments:
        transactions.append({
            "id": str(payment.id),
            "stars_amount": payment.stars_amount,
            "tons_amount": float(payment.tons_amount) if payment.tons_amount else None,
            "status": payment.status,
            "created_at": payment.created_at.isoformat() if payment.created_at else None,
            "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
            "rate_used": float(payment.rate_used) if payment.rate_used else None
        })
    
    return transactions


@router.post("/me/profile")
async def update_profile(
    request: UpdateProfileRequest,
    x_init_data: str = Header(..., alias="X-Init-Data"),
    session: AsyncSession = Depends(get_db)
):
    """Update user's profile for leaderboard"""
    user_data = validate_telegram_init_data(x_init_data)
    if not user_data or not user_data.get("tg_id"):
        raise HTTPException(status_code=401, detail="Invalid initData")
    
    tg_id = user_data["tg_id"]
    
    # Validate display_name length
    display_name = request.display_name
    if display_name is not None:
        display_name = display_name.strip()[:50]  # Max 50 characters
        if len(display_name) == 0:
            display_name = None
    
    # Validate custom_title length (shown in leaderboard list)
    custom_title = request.custom_title
    if custom_title is not None:
        custom_title = custom_title.strip()[:50]  # Max 50 characters
        if len(custom_title) == 0:
            custom_title = None
    
    # Validate custom_text length (description in profile modal)
    custom_text = request.custom_text
    if custom_text is not None:
        custom_text = custom_text.strip()[:200]  # Max 200 characters
        if len(custom_text) == 0:
            custom_text = None
    
    # Validate custom_link
    custom_link = request.custom_link
    if custom_link is not None:
        custom_link = custom_link.strip()[:500]  # Max 500 characters
        if len(custom_link) == 0:
            custom_link = None
        elif custom_link and not custom_link.startswith(('http://', 'https://')):
            raise HTTPException(status_code=400, detail="Link must start with http:// or https://")
    
    # Update user's profile
    query = select(User).where(User.tg_id == tg_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only update fields that were provided (not None in request)
    if request.display_name is not None:
        user.display_name = display_name
    if request.custom_title is not None:
        user.custom_title = custom_title
    if request.custom_text is not None:
        user.custom_text = custom_text
    if request.custom_link is not None:
        user.custom_link = custom_link
    await session.commit()
    
    logger.info(f"User {tg_id} updated profile: display_name='{user.display_name}', title='{user.custom_title}'")
    
    return {
        "success": True,
        "display_name": user.display_name,
        "custom_title": user.custom_title,
        "custom_text": user.custom_text,
        "custom_link": user.custom_link
    }


# Keep old endpoint for backwards compatibility
@router.post("/me/custom-text")
async def update_custom_text(
    request: UpdateProfileRequest,
    x_init_data: str = Header(..., alias="X-Init-Data"),
    session: AsyncSession = Depends(get_db)
):
    """Update user's custom text (deprecated, use /me/profile instead)"""
    return await update_profile(request, x_init_data, session)


class ActivateChartsRequest(BaseModel):
    amount: float  # Amount of charts to activate

    @field_validator("amount", mode="before")
    @classmethod
    def normalize_amount(cls, v: Union[int, float, str]) -> float:
        if isinstance(v, (int, float)):
            return float(v)
        if isinstance(v, str):
            s = v.strip().replace(",", ".")
            if not s:
                raise ValueError("amount is required")
            try:
                return float(s)
            except ValueError:
                raise ValueError("amount must be a number")
        raise ValueError("amount must be a number")


class SaveWalletRequest(BaseModel):
    wallet_address: str


@router.post("/me/wallet")
async def save_wallet(
    request: SaveWalletRequest,
    x_init_data: str = Header(..., alias="X-Init-Data"),
    session: AsyncSession = Depends(get_db)
):
    """Save user's connected TON wallet address"""
    user_data = validate_telegram_init_data(x_init_data)
    if not user_data or not user_data.get("tg_id"):
        raise HTTPException(status_code=401, detail="Invalid initData")
    
    tg_id = user_data["tg_id"]
    
    # Validate wallet address (basic check)
    wallet = request.wallet_address.strip()
    if len(wallet) < 48 or len(wallet) > 100:
        raise HTTPException(status_code=400, detail="Invalid wallet address")
    
    # Update user's wallet
    query = select(User).where(User.tg_id == tg_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.ton_wallet_address = wallet
    await session.commit()
    
    logger.info(f"User {tg_id} saved wallet: {wallet[:10]}...")
    
    return {"success": True, "wallet_address": wallet}


@router.post("/me/activate-charts")
async def activate_charts_endpoint(
    request: ActivateChartsRequest,
    x_init_data: str = Header(..., alias="X-Init-Data"),
    session: AsyncSession = Depends(get_db)
):
    """Activate charts from balance to leaderboard"""
    from backend.services.payment_service import activate_charts

    try:
        user_data = validate_telegram_init_data(x_init_data)
        if not user_data or not user_data.get("tg_id"):
            raise HTTPException(status_code=401, detail="Invalid initData")

        tg_id = user_data["tg_id"]
        # Ensure user exists (e.g. if they opened activate before GET /me)
        await user_service.get_or_create_user(
            session=session,
            tg_id=tg_id,
            username=user_data.get("username"),
            first_name=user_data.get("first_name"),
            last_name=user_data.get("last_name"),
            language_code=user_data.get("language_code"),
            is_premium=user_data.get("is_premium"),
            photo_url=user_data.get("photo_url"),
            init_data=x_init_data,
        )
        result = await activate_charts(session, tg_id, request.amount)

        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error", "Activation failed"))

        logger.info(f"User {tg_id} activated {request.amount} charts")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("activate_charts_endpoint error: %s", e)
        raise HTTPException(status_code=500, detail="Activation failed")

