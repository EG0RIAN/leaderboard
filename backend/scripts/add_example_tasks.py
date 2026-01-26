"""
Add example tasks to the database. Run from project root:
  PYTHONPATH=. python -m backend.scripts.add_example_tasks
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database import async_session_maker
from backend.models import Task


async def main():
    async with async_session_maker() as session:
        from sqlalchemy import select
        r = await session.execute(select(Task).limit(1))
        if r.scalar_one_or_none():
            print("Tasks already exist, skip.")
            return
        tasks = [
            Task(
                type="subscribe_channel",
                title="Подпишитесь на наш канал",
                description="Перейдите в канал и нажмите «Подписаться»",
                charts_reward=10,
                config={"channel_username": "durov"},
                is_active=True,
                sort_order=1,
            ),
            Task(
                type="join_chat",
                title="Вступите в чат сообщества",
                description="Присоединяйтесь к общему чату",
                charts_reward=15,
                config={"invite_link": "https://t.me/+example"},
                is_active=True,
                sort_order=2,
            ),
            Task(
                type="open_app",
                title="Откройте приложение",
                description="Перейдите в приложение и выполните действие",
                charts_reward=20,
                config={"app_url": "https://t.me/your_app"},
                is_active=True,
                sort_order=3,
            ),
        ]
        for t in tasks:
            session.add(t)
        await session.commit()
        print(f"Added {len(tasks)} example tasks. Update config (channel_username, invite_link, app_url) in DB for your real links.")


if __name__ == "__main__":
    asyncio.run(main())
