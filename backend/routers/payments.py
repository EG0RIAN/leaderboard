from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from backend.database import get_db
from backend.services import payment_service, user_service
from backend.telegram_auth import validate_telegram_init_data
from backend.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])


class CreateInvoiceRequest(BaseModel):
    stars_amount: int
    preset_id: Optional[int] = None
    payment_type: str = "stars"  # "stars" or "crypto"
    crypto_currency: Optional[str] = None  # "TON", "BTC", "ETH", "USDT", etc.


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


@router.post("/create-invoice")
async def create_invoice(
    request: CreateInvoiceRequest,
    x_init_data: str = Header(..., alias="X-Init-Data"),
    session: AsyncSession = Depends(get_db)
):
    """Create payment invoice for Telegram Stars"""
    user_data = validate_telegram_init_data(x_init_data)
    if not user_data or not user_data.get("tg_id"):
        raise HTTPException(status_code=401, detail="Invalid initData")
    
    tg_id = user_data["tg_id"]
    
    # Ensure user exists
    await user_service.get_or_create_user(
        session=session,
        tg_id=tg_id,
        username=user_data.get("username"),
        first_name=user_data.get("first_name"),
        last_name=user_data.get("last_name"),
        language_code=user_data.get("language_code"),
        is_premium=user_data.get("is_premium"),
        photo_url=user_data.get("photo_url")
    )
    
    # Validate stars amount
    stars_amount = request.stars_amount
    if stars_amount <= 0:
        raise HTTPException(status_code=400, detail="stars_amount must be positive")
    
    # Check preset if provided
    preset_amounts = {
        1: settings.preset_1_stars,
        2: settings.preset_2_stars,
        3: settings.preset_3_stars
    }
    if request.preset_id and request.preset_id in preset_amounts:
        stars_amount = preset_amounts[request.preset_id]
    
    # Create payment record
    payment = await payment_service.create_payment(
        session=session,
        tg_id=tg_id,
        stars_amount=stars_amount,
        context_json={
            "preset_id": request.preset_id,
            "screen": "donation"
        }
    )
    
    # Create invoice using Bot API
    from backend.bot import bot
    from aiogram.types import LabeledPrice
    
    try:
        # Determine payment type and currency
        payment_type = request.payment_type or "stars"
        currency = "XTR"  # Default: Telegram Stars
        provider_token = ""  # Not needed for Stars
        
        if payment_type == "crypto" and request.crypto_currency:
            # Crypto payment requires a payment provider
            # Telegram Bot API doesn't support native crypto payments without a provider
            # You need to use a payment provider like CryptoPay, NOWPayments, etc.
            
            if not settings.crypto_provider_token:
                raise HTTPException(
                    status_code=400,
                    detail="Crypto payments require a payment provider. Please configure CRYPTO_PROVIDER_TOKEN in settings."
                )
            
            currency = request.crypto_currency.upper()
            provider_token = settings.crypto_provider_token
            
            # Validate supported currencies
            if currency not in settings.supported_crypto_currencies:
                raise HTTPException(
                    status_code=400,
                    detail=f"Currency {currency} is not supported. Supported currencies: {', '.join(settings.supported_crypto_currencies)}"
                )
            
            # For crypto payments, we need to convert stars to crypto amount
            # Get current rate from rate provider (stars to tons)
            from backend.rate_provider import rate_provider
            try:
                rate = await rate_provider.get_rate()
                # Convert stars to tons first, then to crypto
                # This is simplified - in production you'd need crypto exchange rates
                # Note: Telegram crypto payments use the smallest unit (e.g., satoshi for BTC)
                # For TON: 1 TON = 1,000,000,000 nanoTON
                # For BTC: 1 BTC = 100,000,000 satoshi
                # For ETH: 1 ETH = 1,000,000,000,000,000,000 wei
                
                # Simplified: assume 1 star ≈ 0.01 TON (adjust based on real rates)
                # For TON, amount is in nanoTON (1e9)
                if currency == "TON":
                    # 1 star = 0.01 TON = 10,000,000 nanoTON (placeholder)
                    crypto_amount = int(stars_amount * 10_000_000)
                elif currency == "BTC":
                    # 1 star = 0.0001 BTC = 10,000 satoshi (placeholder)
                    crypto_amount = int(stars_amount * 10_000)
                elif currency == "ETH":
                    # 1 star = 0.001 ETH = 1,000,000,000,000,000 wei (placeholder)
                    crypto_amount = int(stars_amount * 1_000_000_000_000_000)
                elif currency == "USDT":
                    # USDT typically uses 6 decimals, 1 star = 0.1 USDT = 100,000 units
                    crypto_amount = int(stars_amount * 100_000)
                else:
                    # Default: use stars amount as-is (will need proper conversion)
                    crypto_amount = stars_amount
            except Exception as e:
                logger.warning(f"Error getting rate for crypto conversion: {e}, using placeholder")
                # Fallback: use placeholder conversion
                crypto_amount = stars_amount * 1_000_000  # Placeholder
            
            user_lang = user_data.get("language_code", "ru")
            if user_lang.startswith("ru"):
                title = f"Донат {stars_amount} ⭐"
            else:
                title = f"Donation {stars_amount} ⭐"
            prices = [LabeledPrice(label=currency, amount=crypto_amount)]
        else:
            # Stars payment (default)
            title = f"Донат {stars_amount} ⭐"
            prices = [LabeledPrice(label="Stars", amount=stars_amount)]
        
        # Get user language for description
        user_lang = user_data.get("language_code", "ru")
        description = "Пополнение баланса в лидерборде донатов" if user_lang.startswith("ru") else "Top up donation leaderboard balance"
        
        # Create invoice link
        # Note: create_invoice_link returns a string (URL), not an object
        invoice_url = await bot.create_invoice_link(
            title=title,
            description=description,
            payload=str(payment.id),
            provider_token=provider_token,
            currency=currency,
            prices=prices
        )
        
        # Extract invoice_id from URL if possible, or use payment.id
        # Invoice URL format: https://t.me/invoice/...
        invoice_id = None
        if invoice_url and 'invoice/' in invoice_url:
            try:
                # Extract invoice slug from URL
                invoice_id = invoice_url.split('invoice/')[-1].split('?')[0]
            except:
                invoice_id = str(payment.id)
        else:
            invoice_id = str(payment.id)
        
        # Save invoice_id
        payment.invoice_id = invoice_id
        await session.commit()
        
        logger.info(f"Invoice created: {invoice_url} for payment {payment.id}")
        
        return {
            "payment_id": str(payment.id),
            "stars_amount": stars_amount,
            "invoice_id": invoice_id,
            "status": payment.status,
            "invoice_url": invoice_url
        }
    except HTTPException:
        # Re-raise HTTPException so FastAPI can handle it properly
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error creating invoice: {error_msg}", exc_info=True)
        
        # Update payment status to failed
        try:
            payment.status = "failed"
            await session.commit()
        except:
            pass
        
        # Return payment info with detailed error
        return {
            "payment_id": str(payment.id),
            "stars_amount": stars_amount,
            "invoice_id": payment.invoice_id,
            "status": payment.status,
            "invoice_url": None,
            "error": error_msg,
            "detail": error_msg
        }

