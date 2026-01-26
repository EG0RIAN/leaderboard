from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from backend.database import get_db
from backend.services import tasks_service
from backend.telegram_auth import validate_telegram_init_data

router = APIRouter(prefix="/tasks", tags=["tasks"])


async def get_current_user_id(
    x_init_data: Optional[str] = Header(None, alias="X-Init-Data")
) -> int:
    if not x_init_data:
        raise HTTPException(status_code=401, detail="Missing X-Init-Data header")
    user_data = validate_telegram_init_data(x_init_data)
    if not user_data or not user_data.get("tg_id"):
        raise HTTPException(status_code=401, detail="Invalid initData")
    return user_data["tg_id"]


@router.get("")
async def get_tasks(
    session: AsyncSession = Depends(get_db),
    tg_id: int = Depends(get_current_user_id),
):
    """List active tasks with completion status for current user."""
    return await tasks_service.list_tasks(session, tg_id)


@router.post("/{task_id}/complete")
async def complete_task(
    task_id: str,
    session: AsyncSession = Depends(get_db),
    tg_id: int = Depends(get_current_user_id),
):
    """Mark task as completed and credit charts to user balance."""
    result = await tasks_service.complete_task(session, tg_id, task_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "failed"))
    return result
