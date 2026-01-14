#!/usr/bin/env python3
"""
Run Telegram bot with polling (for development)
"""
import asyncio
import logging
from backend.bot import bot, dp
from backend.config import settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


async def main():
    """Start bot with polling"""
    logger.info("Starting bot with polling...")
    logger.info(f"Bot token: {settings.bot_token[:10]}..." if settings.bot_token else "Bot token not set!")
    
    if not settings.bot_token or settings.bot_token == "your_bot_token_here":
        logger.error("BOT_TOKEN not set in .env file!")
        logger.error("Please set BOT_TOKEN in .env file")
        return
    
    try:
        # Get bot info
        bot_info = await bot.get_me()
        logger.info(f"Bot started: @{bot_info.username} ({bot_info.first_name})")
        
        # Start polling
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"Error starting bot: {e}", exc_info=True)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")

