import hmac
import hashlib
import json
import urllib.parse
from typing import Optional, Dict
from backend.config import settings
import logging

logger = logging.getLogger(__name__)


def validate_telegram_init_data(init_data: str) -> Optional[Dict]:
    """
    Validate Telegram Web App initData and extract user info.
    Returns dict with user data if valid, None otherwise.
    """
    try:
        # Parse init_data
        params = dict(urllib.parse.parse_qsl(init_data))
        
        if "hash" not in params:
            logger.warning("No hash in init_data")
            return None
        
        received_hash = params.pop("hash")
        
        # Create data check string
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))
        
        # Calculate secret key (bot token)
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=settings.bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        # Calculate hash
        calculated_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        # Verify hash
        if calculated_hash != received_hash:
            logger.warning("Invalid init_data hash")
            return None
        
        # Parse user data
        if "user" in params:
            user_data = json.loads(params["user"])
            return {
                "tg_id": user_data.get("id"),
                "username": user_data.get("username"),
                "first_name": user_data.get("first_name"),
                "last_name": user_data.get("last_name"),
                "language_code": user_data.get("language_code"),
                "is_premium": user_data.get("is_premium"),
                "photo_url": user_data.get("photo_url"),
            }
        
        return None
    except Exception as e:
        logger.error(f"Error validating init_data: {e}")
        return None


def extract_ref_code(init_data: str) -> Optional[int]:
    """Extract referrer ID from init_data start_param"""
    try:
        params = dict(urllib.parse.parse_qsl(init_data))
        start_param = params.get("start_param", "")
        
        if start_param.startswith("ref_"):
            ref_id_str = start_param.replace("ref_", "")
            return int(ref_id_str)
        
        return None
    except Exception as e:
        logger.debug(f"Error extracting ref_code: {e}")
        return None

