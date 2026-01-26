from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Optional
from backend.models import Task, TaskCompletion, User


async def list_tasks(session: AsyncSession, tg_id: int) -> List[Dict]:
    """List active tasks with completion status for user."""
    task_query = (
        select(Task)
        .where(Task.is_active == True)
        .order_by(Task.sort_order.asc(), Task.created_at.asc())
    )
    result = await session.execute(task_query)
    tasks = result.scalars().all()

    completed_query = select(TaskCompletion.task_id).where(TaskCompletion.tg_id == tg_id)
    comp_result = await session.execute(completed_query)
    completed_ids = {row[0] for row in comp_result.all()}

    out = []
    for t in tasks:
        out.append({
            "id": str(t.id),
            "type": t.type,
            "title": t.title,
            "description": t.description or "",
            "charts_reward": float(t.charts_reward),
            "config": t.config or {},
            "completed": t.id in completed_ids,
        })
    return out


async def complete_task(session: AsyncSession, tg_id: int, task_id: str) -> Dict:
    """
    Mark task as completed for user and add charts to balance.
    Returns {success, error?, charts_added?, new_balance?}.
    """
    from uuid import UUID

    try:
        task_uuid = UUID(task_id)
    except (ValueError, TypeError):
        return {"success": False, "error": "invalid_task_id"}

    task_result = await session.execute(select(Task).where(Task.id == task_uuid))
    task = task_result.scalar_one_or_none()
    if not task or not task.is_active:
        return {"success": False, "error": "task_not_found"}

    existing = await session.execute(
        select(TaskCompletion).where(
            TaskCompletion.tg_id == tg_id,
            TaskCompletion.task_id == task_uuid
        )
    )
    if existing.scalar_one_or_none():
        return {"success": False, "error": "already_completed"}

    user_result = await session.execute(select(User).where(User.tg_id == tg_id))
    user = user_result.scalar_one_or_none()
    if not user:
        return {"success": False, "error": "user_not_found"}

    reward = float(task.charts_reward)
    user.balance_charts = float(user.balance_charts or 0) + reward

    completion = TaskCompletion(
        tg_id=tg_id,
        task_id=task_uuid,
    )
    session.add(completion)
    await session.commit()
    await session.refresh(user)

    return {
        "success": True,
        "charts_added": reward,
        "new_balance": float(user.balance_charts),
    }
