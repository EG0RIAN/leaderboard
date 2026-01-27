#!/usr/bin/env python3
"""
Script to delete half of users from database for testing collected funds status bar
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, func, delete
from backend.database import AsyncSessionLocal
from backend.models import User, Donation, Payment, TonPayment
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def delete_half_users():
    """Delete half of users from database"""
    async with AsyncSessionLocal() as session:
        try:
            # Get total count of users
            count_query = select(func.count(User.tg_id))
            total_count = (await session.execute(count_query)).scalar()
            logger.info(f"Total users in database: {total_count}")
            
            if total_count == 0:
                logger.warning("No users to delete")
                return
            
            # Calculate half (rounded down)
            half_count = total_count // 2
            logger.info(f"Will delete {half_count} users (half of {total_count})")
            
            # Get users to delete (first half by tg_id)
            users_query = select(User.tg_id).order_by(User.tg_id).limit(half_count)
            result = await session.execute(users_query)
            user_ids_to_delete = [row[0] for row in result.all()]
            
            if not user_ids_to_delete:
                logger.warning("No users selected for deletion")
                return
            
            logger.info(f"Selected {len(user_ids_to_delete)} users to delete")
            
            # Delete related data first (to avoid foreign key constraints)
            # Delete donations
            donations_deleted = await session.execute(
                delete(Donation).where(Donation.tg_id.in_(user_ids_to_delete))
            )
            logger.info(f"Deleted {donations_deleted.rowcount} donations")
            
            # Delete payments
            payments_deleted = await session.execute(
                delete(Payment).where(Payment.tg_id.in_(user_ids_to_delete))
            )
            logger.info(f"Deleted {payments_deleted.rowcount} payments")
            
            # Delete TON payments
            ton_payments_deleted = await session.execute(
                delete(TonPayment).where(TonPayment.tg_id.in_(user_ids_to_delete))
            )
            logger.info(f"Deleted {ton_payments_deleted.rowcount} TON payments")
            
            # Delete users
            users_deleted = await session.execute(
                delete(User).where(User.tg_id.in_(user_ids_to_delete))
            )
            logger.info(f"Deleted {users_deleted.rowcount} users")
            
            await session.commit()
            logger.info(f"Successfully deleted {half_count} users and their related data")
            
            # Verify deletion
            remaining_count = (await session.execute(count_query)).scalar()
            logger.info(f"Remaining users: {remaining_count}")
            
            # Check total collected after deletion
            from backend.services import leaderboard_service
            total_collected = await leaderboard_service.get_total_collected(session)
            logger.info(f"Total collected funds after deletion: {total_collected} TON")
            
        except Exception as e:
            logger.error(f"Error deleting users: {e}", exc_info=True)
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(delete_half_users())
