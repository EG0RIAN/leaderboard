"""TON Payment Service - handles TON blockchain payments"""
import uuid
import httpx
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from backend.models import TonPayment, User
from backend.config import settings

logger = logging.getLogger(__name__)


def generate_payment_comment() -> str:
    """Generate unique payment comment for identifying transactions"""
    return f"charts_{uuid.uuid4().hex[:12]}"


async def create_ton_payment(
    session: AsyncSession,
    tg_id: int,
    amount_ton: Decimal
) -> TonPayment:
    """Create a new TON payment request"""
    
    if not settings.ton_wallet_address:
        raise ValueError("TON wallet address not configured")
    
    payment = TonPayment(
        id=uuid.uuid4(),
        tg_id=tg_id,
        amount_ton=amount_ton,
        payment_comment=generate_payment_comment(),
        to_wallet=settings.ton_wallet_address,
        status="pending",
        rate_used=Decimal(str(settings.charts_per_ton)),
        created_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(minutes=settings.ton_payment_expiry_minutes)
    )
    
    session.add(payment)
    await session.commit()
    await session.refresh(payment)
    
    logger.info(f"Created TON payment {payment.id} for user {tg_id}: {amount_ton} TON")
    
    return payment


async def get_pending_payments(session: AsyncSession) -> List[TonPayment]:
    """Get all pending TON payments that haven't expired"""
    now = datetime.utcnow()
    
    query = select(TonPayment).where(
        and_(
            TonPayment.status == "pending",
            TonPayment.expires_at > now
        )
    )
    
    result = await session.execute(query)
    return result.scalars().all()


async def expire_old_payments(session: AsyncSession) -> int:
    """Mark expired payments as expired"""
    now = datetime.utcnow()
    
    query = select(TonPayment).where(
        and_(
            TonPayment.status == "pending",
            TonPayment.expires_at <= now
        )
    )
    
    result = await session.execute(query)
    payments = result.scalars().all()
    
    count = 0
    for payment in payments:
        payment.status = "expired"
        count += 1
    
    if count > 0:
        await session.commit()
        logger.info(f"Expired {count} TON payments")
    
    return count


async def check_ton_transactions(session: AsyncSession) -> int:
    """Check TON blockchain for incoming transactions and match with pending payments"""
    
    if not settings.ton_wallet_address or not settings.ton_api_key:
        logger.warning("TON API not configured, skipping transaction check")
        return 0
    
    pending_payments = await get_pending_payments(session)
    if not pending_payments:
        return 0
    
    # Create lookup by comment
    payments_by_comment = {p.payment_comment: p for p in pending_payments}
    
    try:
        # Fetch recent transactions from TON API
        transactions = await fetch_wallet_transactions(settings.ton_wallet_address)
        
        matched = 0
        for tx in transactions:
            comment = tx.get("comment", "")
            if comment in payments_by_comment:
                payment = payments_by_comment[comment]
                
                # Verify amount
                tx_amount = Decimal(str(tx.get("amount", 0))) / Decimal("1000000000")  # Convert from nanoton
                
                if tx_amount >= payment.amount_ton:
                    # Mark as completed
                    payment.status = "completed"
                    payment.tx_hash = tx.get("hash")
                    payment.tx_lt = tx.get("lt")
                    payment.from_wallet = tx.get("source")
                    payment.completed_at = datetime.utcnow()
                    payment.charts_amount = payment.amount_ton * payment.rate_used
                    
                    # Credit user's balance
                    user_query = select(User).where(User.tg_id == payment.tg_id)
                    user_result = await session.execute(user_query)
                    user = user_result.scalar_one_or_none()
                    
                    if user:
                        user.balance_charts += payment.charts_amount
                        logger.info(f"Credited {payment.charts_amount} charts to user {user.tg_id}")
                    
                    matched += 1
                    logger.info(f"Matched TON payment {payment.id}: {tx_amount} TON -> {payment.charts_amount} charts")
        
        if matched > 0:
            await session.commit()
        
        return matched
        
    except Exception as e:
        logger.error(f"Error checking TON transactions: {e}")
        return 0


async def fetch_wallet_transactions(wallet_address: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Fetch recent transactions for a wallet from TON API"""
    
    api_url = settings.ton_api_url
    if settings.ton_testnet:
        api_url = "https://testnet.toncenter.com/api/v2"
    
    url = f"{api_url}/getTransactions"
    params = {
        "address": wallet_address,
        "limit": limit,
        "api_key": settings.ton_api_key
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
    
    if not data.get("ok"):
        raise Exception(f"TON API error: {data.get('error', 'Unknown error')}")
    
    transactions = []
    for tx in data.get("result", []):
        # Only process incoming transactions
        in_msg = tx.get("in_msg", {})
        if in_msg and in_msg.get("value"):
            # Decode comment from message
            msg_data = in_msg.get("msg_data", {})
            comment = ""
            
            if msg_data.get("@type") == "msg.dataText":
                import base64
                try:
                    comment = base64.b64decode(msg_data.get("text", "")).decode("utf-8")
                except:
                    comment = msg_data.get("text", "")
            
            transactions.append({
                "hash": tx.get("transaction_id", {}).get("hash"),
                "lt": tx.get("transaction_id", {}).get("lt"),
                "amount": int(in_msg.get("value", 0)),
                "source": in_msg.get("source"),
                "comment": comment,
                "timestamp": tx.get("utime")
            })
    
    return transactions


async def get_user_ton_payments(session: AsyncSession, tg_id: int, limit: int = 10) -> List[TonPayment]:
    """Get user's TON payment history"""
    query = (
        select(TonPayment)
        .where(TonPayment.tg_id == tg_id)
        .order_by(TonPayment.created_at.desc())
        .limit(limit)
    )
    
    result = await session.execute(query)
    return result.scalars().all()


async def get_payment_by_comment(session: AsyncSession, comment: str) -> Optional[TonPayment]:
    """Get payment by its unique comment"""
    query = select(TonPayment).where(TonPayment.payment_comment == comment)
    result = await session.execute(query)
    return result.scalar_one_or_none()


def get_ton_payment_link(address: str, amount_ton: Decimal, comment: str) -> str:
    """Generate TON payment deep link"""
    # Convert to nanoton
    amount_nano = int(amount_ton * Decimal("1000000000"))
    
    # URL encode the comment
    import urllib.parse
    encoded_comment = urllib.parse.quote(comment)
    
    # Create ton:// link
    return f"ton://transfer/{address}?amount={amount_nano}&text={encoded_comment}"

