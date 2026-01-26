"""Script to add 502 test users with donations for testing leaderboard"""
import asyncio
import random
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from backend.models import User, Donation, Payment
from backend.database import Base
from backend.config import settings
from backend.services.leaderboard_service import get_week_key
import uuid

# Create async engine
engine = create_async_engine(settings.database_url, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def add_test_users():
    """Add 502 test users with varying donation amounts"""
    async with async_session() as session:
        try:
            # Check how many users already exist
            from sqlalchemy import select, func
            count_query = select(func.count(User.tg_id))
            result = await session.execute(count_query)
            existing_count = result.scalar() or 0
            print(f"Existing users: {existing_count}")
            
            # Generate test users
            base_tg_id = 1000000  # Start from 1000000 to avoid conflicts
            week_key = get_week_key()
            
            # Distribution strategy:
            # - Top 3: very high amounts
            # - 4-10: high amounts
            # - 11-25: medium-high amounts
            # - 26-50: medium amounts
            # - 51-100: medium-low amounts
            # - 101-250: low-medium amounts
            # - 251-500: low amounts
            # - 501-502: very low amounts
            
            users_to_create = 502
            created = 0
            
            for i in range(users_to_create):
                rank = i + 1
                tg_id = base_tg_id + i
                
                # Determine tons_amount based on rank
                if rank == 1:
                    tons_amount = Decimal('10000.0')  # Top 1
                elif rank == 2:
                    tons_amount = Decimal('8000.0')   # Top 2
                elif rank == 3:
                    tons_amount = Decimal('6000.0')   # Top 3
                elif rank <= 10:
                    # 4-10: 4000-5000
                    tons_amount = Decimal(str(5000 - (rank - 4) * 100))
                elif rank <= 25:
                    # 11-25: 2000-3900
                    tons_amount = Decimal(str(3900 - (rank - 11) * 100))
                elif rank <= 50:
                    # 26-50: 1000-1990
                    tons_amount = Decimal(str(1990 - (rank - 26) * 40))
                elif rank <= 100:
                    # 51-100: 500-990
                    tons_amount = Decimal(str(990 - (rank - 51) * 10))
                elif rank <= 250:
                    # 101-250: 200-490
                    tons_amount = Decimal(str(490 - (rank - 101) * 2))
                elif rank <= 500:
                    # 251-500: 50-199
                    tons_amount = Decimal(str(199 - (rank - 251) * 0.6))
                else:
                    # 501-502: very low
                    tons_amount = Decimal(str(10 - (rank - 501) * 5))
                
                # Create user
                user = User(
                    tg_id=tg_id,
                    username=f"test_user_{rank}",
                    first_name=f"Test{rank}",
                    last_name=f"User{rank}",
                    display_name=f"Test User {rank}",
                    language_code="ru",
                    is_premium=rank <= 10,  # Top 10 are premium
                    is_blocked=False,
                    created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                    updated_at=datetime.utcnow(),
                    last_seen_at=datetime.utcnow()
                )
                
                session.add(user)
                
                # Create donation
                stars_amount = int(float(tons_amount) * 500)  # Approximate: 1 TON = 500 stars
                donation = Donation(
                    id=uuid.uuid4(),
                    tg_id=tg_id,
                    stars_amount=stars_amount,
                    tons_amount=tons_amount,
                    week_key=week_key,
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 7))
                )
                
                session.add(donation)
                
                created += 1
                
                if created % 50 == 0:
                    print(f"Created {created} users...")
                    await session.commit()
            
            # Final commit
            await session.commit()
            print(f"✅ Successfully created {created} test users with donations!")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error: {e}")
            raise
        finally:
            await session.close()


if __name__ == "__main__":
    asyncio.run(add_test_users())

