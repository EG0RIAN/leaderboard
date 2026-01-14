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
    
    # Rate Provider
    rate_provider_url: Optional[str] = None
    rate_cache_ttl_minutes: int = 30
    default_tons_per_star: float = 1.0
    
    # Settings
    preset_1_stars: int = 100
    preset_2_stars: int = 50
    preset_3_stars: int = 25
    tons_rounding_method: str = "floor"  # floor, ceil, round
    leaderboard_limit: int = 50
    timezone: str = "Europe/Berlin"
    
    # Crypto Payments
    crypto_provider_token: str = ""  # Provider token for crypto payments (if using external provider)
    supported_crypto_currencies: list = ["TON", "BTC", "ETH", "USDT"]  # Supported crypto currencies
    
    # Security
    secret_key: str = "your_secret_key_here"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

