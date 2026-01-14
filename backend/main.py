from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import leaderboard, user, payments, webhook
from backend.database import engine, Base
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Telegram Leaderboard API", version="1.0.0")

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


@app.on_event("startup")
async def startup():
    """Initialize database on startup"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialized")


@app.get("/health")
async def health():
    return {"status": "ok"}

