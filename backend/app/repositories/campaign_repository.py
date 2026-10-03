"""
Campaign repository.
"""
from typing import List, Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base import BaseRepository


class CampaignRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "campaigns")

    async def find_by_slug(self, slug: str) -> Optional[dict]:
        return await self.find_one({"slug": slug})

    async def find_active(self, skip: int = 0, limit: int = 20) -> List[dict]:
        return await self.find_paginated(
            filter={"status": "active"},
            sort=[("display_order", 1), ("created_at", -1)],
            skip=skip,
            limit=limit,
        )

    async def find_featured(self, limit: int = 3) -> List[dict]:
        return await self.find_paginated(
            filter={"status": "active", "featured": True},
            sort=[("display_order", 1)],
            skip=0,
            limit=limit,
        )

    async def find_all_paged(
        self,
        filter: dict,
        sort: List[Tuple[str, int]],
        skip: int,
        limit: int,
    ) -> List[dict]:
        return await self.find_paginated(filter, sort, skip, limit)

    async def slug_exists(self, slug: str, exclude_id: Optional[str] = None) -> bool:
        from bson import ObjectId
        query: dict = {"slug": slug}
        if exclude_id:
            try:
                query["_id"] = {"$ne": ObjectId(exclude_id)}
            except Exception:
                pass
        doc = await self.find_one(query)
        return doc is not None
