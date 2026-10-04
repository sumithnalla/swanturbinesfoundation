"""
Help Request repository with seamless mock and offline fallback support.
"""
import logging
from datetime import datetime, timezone
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.repositories.base import BaseRepository

logger = logging.getLogger(__name__)

# Persistent in-memory storage during local offline execution
_IN_MEMORY_REQUESTS: List[dict] = []


class HelpRequestRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "help_requests")

    async def insert_one(self, doc: dict) -> str:
        try:
            return await super().insert_one(doc)
        except Exception as e:
            logger.warning("MongoDB unavailable for insert_one: %s. Using in-memory store.", e)
            _id = str(ObjectId())
            doc_copy = dict(doc)
            doc_copy["_id"] = ObjectId(_id)
            doc_copy["id"] = _id
            doc_copy["created_at"] = doc_copy.get("created_at") or datetime.now(timezone.utc)
            doc_copy["updated_at"] = doc_copy.get("updated_at") or datetime.now(timezone.utc)
            _IN_MEMORY_REQUESTS.insert(0, doc_copy)
            return _id

    async def find_by_id(self, id_str: str) -> Optional[dict]:
        try:
            res = await super().find_by_id(id_str)
            if res:
                return res
        except Exception:
            pass
        for item in _IN_MEMORY_REQUESTS:
            if str(item.get("id")) == str(id_str) or str(item.get("reference")) == str(id_str):
                return item
        return None

    async def find_by_reference(self, reference: str) -> Optional[dict]:
        try:
            res = await self.find_one({"reference": reference})
            if res:
                return res
        except Exception:
            pass
        for item in _IN_MEMORY_REQUESTS:
            if item.get("reference") == reference:
                return item
        return None

    async def find_admin_list(
        self,
        status: Optional[str] = None,
        urgency: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> List[dict]:
        try:
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
        except Exception:
            results = list(_IN_MEMORY_REQUESTS)
            if status:
                results = [r for r in results if r.get("status") == status]
            if urgency:
                results = [r for r in results if r.get("request", {}).get("urgency") == urgency]
            if search:
                s_lower = search.lower()
                results = [
                    r for r in results
                    if s_lower in str(r.get("reference", "")).lower()
                    or s_lower in str(r.get("applicant", {}).get("full_name", "")).lower()
                    or s_lower in str(r.get("applicant", {}).get("mobile", "")).lower()
                    or s_lower in str(r.get("applicant", {}).get("email", "")).lower()
                ]
            return results[skip : skip + limit]

    async def count_by_status(self) -> dict:
        """Return counts grouped by status."""
        result = {}
        try:
            pipeline = [
                {"$group": {"_id": "$status", "count": {"$sum": 1}}}
            ]
            async for doc in self._col.aggregate(pipeline):
                result[doc["_id"]] = doc["count"]
            return result
        except Exception:
            for item in _IN_MEMORY_REQUESTS:
                st = item.get("status", "pending")
                result[st] = result.get(st, 0) + 1
            return result

    async def count(self, filter: Optional[dict] = None) -> int:
        try:
            return await super().count(filter or {})
        except Exception:
            filter = filter or {}
            st = filter.get("status")
            if st:
                return len([r for r in _IN_MEMORY_REQUESTS if r.get("status") == st])
            return len(_IN_MEMORY_REQUESTS)

    async def update_status(self, request_id: str, new_status: str, admin_note: Optional[str] = None) -> bool:
        try:
            upd = {"status": new_status, "updated_at": datetime.now(timezone.utc)}
            if admin_note is not None:
                upd["admin_note"] = admin_note
            await self.update_one({"_id": ObjectId(request_id)}, {"$set": upd})
            return True
        except Exception:
            pass

        for item in _IN_MEMORY_REQUESTS:
            if str(item.get("id")) == str(request_id) or str(item.get("reference")) == str(request_id):
                item["status"] = new_status
                if admin_note is not None:
                    item["admin_note"] = admin_note
                item["updated_at"] = datetime.now(timezone.utc)
                return True
        return False
