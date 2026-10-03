"""
Admin utility routes — dashboard stats, email sending.
"""
import logging
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.config import get_settings
from app.core.dependencies import require_permission
from app.models.audit import AuditLogCreate, AuditAction
from app.repositories.audit_repository import AuditRepository
from app.repositories.request_repository import HelpRequestRepository
from app.repositories.campaign_repository import CampaignRepository
from app.services.email_service import EmailService
from app.providers.email import ResendEmailProvider

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])
settings = get_settings()


@router.get("/dashboard")
async def admin_dashboard(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("requests.read")),
):
    """Admin dashboard statistics."""
    request_repo = HelpRequestRepository(db)
    campaign_repo = CampaignRepository(db)

    request_counts = await request_repo.count_by_status()
    total_requests = sum(request_counts.values())

    active_campaigns = await campaign_repo.count({"status": "active"})
    completed_campaigns = await campaign_repo.count({"status": "completed"})

    return {
        "requests": {
            "total": total_requests,
            "by_status": request_counts,
        },
        "campaigns": {
            "active": active_campaigns,
            "completed": completed_campaigns,
        },
    }


class SendEmailPayload(BaseModel):
    to: EmailStr
    subject: str
    message: str


@router.post("/send-email")
async def send_email_to_applicant(
    payload: SendEmailPayload,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("requests.read")),
):
    """Admin: send a custom email to an applicant."""
    audit = AuditRepository(db)
    provider = ResendEmailProvider(settings.RESEND_API_KEY, settings.RESEND_FROM)
    email_svc = EmailService(provider, audit, settings.RESEND_FROM)

    success = await email_svc.send_custom_to_applicant(
        to=payload.to,
        subject=payload.subject,
        message_html=f"<p>{payload.message}</p>",
        sender_name=current_user.get("full_name", "Foundation Admin"),
    )

    return {"sent": success}


@router.get("/audit-logs")
async def get_audit_logs(
    page: int = 1,
    page_size: int = 50,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("audit.read")),
):
    """WEBSITTER manage: read audit logs."""
    audit = AuditRepository(db)
    skip = (page - 1) * page_size
    logs = await audit.find_recent(skip=skip, limit=page_size)
    total = await db.audit_logs.count_documents({})
    return {"logs": logs, "total": total, "page": page, "page_size": page_size}
