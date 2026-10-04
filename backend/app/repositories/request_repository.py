"""
Help Request repository with persistent file storage and MongoDB support.
"""
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.repositories.base import BaseRepository
from app.core.database import is_db_connected

logger = logging.getLogger(__name__)

# Data file path for persistent offline storage
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DATA_FILE = DATA_DIR / "help_requests.json"

# Default seed requests (yesterday and previous days) if no storage exists yet
DEFAULT_SEED_REQUESTS = [
    {
        "id": "507f1f77bcf86cd799439001",
        "reference": "STF-2026-000101",
        "status": "pending",
        "applicant": {
            "full_name": "Ramesh Kumar",
            "mobile": "+91 98451 23456",
            "email": "ramesh.k@example.com",
            "address": "House #44, Near Gandhi Statue, Nandigama",
            "city": "Krishna",
            "state": "Andhra Pradesh"
        },
        "request": {
            "support_type": "Clean Water",
            "description": "Our village water pump broke down 3 weeks ago. Over 120 families are walking 3km for drinking water. Urgently requesting community solar borewell support.",
            "beneficiaries": 120,
            "amount_required": "75,000",
            "urgency": "high"
        },
        "support_type": "Clean Water",
        "urgency": "high",
        "admin_note": "",
        "created_at": "2026-10-03T10:15:00Z",
        "updated_at": "2026-10-03T10:15:00Z"
    },
    {
        "id": "507f1f77bcf86cd799439002",
        "reference": "STF-2026-000102",
        "status": "under_review",
        "applicant": {
            "full_name": "Sunita Devi",
            "mobile": "+91 91234 56780",
            "email": "sunita.devi@example.com",
            "address": "Plot 12, Ward 4, Balanagar",
            "city": "Hyderabad",
            "state": "Telangana"
        },
        "request": {
            "support_type": "Education",
            "description": "Seeking school tuition support and textbooks for two orphaned children studying in Class 7 and 9 whose father passed away.",
            "beneficiaries": 2,
            "amount_required": "24,000",
            "urgency": "medium"
        },
        "support_type": "Education",
        "urgency": "medium",
        "admin_note": "Called applicant on 03 Oct. Documents verified. Awaiting trustee signoff.",
        "created_at": "2026-10-03T14:30:00Z",
        "updated_at": "2026-10-03T16:00:00Z"
    },
    {
        "id": "507f1f77bcf86cd799439003",
        "reference": "STF-2026-000103",
        "status": "accepted",
        "applicant": {
            "full_name": "Anil Reddy",
            "mobile": "+91 99887 76655",
            "email": "anil.reddy@example.com",
            "address": "D.No 8-3-228, Yellareddyguda",
            "city": "Hyderabad",
            "state": "Telangana"
        },
        "request": {
            "support_type": "Healthcare",
            "description": "Emergency post-operative medication and dialysis support for elderly father.",
            "beneficiaries": 1,
            "amount_required": "50,000",
            "urgency": "critical"
        },
        "support_type": "Healthcare",
        "urgency": "critical",
        "admin_note": "Approved by board. Medical bills validated from hospital.",
        "created_at": "2026-10-02T09:00:00Z",
        "updated_at": "2026-10-02T11:45:00Z"
    },
    {
        "id": "507f1f77bcf86cd799439004",
        "reference": "STF-2026-000104",
        "status": "pending",
        "applicant": {
            "full_name": "Kavitha Sharma",
            "mobile": "+91 94401 98765",
            "email": "kavitha.s@example.com",
            "address": "Street No. 3, Shivaji Nagar",
            "city": "Warangal",
            "state": "Telangana"
        },
        "request": {
            "support_type": "Women Empowerment",
            "description": "Requesting 5 commercial sewing machines for community skill development center for single mothers.",
            "beneficiaries": 15,
            "amount_required": "60,000",
            "urgency": "medium"
        },
        "support_type": "Women Empowerment",
        "urgency": "medium",
        "admin_note": "",
        "created_at": "2026-10-04T08:20:00Z",
        "updated_at": "2026-10-04T08:20:00Z"
    }
]


def _json_serial(obj):
    if isinstance(obj, (datetime,)):
        return obj.isoformat()
    if isinstance(obj, ObjectId):
        return str(obj)
    raise TypeError(f"Type {type(obj)} not serializable")


def _load_persisted_requests() -> List[dict]:
    if DATA_FILE.exists():
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    return data
        except Exception as e:
            logger.error("Failed to read help_requests.json: %s", e)
    # Seed default requests if file empty or missing
    _save_persisted_requests(DEFAULT_SEED_REQUESTS)
    return list(DEFAULT_SEED_REQUESTS)


def _save_persisted_requests(requests: List[dict]) -> None:
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(requests, f, default=_json_serial, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error("Failed to save help_requests.json: %s", e)


# Global in-memory list initialized from persistent file
_IN_MEMORY_REQUESTS: List[dict] = _load_persisted_requests()


class HelpRequestRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "help_requests")

    async def insert_one(self, doc: dict) -> str:
        _id = str(ObjectId())
        doc_copy = dict(doc)
        doc_copy["_id"] = ObjectId(_id)
        doc_copy["id"] = _id
        doc_copy["created_at"] = doc_copy.get("created_at") or datetime.now(timezone.utc)
        doc_copy["updated_at"] = doc_copy.get("updated_at") or datetime.now(timezone.utc)

        # Always save to persistent store immediately
        _IN_MEMORY_REQUESTS.insert(0, doc_copy)
        _save_persisted_requests(_IN_MEMORY_REQUESTS)

        # If MongoDB is connected, also insert to DB
        if is_db_connected():
            try:
                await super().insert_one(doc)
            except Exception as e:
                logger.warning("MongoDB insert failed: %s", e)

        return _id

    async def find_by_id(self, id_str: str) -> Optional[dict]:
        if is_db_connected():
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
        if is_db_connected():
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
        if is_db_connected():
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
                pass

        results = list(_IN_MEMORY_REQUESTS)
        if status:
            results = [r for r in results if r.get("status") == status]
        if urgency:
            results = [r for r in results if (r.get("request", {}).get("urgency") == urgency or r.get("urgency") == urgency)]
        if search:
            s_lower = search.lower()
            results = [
                r for r in results
                if s_lower in str(r.get("reference", "")).lower()
                or s_lower in str(r.get("applicant", {}).get("full_name", "")).lower()
                or s_lower in str(r.get("applicant", {}).get("mobile", "")).lower()
                or s_lower in str(r.get("applicant", {}).get("email", "")).lower()
                or s_lower in str(r.get("support_type", "")).lower()
            ]
        return results[skip : skip + limit]

    async def count_by_status(self) -> dict:
        """Return counts grouped by status."""
        result = {}
        if is_db_connected():
            try:
                pipeline = [
                    {"$group": {"_id": "$status", "count": {"$sum": 1}}}
                ]
                async for doc in self._col.aggregate(pipeline):
                    result[doc["_id"]] = doc["count"]
                return result
            except Exception:
                pass

        for item in _IN_MEMORY_REQUESTS:
            st = item.get("status", "pending")
            result[st] = result.get(st, 0) + 1
        return result

    async def count(self, filter: Optional[dict] = None) -> int:
        if is_db_connected():
            try:
                return await super().count(filter or {})
            except Exception:
                pass

        filter = filter or {}
        st = filter.get("status")
        if st:
            return len([r for r in _IN_MEMORY_REQUESTS if r.get("status") == st])
        return len(_IN_MEMORY_REQUESTS)

    async def update_status(self, request_id: str, new_status: str, admin_note: Optional[str] = None) -> bool:
        if is_db_connected():
            try:
                upd = {"status": new_status, "updated_at": datetime.now(timezone.utc)}
                if ObjectId.is_valid(request_id):
                    await self.update_one({"_id": ObjectId(request_id)}, {"$set": upd})
                else:
                    await self.update_one({"reference": request_id}, {"$set": upd})
            except Exception:
                pass

        updated = False
        for item in _IN_MEMORY_REQUESTS:
            if str(item.get("id")) == str(request_id) or str(item.get("reference")) == str(request_id):
                item["status"] = new_status
                if admin_note is not None:
                    item["admin_note"] = admin_note
                item["updated_at"] = datetime.now(timezone.utc).isoformat()
                updated = True
                break

        if updated:
            _save_persisted_requests(_IN_MEMORY_REQUESTS)
        return updated

