from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from backend.routers import leaderboard, user, payments, webhook, tasks
from backend.routers import ton
from backend.database import engine, Base, async_session_maker
from backend.services.ton_service import check_ton_transactions, expire_old_payments
from backend.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Background task for monitoring TON transactions
async def ton_monitor_task():
    """Background task to check for TON payments"""
    while True:
        try:
            if settings.ton_wallet_address and settings.ton_api_key:
                async with async_session_maker() as session:
                    # Expire old payments
                    await expire_old_payments(session)
                    # Check for new transactions
                    matched = await check_ton_transactions(session)
                    if matched > 0:
                        logger.info(f"Matched {matched} TON payments")
        except Exception as e:
            logger.error(f"Error in TON monitor: {e}")
        
        # Check every 30 seconds
        await asyncio.sleep(30)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialized")
    
    # Start TON monitor task
    ton_task = asyncio.create_task(ton_monitor_task())
    logger.info("TON monitor task started")
    
    yield
    
    # Shutdown
    ton_task.cancel()
    try:
        await ton_task
    except asyncio.CancelledError:
        pass
    logger.info("TON monitor task stopped")


app = FastAPI(title="Telegram Leaderboard API", version="1.0.0", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",  # In production, restrict to Telegram domains and Cloudflare URLs
        "https://*.trycloudflare.com",  # Cloudflare Tunnel URLs
        "https://*.cloudflare.com",  # Cloudflare domains
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(leaderboard.router)
app.include_router(user.router)
app.include_router(payments.router)
app.include_router(webhook.router)
app.include_router(ton.router)
app.include_router(tasks.router)


@app.get("/health")
async def health():
    return {"status": "ok"}

