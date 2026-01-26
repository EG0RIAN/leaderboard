from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite+aiosqlite:///./leaderboard.db"
    
    # Telegram Bot
    bot_token: str = ""
    telegram_bot_username: str = ""
    
    # Telegram Mini App
    mini_app_url: str = "https://your-domain.com"
    
    # Charts conversion rates
    # 1 CHARTS = 10 STARS (fixed rate)
    stars_per_chart: float = 10.0
    
    # TON rate is fetched from Fragment.com (stars price in TON)
    fragment_api_url: str = "https://fragment.com/api/v1/stars"
    rate_cache_ttl_minutes: int = 5  # Cache TON/Stars rate for 5 minutes
    default_stars_per_ton: float = 500.0  # Fallback: ~500 stars per 1 TON
    
    # Settings
    preset_1_stars: int = 100
    preset_2_stars: int = 50
    preset_3_stars: int = 25
    leaderboard_limit: int = 10000  # Show all places (no practical limit)
    timezone: str = "Europe/Berlin"
    
    # TON Payments
    ton_wallet_address: str = ""  # Our receiving TON wallet address
    ton_api_key: str = ""  # API key for toncenter.com or similar
    ton_api_url: str = "https://toncenter.com/api/v2"  # TON API endpoint
    ton_testnet: bool = False  # Use testnet
    ton_payment_expiry_minutes: int = 30  # How long payment is valid
    
    # Security
    secret_key: str = "your_secret_key_here"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields in .env


settings = Settings()

