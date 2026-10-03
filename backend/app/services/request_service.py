"""
Help Request service — business logic for request submission and management.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.request import HelpRequestCreate, RequestStatus
from app.models.audit import AuditLogCreate, AuditAction
from app.repositories.request_repository import HelpRequestRepository
from app.repositories.audit_repository import AuditRepository
from app.core.errors import not_found_error, validation_error

logger = logging.getLogger(__name__)


async def _generate_reference(db: AsyncIOMotorDatabase) -> str:
    """
    Generate a unique public request reference: STF-YYYY-NNNNNN.
    Uses an atomic MongoDB counter per year to guarantee uniqueness.
    """
    year = datetime.now(timezone.utc).year
    counter_name = f"help_request_{year}"
    result = await db.counters.find_one_and_update(
        {"name": counter_name},
        {"$inc": {"value": 1}},
        upsert=True,
        return_document=True,  # pymongo.ReturnDocument.AFTER
    )
    sequence = result.get("value", 1) if (result and isinstance(result, dict)) else 1
    return f"STF-{year}-{str(sequence).zfill(6)}"


class RequestService:
    def __init__(
        self,
        request_repo: HelpRequestRepository,
        audit_repo: AuditRepository,
        db: AsyncIOMotorDatabase,
    ):
        self._requests = request_repo
        self._audit = audit_repo
        self._db = db

    async def submit_request(self, payload: HelpRequestCreate) -> dict:
        """Submit a new help request. Returns the saved request document."""
        reference = await _generate_reference(self._db)

        doc = {
            "reference": reference,
            "applicant": payload.applicant.model_dump(),
            "request": payload.request.model_dump(),
            "consent": payload.consent,
            "status": RequestStatus.PENDING,
            "admin_note": "",
            "document_ids": [],
        }
        request_id = await self._requests.insert_one(doc)

        await self._audit.log(AuditLogCreate(
            action=AuditAction.REQUEST_SUBMITTED,
            resource_type="help_request",
            resource_id=request_id,
            metadata={"reference": reference, "support_type": payload.request.support_type},
        ))

        logger.info("Help request submitted: %s", reference)
        doc["id"] = request_id
        doc["reference"] = reference
        return doc

    async def update_status(
        self,
        request_id: str,
        new_status: str,
        admin_note: Optional[str],
        actor_id: str,
        actor_email: str,
    ) -> dict:
        """Update request status with validation of allowed transitions."""
        existing = await self._requests.find_by_id(request_id)
        if not existing:
            raise not_found_error("Help request")

        current_status = existing["status"]
        if not RequestStatus.can_transition(current_status, new_status):
            raise validation_error(
                f"Cannot transition from '{current_status}' to '{new_status}'."
            )

        update: dict = {"status": new_status}
        if admin_note is not None:
            update["admin_note"] = admin_note

        await self._requests.update_by_id(request_id, update)

        await self._audit.log(AuditLogCreate(
            actor_id=actor_id,
            actor_email=actor_email,
            action=AuditAction.REQUEST_STATUS_CHANGED,
            resource_type="help_request",
            resource_id=request_id,
            metadata={
                "from_status": current_status,
                "to_status": new_status,
                "reference": existing.get("reference"),
            },
        ))

        return await self._requests.find_by_id(request_id)
