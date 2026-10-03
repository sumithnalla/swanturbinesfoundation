"""
Base repository providing common MongoDB CRUD helpers.
All domain repositories inherit from this.
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _to_str_id(doc: dict) -> dict:
    """Convert _id ObjectId to string 'id' field."""
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


class BaseRepository:
    def __init__(self, db: AsyncIOMotorDatabase, collection_name: str):
        self._col = db[collection_name]

    async def find_by_id(self, id: str) -> Optional[dict]:
        try:
            doc = await self._col.find_one({"_id": ObjectId(id)})
        except Exception:
            return None
        return _to_str_id(doc) if doc else None

    async def find_one(self, filter: dict) -> Optional[dict]:
        doc = await self._col.find_one(filter)
        return _to_str_id(doc) if doc else None

    async def insert_one(self, data: dict) -> str:
        now = _now()
        data["created_at"] = now
        data["updated_at"] = now
        result = await self._col.insert_one(data)
        return str(result.inserted_id)

    async def update_by_id(self, id: str, update: dict) -> bool:
        update["updated_at"] = _now()
        result = await self._col.update_one(
            {"_id": ObjectId(id)},
            {"$set": update},
        )
        return result.modified_count > 0

    async def delete_by_id(self, id: str) -> bool:
        result = await self._col.delete_one({"_id": ObjectId(id)})
        return result.deleted_count > 0

    async def count(self, filter: dict = {}) -> int:
        return await self._col.count_documents(filter)

    async def find_paginated(
        self,
        filter: dict,
        sort: List[Tuple[str, int]],
        skip: int,
        limit: int,
    ) -> List[dict]:
        cursor = self._col.find(filter).sort(sort).skip(skip).limit(limit)
        return [_to_str_id(doc) async for doc in cursor]
