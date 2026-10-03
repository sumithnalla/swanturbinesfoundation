"""
Contact form API route.
POST /api/v1/contact
"""
import logging
from fastapi import APIRouter, Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.core.config import get_settings
from app.models.contact import ContactCreate, ContactOut
from app.models.audit import AuditLogCreate, AuditAction
from app.repositories.audit_repository import AuditRepository
from app.repositories.base import BaseRepository
from app.services.email_service import EmailService
from app.providers.email import ResendEmailProvider

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/contact", tags=["contact"])
settings = get_settings()


@router.post("", status_code=201)
async def submit_contact(
    payload: ContactCreate,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Public contact form submission.
    Persists the submission and sends notification email to admin.
    """
    # Persist
    repo = BaseRepository(db, "contact_submissions")
    doc_id = await repo.insert_one(payload.model_dump())

    # Audit
    audit = AuditRepository(db)
    await audit.log(AuditLogCreate(
        action=AuditAction.CONTACT_SUBMITTED,
        resource_type="contact_submission",
        resource_id=doc_id,
        metadata={"email": payload.email, "name": f"{payload.first_name} {payload.last_name}"},
        ip_address=request.client.host if request.client else None,
    ))

    # Email notification
    if settings.RESEND_API_KEY:
        provider = ResendEmailProvider(settings.RESEND_API_KEY, settings.RESEND_FROM)
        email_svc = EmailService(provider, audit, settings.RESEND_FROM)
        await email_svc.send_contact_notification(
            admin_email=settings.ADMIN_NOTIFICATION_EMAIL,
            submitter_name=f"{payload.first_name} {payload.last_name}",
            submitter_email=payload.email,
            message=payload.message,
        )

    return {
        "message": "Thank you for contacting us. We will get back to you shortly.",
        "submission_id": doc_id,
    }
