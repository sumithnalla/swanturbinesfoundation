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


@router.get("/users")
async def list_users(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("users.read")),
):
    """WEBSITTER manage: list all administrative and staff users."""
    users = []
    async for u in db.users.find({}, {"hashed_password": 0}):
        users.append({
            "id": str(u["_id"]),
            "full_name": u.get("full_name", ""),
            "email": u.get("email", ""),
            "is_active": u.get("is_active", True),
            "role_ids": [str(r) for r in u.get("role_ids", [])],
            "created_at": u.get("created_at"),
            "updated_at": u.get("updated_at"),
        })
    return {"users": users}


@router.post("/users")
async def create_new_user(
    data: dict,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("users.manage")),
):
    """WEBSITTER manage: create a new user account."""
    from app.services.auth_service import AuthService
    from app.repositories.user_repository import UserRepository
    from app.models.user import UserCreate

    user_repo = UserRepository(db)
    audit = AuditRepository(db)
    auth_service = AuthService(user_repo, audit)

    user_create = UserCreate(
        full_name=data["full_name"],
        email=data["email"],
        password=data["password"],
        role_ids=data.get("role_ids", []),
    )
    user_id = await auth_service.create_user(
        full_name=user_create.full_name,
        email=user_create.email,
        password=user_create.password,
        role_ids=user_create.role_ids,
        actor_id=str(current_user["_id"]),
    )
    return {"user": {"id": user_id, "email": user_create.email, "full_name": user_create.full_name}}


@router.patch("/users/{user_id}/status")
async def toggle_user_status(
    user_id: str,
    payload: dict,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("users.manage")),
):
    """WEBSITTER manage: activate or deactivate a user account."""
    from bson import ObjectId
    from app.core.errors import not_found_error
    is_active = payload.get("is_active", True)
    res = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": is_active}}
    )
    if res.matched_count == 0:
        raise not_found_error("User not found.")
    return {"updated": True, "is_active": is_active}


@router.get("/roles")
async def list_roles(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("roles.read")),
):
    """WEBSITTER manage: list all roles with permissions."""
    roles = []
    async for r in db.roles.find({}):
        roles.append({
            "id": str(r["_id"]),
            "name": r.get("name"),
            "description": r.get("description", ""),
            "permissions": r.get("permissions", []),
        })
    return {"roles": roles}
