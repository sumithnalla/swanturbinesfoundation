"""
Audit Log repository — append-only.
"""
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base import BaseRepository
from app.models.audit import AuditLogCreate


class AuditRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "audit_logs")

    async def log(self, entry: AuditLogCreate) -> str:
        """Append an audit log entry. Never raises — logs failure to stderr."""
        import logging
        import sys
        try:
            return await self.insert_one(entry.model_dump())
        except Exception as e:
            # Audit failure must never crash the application
            logging.getLogger(__name__).error(
                "AUDIT LOG FAILED: %s | entry=%s", e, entry.model_dump()
            )
            return ""

    async def find_recent(self, skip: int = 0, limit: int = 50) -> List[dict]:
        return await self.find_paginated(
            filter={},
            sort=[("created_at", -1)],
            skip=skip,
            limit=limit,
        )
