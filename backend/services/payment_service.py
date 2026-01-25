from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import Optional
import uuid
from backend.models import Payment, Donation, User
from backend.rate_provider import rate_provider
from backend.services.leaderboard_service import get_week_key
import logging

logger = logging.getLogger(__name__)


async def create_payment(
    session: AsyncSession,
    tg_id: int,
    stars_amount: int,
    invoice_id: Optional[str] = None,
    context_json: Optional[dict] = None
) -> Payment:
    """Create a new payment record"""
    payment = Payment(
        id=uuid.uuid4(),
        tg_id=tg_id,
        invoice_id=invoice_id,
        stars_amount=stars_amount,
        status="created",
        created_at=datetime.utcnow(),
        context_json=context_json or {}
    )
    session.add(payment)
    await session.commit()
    await session.refresh(payment)
    return payment


async def process_payment_success(
    session: AsyncSession,
    telegram_payment_charge_id: str,
    invoice_id: Optional[str] = None,
    raw_payload: Optional[dict] = None
) -> Optional[Payment]:
    """
    Process successful payment. Returns Payment if processed, None if already processed.
    Implements idempotency check.
    """
    # Check if payment already processed
    query = select(Payment).where(
        Payment.telegram_payment_charge_id == telegram_payment_charge_id
    )
    existing = (await session.execute(query)).scalar_one_or_none()
    
    if existing and existing.status == "paid":
        logger.info(f"Payment {telegram_payment_charge_id} already processed")
        return existing
    
    # Find payment by invoice_id if telegram_payment_charge_id not found
    if not existing and invoice_id:
        query = select(Payment).where(Payment.invoice_id == invoice_id)
        existing = (await session.execute(query)).scalar_one_or_none()
    
    # If still not found, try to find by status=created and approximate matching
    # This handles cases where charge_id format differs
    if not existing:
        # Try to find any created payment without charge_id
        query = select(Payment).where(
            (Payment.status == "created") & 
            (Payment.telegram_payment_charge_id.is_(None))
        ).order_by(Payment.created_at.desc()).limit(1)
        existing = (await session.execute(query)).scalar_one_or_none()
    
    if not existing:
        logger.warning(f"Payment not found for charge_id={telegram_payment_charge_id}, invoice_id={invoice_id}")
        return None
    
    # Get current rate
    rate = await rate_provider.get_rate()
    tons_amount = rate_provider.calculate_tons(existing.stars_amount, rate)
    
    # Update payment
    existing.status = "paid"
    existing.telegram_payment_charge_id = telegram_payment_charge_id
    existing.tons_amount = tons_amount
    existing.rate_used = rate
    existing.paid_at = datetime.utcnow()
    if raw_payload:
        existing.raw_payload = raw_payload
    
    # Add charts to user's balance (instead of directly to leaderboard)
    user_query = select(User).where(User.tg_id == existing.tg_id)
    user = (await session.execute(user_query)).scalar_one_or_none()
    if user:
        user.balance_charts = float(user.balance_charts or 0) + float(tons_amount)
        logger.info(f"Added {tons_amount} charts to user {existing.tg_id} balance. New balance: {user.balance_charts}")
    
    await session.commit()
    await session.refresh(existing)
    
    logger.info(f"Payment {telegram_payment_charge_id} processed: {existing.stars_amount} stars -> {tons_amount} charts (to balance)")
    
    return existing


async def activate_charts(
    session: AsyncSession,
    tg_id: int,
    amount: float
) -> dict:
    """
    Activate charts from user's balance to the leaderboard.
    Creates a Donation record which affects the leaderboard ranking.
    """
    # Get user
    user_query = select(User).where(User.tg_id == tg_id)
    user = (await session.execute(user_query)).scalar_one_or_none()
    
    if not user:
        return {"success": False, "error": "User not found"}
    
    current_balance = float(user.balance_charts or 0)
    
    if amount <= 0:
        return {"success": False, "error": "Amount must be positive"}
    
    if amount > current_balance:
        return {"success": False, "error": "Insufficient balance", "balance": current_balance}
    
    # Deduct from balance
    user.balance_charts = current_balance - amount
    
    # Create donation (this adds to leaderboard)
    week_key = get_week_key()
    donation = Donation(
        id=uuid.uuid4(),
        tg_id=tg_id,
        stars_amount=0,  # Activated from balance, not direct payment
        tons_amount=amount,
        created_at=datetime.utcnow(),
        week_key=week_key,
        payment_id=None  # No payment, activated from balance
    )
    session.add(donation)
    
    await session.commit()
    
    logger.info(f"User {tg_id} activated {amount} charts. Remaining balance: {user.balance_charts}")
    
    return {
        "success": True,
        "activated": amount,
        "new_balance": float(user.balance_charts),
        "week_key": week_key
    }

