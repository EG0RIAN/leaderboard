from aiogram import Bot, Dispatcher
from aiogram.types import (
    Update,
    Message,
    PreCheckoutQuery,
    InlineQuery,
    InlineQueryResultArticle,
    InputTextMessageContent,
)
from aiogram.filters import Command
from backend.config import settings
from backend.database import AsyncSessionLocal
from backend.services import payment_service, user_service, leaderboard_service
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

bot = Bot(token=settings.bot_token)
dp = Dispatcher()


@dp.message(Command("start"))
async def start_command_handler(message: Message):
    """Handle /start command - register user and send welcome message"""
    user = message.from_user
    
    async with AsyncSessionLocal() as session:
        try:
            # Register or update user
            db_user, is_new = await user_service.get_or_create_user(
                session=session,
                tg_id=user.id,
                username=user.username,
                first_name=user.first_name,
                last_name=user.last_name,
                language_code=user.language_code,
                is_premium=getattr(user, 'is_premium', None),
                photo_url=None  # Photo URL not available from message.from_user
            )
            
            # Check for referral code in command arguments
            referrer_id = None
            if message.text and len(message.text.split()) > 1:
                ref_code = message.text.split()[1]
                # Handle ref_<id> format
                if ref_code.startswith('ref_'):
                    try:
                        referrer_id = int(ref_code.replace('ref_', ''))
                        # Only set if user is new and referrer exists
                        if is_new and referrer_id != user.id:
                            ref_user, _ = await user_service.get_or_create_user(
                                session=session,
                                tg_id=referrer_id
                            )
                            if ref_user:
                                # Update the newly created user with referrer
                                await session.refresh(db_user)
                                db_user.referrer_id = referrer_id
                                await session.commit()
                                logger.info(f"User {user.id} attached to referrer {referrer_id}")
                    except (ValueError, AttributeError):
                        pass
            
            # Send welcome message
            welcome_text = f"👋 Привет, {user.first_name or user.username or 'друг'}!\n\n"
            
            if is_new:
                welcome_text += "✅ Добро пожаловать в Лидерборд донатов!\n\n"
            else:
                welcome_text += "🔄 С возвращением!\n\n"
            
            welcome_text += "📊 Здесь ты можешь:\n"
            welcome_text += "• Смотреть лидерборды по донатам\n"
            welcome_text += "• Пополнять свой баланс\n"
            welcome_text += "• Приглашать друзей и получать бонусы\n\n"
            welcome_text += f"🎮 Открой Mini App через кнопку меню, чтобы начать!"
            
            await message.answer(welcome_text)
            
            logger.info(f"User {user.id} {'registered' if is_new else 'updated'} via /start")
            
        except Exception as e:
            logger.error(f"Error handling /start command: {e}", exc_info=True)
            await message.answer("❌ Произошла ошибка. Попробуйте позже.")


@dp.pre_checkout_query()
async def pre_checkout_handler(pre_checkout_query: PreCheckoutQuery):
    """Handle pre-checkout query for Stars payments"""
    await bot.answer_pre_checkout_query(pre_checkout_query.id, ok=True)
    logger.info(f"Pre-checkout approved: {pre_checkout_query.id}")


@dp.message(lambda msg: msg.successful_payment is not None)
async def successful_payment_handler(message: Message):
    """Handle successful Stars payment"""
    payment = message.successful_payment
    
    async with AsyncSessionLocal() as session:
        try:
            # For Telegram Stars, use provider_payment_charge_id as unique identifier
            charge_id = getattr(payment, 'telegram_payment_charge_id', None) or getattr(payment, 'provider_payment_charge_id', None)
            invoice_id = getattr(payment, 'invoice_payload', None)
            
            await payment_service.process_payment_success(
                session=session,
                telegram_payment_charge_id=charge_id or f"stars_{payment.total_amount}_{message.message_id}",
                invoice_id=invoice_id,
                raw_payload={
                    "provider_payment_charge_id": getattr(payment, 'provider_payment_charge_id', None),
                    "currency": getattr(payment, 'currency', 'XTR'),
                    "total_amount": payment.total_amount,
                    "message_id": message.message_id,
                }
            )
            
            # Send confirmation message
            await message.answer(
                f"✅ Платеж успешно обработан!\n"
                f"💰 Начислено тонов: {payment.total_amount}\n\n"
                f"📊 Проверь свой рейтинг в Mini App!"
            )
            
            logger.info(f"Payment processed: {charge_id}")
        except Exception as e:
            logger.error(f"Error processing payment: {e}", exc_info=True)
            await message.answer("❌ Ошибка обработки платежа. Обратитесь в поддержку.")


@dp.inline_query()
async def inline_query_handler(inline_query: InlineQuery):
    """Inline: показать своё место в лидерборде и реферальную ссылку"""
    user = inline_query.from_user
    tg_id = user.id
    async with AsyncSessionLocal() as session:
        try:
            await user_service.get_or_create_user(
                session=session,
                tg_id=tg_id,
                username=user.username,
                first_name=user.first_name,
                last_name=user.last_name,
                language_code=user.language_code,
                is_premium=getattr(user, "is_premium", None),
                photo_url=None,
            )
            stats = await leaderboard_service.get_user_stats(session, tg_id)
        except Exception as e:
            logger.error(f"Inline query get_user_stats error: {e}", exc_info=True)
            await bot.answer_inline_query(
                inline_query.id,
                results=[],
                cache_time=60,
            )
            return
    rank = stats.get("rank_all_time") or 0
    tons = int(stats.get("tons_all_time") or 0)
    ref_link = stats.get("referral_link") or f"{settings.mini_app_url}?startapp=ref_{tg_id}"
    if rank > 0:
        text = (
            f"🏆 Моё место в лидерборде: #{rank}\n"
            f"📊 Чартсов: {tons}\n\n"
            f"Присоединяйся по моей ссылке:\n{ref_link}"
        )
        title = f"Место #{rank} • {tons} чартсов"
    else:
        text = (
            "🏆 Я участвую в лидерборде донатов!\n\n"
            f"Присоединяйся по моей ссылке:\n{ref_link}"
        )
        title = "Моё место и реферальная ссылка"
    result = InlineQueryResultArticle(
        id="1",
        title=title,
        description="Отправить в чат своё место и ссылку",
        input_message_content=InputTextMessageContent(message_text=text),
    )
    await bot.answer_inline_query(
        inline_query.id,
        results=[result],
        cache_time=300,
    )


async def process_telegram_update(update: dict):
    """Process Telegram update (for webhook)"""
    try:
        await dp.feed_update(bot, Update(**update))
    except Exception as e:
        logger.error(f"Error processing update: {e}", exc_info=True)

