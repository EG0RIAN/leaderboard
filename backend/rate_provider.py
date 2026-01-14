import httpx
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from backend.config import settings
import logging

logger = logging.getLogger(__name__)


class RateProvider:
    """Provider for Stars to Tons exchange rate with caching and fallback"""
    
    def __init__(self):
        self._cached_rate: Optional[float] = None
        self._cache_expires_at: Optional[datetime] = None
        self._lock = asyncio.Lock()
    
    async def get_rate(self) -> float:
        """
        Get current rate (tons per star) with caching.
        Returns cached rate if valid, otherwise fetches new rate.
        Falls back to default if source unavailable.
        """
        async with self._lock:
            # Check cache
            if self._cached_rate is not None and self._cache_expires_at is not None:
                if datetime.utcnow() < self._cache_expires_at:
                    return self._cached_rate
            
            # Try to fetch new rate
            try:
                if settings.rate_provider_url:
                    rate = await self._fetch_rate()
                    if rate is not None:
                        self._cached_rate = rate
                        ttl_minutes = settings.rate_cache_ttl_minutes
                        self._cache_expires_at = datetime.utcnow() + timedelta(minutes=ttl_minutes)
                        logger.info(f"Fetched new rate: {rate} tons per star")
                        return rate
            except Exception as e:
                logger.warning(f"Failed to fetch rate from provider: {e}")
            
            # Fallback to cached rate if available
            if self._cached_rate is not None:
                logger.info(f"Using cached rate (expired): {self._cached_rate}")
                return self._cached_rate
            
            # Final fallback to default
            logger.critical(f"No rate available, using default: {settings.default_tons_per_star}")
            return settings.default_tons_per_star
    
    async def _fetch_rate(self) -> Optional[float]:
        """Fetch rate from external provider"""
        if not settings.rate_provider_url:
            return None
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(settings.rate_provider_url)
                response.raise_for_status()
                data = response.json()
                
                # Try common response formats
                if isinstance(data, dict):
                    # Try various possible keys
                    rate = data.get("rate") or data.get("tons_per_star") or data.get("value")
                    if rate is not None:
                        return float(rate)
                elif isinstance(data, (int, float)):
                    return float(data)
                
                logger.warning(f"Unexpected rate provider response format: {data}")
                return None
        except Exception as e:
            logger.error(f"Error fetching rate: {e}")
            return None
    
    def calculate_tons(self, stars_amount: int, rate: Optional[float] = None) -> int:
        """
        Calculate tons from stars amount using rounding method.
        If rate not provided, uses cached/default rate (sync method).
        """
        if rate is None:
            rate = self._cached_rate or settings.default_tons_per_star
        
        tons_float = stars_amount * rate
        
        if settings.tons_rounding_method == "floor":
            return int(tons_float)
        elif settings.tons_rounding_method == "ceil":
            import math
            return math.ceil(tons_float)
        elif settings.tons_rounding_method == "round":
            return round(tons_float)
        else:
            return int(tons_float)


# Global instance
rate_provider = RateProvider()

