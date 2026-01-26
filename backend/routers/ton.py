"""TON Payment endpoints"""
from decimal import Decimal
from typing import Optional, Union, Annotated
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, PlainValidator
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.telegram_auth import validate_telegram_init_data
from backend.config import settings
from backend.rate_provider import rate_provider
from backend.services.ton_service import (
    create_ton_payment,
    get_user_ton_payments,
    get_payment_by_comment,
    get_ton_payment_link
)

router = APIRouter(prefix="/ton", tags=["ton"])


def _parse_amount_ton(v: Union[int, float, str, None]) -> float:
    if v is None:
        raise ValueError("amount_ton is required")
    if isinstance(v, bool):
        raise ValueError("amount_ton must be a number")
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        s = v.strip().replace(",", ".")
        if not s:
            raise ValueError("amount_ton is required")
        try:
            return float(s)
        except ValueError:
            raise ValueError("amount_ton must be a number")
    raise ValueError("amount_ton must be a number")


class CreateTonPaymentRequest(BaseModel):
    amount_ton: Annotated[float, PlainValidator(_parse_amount_ton)]


class TonPaymentResponse(BaseModel):
    id: str
    amount_ton: float
    charts_amount: Optional[float]
    payment_comment: str
    to_wallet: str
    payment_link: str
    status: str
    expires_at: str
    rate: float  # Charts per TON


class TonConfigResponse(BaseModel):
    wallet_address: str
    charts_per_ton: float
    stars_per_chart: float
    stars_per_ton: float
    min_amount: float
    payment_expiry_minutes: int


@router.get("/config")
async def get_ton_config():
    """Get TON payment configuration with current rates"""
    # Get current rates
    stars_per_ton = await rate_provider.get_stars_per_ton()
    charts_per_ton = await rate_provider.get_charts_per_ton()
    
    return {
        "wallet_address": settings.ton_wallet_address or None,
        "charts_per_ton": charts_per_ton,
        "stars_per_chart": rate_provider.stars_per_chart,
        "stars_per_ton": stars_per_ton,
        "min_amount": 0.1,
        "payment_expiry_minutes": settings.ton_payment_expiry_minutes,
        "enabled": bool(settings.ton_wallet_address)
    }


@router.post("/create-payment")
async def create_payment(
    request: CreateTonPaymentRequest,
    x_init_data: str = Header(..., alias="X-Init-Data"),
    session: AsyncSession = Depends(get_db)
):
    """Create a new TON payment request"""
    user_data = validate_telegram_init_data(x_init_data)
    if not user_data or not user_data.get("tg_id"):
        raise HTTPException(status_code=401, detail="Invalid initData")
    
    if not settings.ton_wallet_address:
        raise HTTPException(status_code=503, detail="TON payments not configured")
    
    tg_id = user_data["tg_id"]
    amount_ton = Decimal(str(request.amount_ton))
    
    if amount_ton < Decimal("0.1"):
        raise HTTPException(status_code=400, detail="Minimum amount is 0.1 TON")
    
    if amount_ton > Decimal("10000"):
        raise HTTPException(status_code=400, detail="Maximum amount is 10000 TON")
    
    payment = await create_ton_payment(session, tg_id, amount_ton)
    
    payment_link = get_ton_payment_link(
        settings.ton_wallet_address,
        amount_ton,
        payment.payment_comment
    )
    
    return TonPaymentResponse(
        id=str(payment.id),
        amount_ton=float(payment.amount_ton),
        charts_amount=float(payment.charts_amount) if payment.charts_amount else None,
        payment_comment=payment.payment_comment,
        to_wallet=payment.to_wallet,
        payment_link=payment_link,
        status=payment.status,
        expires_at=payment.expires_at.isoformat(),
        rate=float(payment.rate_used)
    )


@router.get("/payment/{comment}")
async def get_payment_status(
    comment: str,
    x_init_data: str = Header(..., alias="X-Init-Data"),
    session: AsyncSession = Depends(get_db)
):
    """Check payment status by comment"""
    user_data = validate_telegram_init_data(x_init_data)
    if not user_data or not user_data.get("tg_id"):
        raise HTTPException(status_code=401, detail="Invalid initData")
    
    payment = await get_payment_by_comment(session, comment)
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Verify ownership
    if payment.tg_id != user_data["tg_id"]:
        raise HTTPException(status_code=403, detail="Not your payment")
    
    payment_link = get_ton_payment_link(
        payment.to_wallet,
        payment.amount_ton,
        payment.payment_comment
    )
    
    return TonPaymentResponse(
        id=str(payment.id),
        amount_ton=float(payment.amount_ton),
        charts_amount=float(payment.charts_amount) if payment.charts_amount else None,
        payment_comment=payment.payment_comment,
        to_wallet=payment.to_wallet,
        payment_link=payment_link,
        status=payment.status,
        expires_at=payment.expires_at.isoformat(),
        rate=float(payment.rate_used)
    )


@router.get("/history")
async def get_payment_history(
    x_init_data: str = Header(..., alias="X-Init-Data"),
    session: AsyncSession = Depends(get_db)
):
    """Get user's TON payment history"""
    user_data = validate_telegram_init_data(x_init_data)
    if not user_data or not user_data.get("tg_id"):
        raise HTTPException(status_code=401, detail="Invalid initData")
    
    tg_id = user_data["tg_id"]
    payments = await get_user_ton_payments(session, tg_id)
    
    return [
        {
            "id": str(p.id),
            "amount_ton": float(p.amount_ton),
            "charts_amount": float(p.charts_amount) if p.charts_amount else None,
            "status": p.status,
            "created_at": p.created_at.isoformat(),
            "completed_at": p.completed_at.isoformat() if p.completed_at else None
        }
        for p in payments
    ]

