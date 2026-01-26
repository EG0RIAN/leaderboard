import httpx
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from decimal import Decimal
from backend.config import settings
import logging

logger = logging.getLogger(__name__)


class RateProvider:
    """
    Provider for exchange rates with caching.
    
    Conversion model:
    - 1 CHARTS = 10 STARS (fixed)
    - Stars/TON rate fetched from Fragment.com
    
    So:
    - charts_from_stars(stars) = stars / 10
    - charts_from_ton(ton) = ton * stars_per_ton / 10
    """
    
    def __init__(self):
        self._cached_stars_per_ton: Optional[float] = None
        self._cache_expires_at: Optional[datetime] = None
        self._lock = asyncio.Lock()
    
    @property
    def stars_per_chart(self) -> float:
        """Fixed rate: 1 CHARTS = 10 STARS"""
        return settings.stars_per_chart
    
    async def get_stars_per_ton(self) -> float:
        """
        Get current rate (stars per 1 TON) with caching.
        Fetches from Fragment.com, falls back to default if unavailable.
        """
        async with self._lock:
            # Check cache
            if self._cached_stars_per_ton is not None and self._cache_expires_at is not None:
                if datetime.utcnow() < self._cache_expires_at:
                    return self._cached_stars_per_ton
            
            # Try to fetch new rate from Fragment
            try:
                rate = await self._fetch_fragment_rate()
                if rate is not None:
                    self._cached_stars_per_ton = rate
                    ttl_minutes = settings.rate_cache_ttl_minutes
                    self._cache_expires_at = datetime.utcnow() + timedelta(minutes=ttl_minutes)
                    logger.info(f"Fetched new rate from Fragment: {rate} stars per TON")
                    return rate
            except Exception as e:
                logger.warning(f"Failed to fetch rate from Fragment: {e}")
            
            # Fallback to cached rate if available
            if self._cached_stars_per_ton is not None:
                logger.info(f"Using cached rate (expired): {self._cached_stars_per_ton}")
                return self._cached_stars_per_ton
            
            # Final fallback to default
            logger.warning(f"No rate available, using default: {settings.default_stars_per_ton}")
            return settings.default_stars_per_ton
    
    async def _fetch_fragment_rate(self) -> Optional[float]:
        """
        Fetch Stars/TON rate from Fragment.com
        Fragment sells Stars for TON, so we can get the current price.
        """
        try:
            # Fragment API endpoint for Stars price
            # This is a simplified example - actual Fragment API may differ
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Try to get the price from Fragment
                # Note: Fragment may not have a public API, so we use a fallback approach
                response = await client.get(
                    "https://fragment.com/api/v1/stars/price",
                    headers={"Accept": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    # Expected format: {"price_per_star": 0.002} (in TON)
                    # or {"stars_per_ton": 500}
                    if "stars_per_ton" in data:
                        return float(data["stars_per_ton"])
                    elif "price_per_star" in data:
                        # Convert price per star to stars per TON
                        price = float(data["price_per_star"])
                        if price > 0:
                            return 1.0 / price
                    elif "rate" in data:
                        return float(data["rate"])
                
                # If Fragment API doesn't work, try alternative sources
                logger.warning(f"Fragment API returned {response.status_code}, using fallback")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching rate from Fragment: {e}")
            return None
    
    def stars_to_charts(self, stars_amount: int) -> Decimal:
        """
        Convert Stars to Charts.
        1 CHARTS = 10 STARS, so charts = stars / 10
        """
        return Decimal(str(stars_amount)) / Decimal(str(self.stars_per_chart))
    
    async def ton_to_charts(self, ton_amount: float) -> Decimal:
        """
        Convert TON to Charts.
        First convert TON to Stars, then Stars to Charts.
        charts = ton * stars_per_ton / stars_per_chart
        """
        stars_per_ton = await self.get_stars_per_ton()
        stars = Decimal(str(ton_amount)) * Decimal(str(stars_per_ton))
        return stars / Decimal(str(self.stars_per_chart))
    
    def ton_to_charts_sync(self, ton_amount: float, stars_per_ton: Optional[float] = None) -> Decimal:
        """
        Synchronous version of ton_to_charts.
        Uses provided or cached stars_per_ton rate.
        """
        if stars_per_ton is None:
            stars_per_ton = self._cached_stars_per_ton or settings.default_stars_per_ton
        stars = Decimal(str(ton_amount)) * Decimal(str(stars_per_ton))
        return stars / Decimal(str(self.stars_per_chart))
    
    async def get_charts_per_ton(self) -> float:
        """Calculate how many charts per 1 TON at current rate"""
        stars_per_ton = await self.get_stars_per_ton()
        return stars_per_ton / self.stars_per_chart
    
    def get_charts_per_ton_sync(self) -> float:
        """Synchronous version using cached rate"""
        stars_per_ton = self._cached_stars_per_ton or settings.default_stars_per_ton
        return stars_per_ton / self.stars_per_chart


# Global instance
rate_provider = RateProvider()
