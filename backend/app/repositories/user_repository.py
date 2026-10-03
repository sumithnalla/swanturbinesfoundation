"""
User repository — data access for users collection.
"""
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "users")

    async def find_by_email(self, email: str) -> Optional[dict]:
        return await self.find_one({"email": email.lower()})

    async def create_user(
        self,
        full_name: str,
        email: str,
        hashed_password: str,
        role_ids: list,
    ) -> str:
        data = {
            "full_name": full_name,
            "email": email.lower(),
            "password_hash": hashed_password,
            "role_ids": role_ids,
            "is_active": True,
            "failed_login_attempts": 0,
            "locked_until": None,
        }
        return await self.insert_one(data)

    async def increment_failed_login(self, user_id: str) -> None:
        from datetime import datetime, timedelta, timezone
        from bson import ObjectId
        user = await self.find_by_id(user_id)
        attempts = (user.get("failed_login_attempts") or 0) + 1
        update: dict = {"failed_login_attempts": attempts}
        if attempts >= 5:
            update["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=15)
        await self.update_by_id(user_id, update)

    async def reset_failed_login(self, user_id: str) -> None:
        await self.update_by_id(user_id, {
            "failed_login_attempts": 0,
            "locked_until": None,
        })
