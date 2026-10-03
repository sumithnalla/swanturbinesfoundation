"""
Help Request repository.
"""
from datetime import datetime, timezone
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base import BaseRepository


class HelpRequestRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "help_requests")

    async def find_by_reference(self, reference: str) -> Optional[dict]:
        return await self.find_one({"reference": reference})

    async def find_admin_list(
        self,
        status: Optional[str] = None,
        urgency: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> List[dict]:
        filter: dict = {}
        if status:
            filter["status"] = status
        if urgency:
            filter["request.urgency"] = urgency
        if search:
            filter["$or"] = [
                {"reference": {"$regex": search, "$options": "i"}},
                {"applicant.full_name": {"$regex": search, "$options": "i"}},
                {"applicant.mobile": {"$regex": search, "$options": "i"}},
                {"applicant.email": {"$regex": search, "$options": "i"}},
            ]
        return await self.find_paginated(
            filter=filter,
            sort=[("created_at", -1)],
            skip=skip,
            limit=limit,
        )

    async def count_by_status(self) -> dict:
        """Return counts grouped by status."""
        from bson import ObjectId
        pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        result = {}
        async for doc in self._col.aggregate(pipeline):
            result[doc["_id"]] = doc["count"]
        return result
