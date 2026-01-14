from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import Optional
from backend.models import User
from backend.telegram_auth import extract_ref_code
import logging

logger = logging.getLogger(__name__)


async def get_or_create_user(
    session: AsyncSession,
    tg_id: int,
    username: Optional[str] = None,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    language_code: Optional[str] = None,
    is_premium: Optional[bool] = None,
    photo_url: Optional[str] = None,
    init_data: Optional[str] = None
) -> tuple[User, bool]:
    """
    Get or create user. Returns (user, is_new).
    If user is new and init_data contains ref_code, attach referrer.
    """
    result = await session.execute(select(User).where(User.tg_id == tg_id))
    user = result.scalar_one_or_none()
    
    is_new = False
    if user is None:
        # New user - check for referrer
        referrer_id = None
        if init_data:
            ref_code = extract_ref_code(init_data)
            if ref_code and ref_code != tg_id:
                # Verify referrer exists
                ref_result = await session.execute(select(User).where(User.tg_id == ref_code))
                if ref_result.scalar_one_or_none():
                    referrer_id = ref_code
                    logger.info(f"New user {tg_id} attached to referrer {ref_code}")
        
        user = User(
            tg_id=tg_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            language_code=language_code,
            is_premium=is_premium,
            photo_url=photo_url,
            referrer_id=referrer_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            last_seen_at=datetime.utcnow()
        )
        session.add(user)
        is_new = True
    else:
        # Update existing user data
        user.username = username or user.username
        user.first_name = first_name or user.first_name
        user.last_name = last_name or user.last_name
        user.language_code = language_code or user.language_code
        user.is_premium = is_premium if is_premium is not None else user.is_premium
        if photo_url:  # Update photo only if provided
            user.photo_url = photo_url
        user.updated_at = datetime.utcnow()
        user.last_seen_at = datetime.utcnow()
    
    await session.commit()
    await session.refresh(user)
    return user, is_new

