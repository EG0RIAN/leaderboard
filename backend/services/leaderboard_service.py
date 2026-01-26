from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import aliased
from typing import List, Dict, Optional
from backend.models import User, Donation
from backend.config import settings
from datetime import datetime
import pytz


def get_week_key(dt: Optional[datetime] = None) -> str:
    """Get week key in format 'YYYY-WNN' for Europe/Berlin timezone"""
    if dt is None:
        dt = datetime.utcnow()
    
    tz = pytz.timezone(settings.timezone)
    local_dt = dt.replace(tzinfo=pytz.UTC).astimezone(tz)
    year, week, _ = local_dt.isocalendar()
    return f"{year}-W{week:02d}"


async def get_total_collected(session: AsyncSession) -> float:
    """Get total collected amount (sum of all donations in charts/tons)"""
    query = select(func.coalesce(func.sum(Donation.tons_amount), 0)).select_from(Donation)
    result = await session.execute(query)
    return float(result.scalar() or 0)


async def get_all_time_leaderboard(
    session: AsyncSession,
    limit: int = 50,
    offset: int = 0
) -> List[Dict]:
    """Get all-time leaderboard sorted by total tons"""
    query = (
        select(
            User.tg_id,
            User.username,
            User.first_name,
            User.display_name,
            User.photo_url,
            User.custom_title,
            User.custom_text,
            User.custom_link,
            func.coalesce(func.sum(Donation.tons_amount), 0).label("tons_total")
        )
        .outerjoin(Donation, User.tg_id == Donation.tg_id)
        .where(User.is_blocked == False)
        .group_by(User.tg_id, User.username, User.first_name, User.display_name, User.photo_url, User.custom_title, User.custom_text, User.custom_link)
        .order_by(desc("tons_total"), User.tg_id)
        .limit(limit)
        .offset(offset)
    )
    
    result = await session.execute(query)
    rows = result.all()
    
    leaderboard = []
    for rank, row in enumerate(rows, start=offset + 1):
        leaderboard.append({
            "rank": rank,
            "tg_id": row.tg_id,
            "username": row.username,
            "first_name": row.first_name,
            "display_name": row.display_name,
            "photo_url": row.photo_url,
            "custom_title": row.custom_title,
            "custom_text": row.custom_text,
            "custom_link": row.custom_link,
            "tons_total": float(row.tons_total)
        })
    
    return leaderboard


async def get_week_leaderboard(
    session: AsyncSession,
    week_key: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> List[Dict]:
    """Weekly leaderboard: only current week (week_key), only users who have deposits this week."""
    if week_key is None:
        week_key = get_week_key()
    
    # Only users with at least one donation in this week (sum > 0)
    subq = (
        select(
            Donation.tg_id,
            func.coalesce(func.sum(Donation.tons_amount), 0).label("tons_week")
        )
        .where(Donation.week_key == week_key)
        .group_by(Donation.tg_id)
        .having(func.coalesce(func.sum(Donation.tons_amount), 0) > 0)
    ).subquery()
    
    query = (
        select(
            User.tg_id,
            User.username,
            User.first_name,
            User.display_name,
            User.photo_url,
            User.custom_title,
            User.custom_text,
            User.custom_link,
            subq.c.tons_week
        )
        .join(subq, User.tg_id == subq.c.tg_id)
        .where(User.is_blocked == False)
        .order_by(desc(subq.c.tons_week), User.tg_id)
        .limit(limit)
        .offset(offset)
    )
    
    result = await session.execute(query)
    rows = result.all()
    
    leaderboard = []
    for rank, row in enumerate(rows, start=offset + 1):
        leaderboard.append({
            "rank": rank,
            "tg_id": row.tg_id,
            "username": row.username,
            "first_name": row.first_name,
            "display_name": row.display_name,
            "photo_url": row.photo_url,
            "custom_title": row.custom_title,
            "custom_text": row.custom_text,
            "custom_link": row.custom_link,
            "tons_week": float(row.tons_week)
        })
    
    return leaderboard


async def get_referrals_leaderboard(
    session: AsyncSession,
    limit: int = 50,
    offset: int = 0
) -> List[Dict]:
    """Get referrals leaderboard sorted by total referrals tons"""
    # Subquery: total tons from referrals per referrer
    referrals_alias = aliased(User)
    donations_alias = aliased(Donation)
    
    subquery = (
        select(
            referrals_alias.referrer_id.label("referrer_id"),
            func.count(func.distinct(referrals_alias.tg_id)).label("referrals_count"),
            func.coalesce(func.sum(donations_alias.tons_amount), 0).label("referrals_tons_total")
        )
        .select_from(referrals_alias)
        .outerjoin(donations_alias, referrals_alias.tg_id == donations_alias.tg_id)
        .where(referrals_alias.referrer_id.isnot(None))
        .group_by(referrals_alias.referrer_id)
    ).subquery()
    
    query = (
        select(
            User.tg_id,
            User.username,
            User.first_name,
            User.display_name,
            User.photo_url,
            User.custom_title,
            User.custom_text,
            User.custom_link,
            func.coalesce(subquery.c.referrals_count, 0).label("referrals_count"),
            func.coalesce(subquery.c.referrals_tons_total, 0).label("referrals_tons_total")
        )
        .outerjoin(subquery, User.tg_id == subquery.c.referrer_id)
        .where(User.is_blocked == False)
        .group_by(
            User.tg_id,
            User.username,
            User.first_name,
            User.display_name,
            User.photo_url,
            User.custom_title,
            User.custom_text,
            User.custom_link,
            subquery.c.referrals_count,
            subquery.c.referrals_tons_total
        )
        .order_by(desc("referrals_tons_total"), User.tg_id)
        .limit(limit)
        .offset(offset)
    )
    
    result = await session.execute(query)
    rows = result.all()
    
    leaderboard = []
    actual_rank = 0
    for row in rows:
        # Include users who have referrals (even if no tons yet)
        if int(row.referrals_count) > 0:
            actual_rank += 1
            leaderboard.append({
                "rank": actual_rank,
                "tg_id": row.tg_id,
                "username": row.username,
                "first_name": row.first_name,
                "display_name": row.display_name,
                "photo_url": row.photo_url,
                "custom_title": row.custom_title,
                "custom_text": row.custom_text,
                "custom_link": row.custom_link,
                "referrals_count": int(row.referrals_count),
                "referrals_tons_total": float(row.referrals_tons_total)
            })
    
    return leaderboard


async def get_user_stats(
    session: AsyncSession,
    tg_id: int
) -> Dict:
    """Get user statistics: tons, referral stats, position in leaderboards"""
    # User's total tons
    total_tons_query = (
        select(func.coalesce(func.sum(Donation.tons_amount), 0))
        .where(Donation.tg_id == tg_id)
    )
    total_tons = (await session.execute(total_tons_query)).scalar() or 0
    
    # User's weekly tons
    week_key = get_week_key()
    week_tons_query = (
        select(func.coalesce(func.sum(Donation.tons_amount), 0))
        .where((Donation.tg_id == tg_id) & (Donation.week_key == week_key))
    )
    week_tons = (await session.execute(week_tons_query)).scalar() or 0
    
    # Referral stats
    referrals_query = (
        select(
            func.count(User.tg_id).label("referrals_count"),
            func.coalesce(func.sum(Donation.tons_amount), 0).label("referrals_tons_total")
        )
        .select_from(User)
        .outerjoin(Donation, User.tg_id == Donation.tg_id)
        .where(User.referrer_id == tg_id)
        .group_by(User.referrer_id)
    )
    ref_result = await session.execute(referrals_query)
    ref_row = ref_result.first()
    
    referrals_count = int(ref_row.referrals_count) if ref_row else 0
    referrals_tons_total = float(ref_row.referrals_tons_total) if ref_row else 0.0
    
    # Calculate all-time rank
    rank_all_time = 0
    if float(total_tons) > 0:
        rank_query = (
            select(func.count(User.tg_id))
            .select_from(User)
            .outerjoin(Donation, User.tg_id == Donation.tg_id)
            .where(User.is_blocked == False)
            .group_by(User.tg_id)
            .having(func.coalesce(func.sum(Donation.tons_amount), 0) > total_tons)
        )
        rank_result = await session.execute(rank_query)
        users_above = len(rank_result.all())
        rank_all_time = users_above + 1
    
    # Weekly rank: place among users who have donations this week
    current_week_key = get_week_key()
    rank_week = 0
    if float(week_tons) > 0:
        week_rank_query = (
            select(func.count())
            .select_from(
                select(Donation.tg_id)
                .where(Donation.week_key == current_week_key)
                .group_by(Donation.tg_id)
                .having(func.coalesce(func.sum(Donation.tons_amount), 0) > week_tons)
                .subquery()
            )
        )
        week_rank_result = await session.execute(week_rank_query)
        users_above_week = week_rank_result.scalar() or 0
        rank_week = users_above_week + 1
    
    return {
        "tg_id": tg_id,
        "tons_all_time": float(total_tons),
        "tons_week": float(week_tons),
        "rank_all_time": rank_all_time,
        "rank_week": rank_week,
        "week_key": current_week_key,
        "referrals_count": referrals_count,
        "referrals_tons_total": float(referrals_tons_total),
        "referral_link": f"{settings.mini_app_url}?startapp=ref_{tg_id}"
    }

