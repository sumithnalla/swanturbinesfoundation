"""
Help Request API routes.

Public:
  POST /api/v1/requests              — submit help request (Step 1+2)
  POST /api/v1/requests/{id}/documents — upload documents (Step 3)

Admin (requires auth + permission):
  GET  /api/v1/requests/admin        — list all requests
  GET  /api/v1/requests/admin/{id}   — request detail
  PATCH /api/v1/requests/admin/{id}/status — change status
  GET  /api/v1/requests/admin/{id}/documents/{doc_id} — download document
"""
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db, get_gridfs
from app.core.config import get_settings
from app.core.dependencies import require_permission
from app.core.errors import not_found_error, validation_error, forbidden_error
from app.models.request import (
    HelpRequestCreate, HelpRequestOut, HelpRequestDetailOut,
    HelpRequestListResponse, StatusUpdateRequest, ApplicantInfo, RequestInfo
)
from app.models.audit import AuditLogCreate, AuditAction
from app.repositories.request_repository import HelpRequestRepository
from app.repositories.audit_repository import AuditRepository
from app.services.request_service import RequestService
from app.services.email_service import EmailService
from app.providers.storage import GridFSStorageProvider
from app.providers.email import ResendEmailProvider
from fastapi.responses import StreamingResponse
import io

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/requests", tags=["requests"])
settings = get_settings()


def _get_email_service(db: AsyncIOMotorDatabase) -> EmailService:
    provider = ResendEmailProvider(settings.RESEND_API_KEY, settings.RESEND_FROM)
    audit = AuditRepository(db)
    return EmailService(provider, audit, settings.RESEND_FROM)


def _doc_to_out(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "reference": doc["reference"],
        "status": doc["status"],
        "support_type": doc.get("request", {}).get("support_type", ""),
        "urgency": doc.get("request", {}).get("urgency", ""),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }


# ── Public: Submit request ────────────────────────────────────────────────────

@router.post("", status_code=201)
async def submit_request(
    payload: HelpRequestCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Submit a new help request (Steps 1 + 2). Returns request reference."""
    repo = HelpRequestRepository(db)
    audit = AuditRepository(db)
    service = RequestService(repo, audit, db)

    saved = await service.submit_request(payload)

    # Send emails (non-blocking — failure doesn't fail the request)
    if settings.RESEND_API_KEY:
        email_svc = _get_email_service(db)
        applicant_email = payload.applicant.email
        if applicant_email:
            await email_svc.send_request_acknowledgement(
                to=applicant_email,
                applicant_name=payload.applicant.full_name,
                reference=saved["reference"],
            )
        await email_svc.send_admin_new_request_notification(
            admin_email=settings.ADMIN_NOTIFICATION_EMAIL,
            reference=saved["reference"],
            support_type=payload.request.support_type,
            urgency=payload.request.urgency,
        )

    return {
        "message": "Your request has been submitted successfully.",
        "reference": saved["reference"],
        "request_id": saved["id"],
        "status": saved["status"],
    }


# ── Public: Upload documents (Step 3) ─────────────────────────────────────────

@router.post("/{request_id}/documents", status_code=201)
async def upload_documents(
    request_id: str,
    files: List[UploadFile] = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Upload supporting documents for a help request (Step 3)."""
    repo = HelpRequestRepository(db)
    request_doc = await repo.find_by_id(request_id)
    if not request_doc:
        raise not_found_error("Help request")

    gridfs = get_gridfs()
    storage = GridFSStorageProvider(gridfs)

    uploaded = []
    for f in files:
        # Validate file size
        content = await f.read()
        if len(content) > settings.max_file_size_bytes:
            raise validation_error(f"File '{f.filename}' exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB.")

        # Validate MIME type
        content_type = f.content_type or "application/octet-stream"
        if content_type not in settings.allowed_file_types_list:
            raise validation_error(f"File type '{content_type}' is not allowed.")

        storage_id = await storage.store(
            filename=f.filename or "document",
            content=content,
            content_type=content_type,
            metadata={"request_id": request_id},
        )

        # Store metadata
        doc_record = {
            "request_id": request_id,
            "original_filename": f.filename,
            "content_type": content_type,
            "size_bytes": len(content),
            "storage_id": storage_id,
            "category": None,
        }
        from app.repositories.base import BaseRepository
        base_repo = BaseRepository(db, "request_documents")
        doc_id = await base_repo.insert_one(doc_record)

        # Add doc ID reference to request
        from bson import ObjectId
        await db.help_requests.update_one(
            {"_id": ObjectId(request_id)},
            {"$push": {"document_ids": doc_id}},
        )

        uploaded.append({"doc_id": doc_id, "filename": f.filename})

    return {"uploaded": uploaded, "count": len(uploaded)}


# ── Admin: List requests ───────────────────────────────────────────────────────

@router.get("/admin", response_model=HelpRequestListResponse)
async def admin_list_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    urgency: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("requests.read")),
):
    """Admin: paginated, filtered, searchable request list."""
    repo = HelpRequestRepository(db)
    skip = (page - 1) * page_size
    docs = await repo.find_admin_list(
        status=status, urgency=urgency, search=search, skip=skip, limit=page_size
    )
    total = await repo.count({} if not status else {"status": status})

    from app.models.request import HelpRequestOut
    requests_out = [HelpRequestOut(**_doc_to_out(d)) for d in docs]
    return HelpRequestListResponse(
        requests=requests_out, total=total, page=page, page_size=page_size
    )


@router.get("/admin/stats")
async def admin_request_stats(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("requests.read")),
):
    """Admin: request counts by status (dashboard)."""
    repo = HelpRequestRepository(db)
    counts = await repo.count_by_status()
    total = sum(counts.values())
    return {"total": total, "by_status": counts}


@router.get("/admin/{request_id}")
async def admin_get_request(
    request_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("requests.read")),
):
    """Admin: full request detail including applicant info."""
    repo = HelpRequestRepository(db)
    doc = await repo.find_by_id(request_id)
    if not doc:
        raise not_found_error("Help request")

    # Count documents
    doc_count = await db.request_documents.count_documents({"request_id": request_id})
    doc["document_count"] = doc_count
    return doc


@router.patch("/admin/{request_id}/status")
async def admin_update_status(
    request_id: str,
    payload: StatusUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("requests.update_status")),
):
    """Admin: change request status with optional note."""
    repo = HelpRequestRepository(db)
    audit = AuditRepository(db)
    service = RequestService(repo, audit, db)

    updated = await service.update_status(
        request_id=request_id,
        new_status=payload.status,
        admin_note=payload.admin_note,
        actor_id=current_user["id"],
        actor_email=current_user["email"],
    )

    # Notify applicant if email exists
    applicant_email = updated.get("applicant", {}).get("email")
    if applicant_email and settings.RESEND_API_KEY:
        email_svc = _get_email_service(db)
        await email_svc.send_status_change_notification(
            to=applicant_email,
            applicant_name=updated.get("applicant", {}).get("full_name", ""),
            reference=updated["reference"],
            new_status=payload.status,
            admin_note=payload.admin_note,
        )

    return {"message": f"Status updated to '{payload.status}'.", "reference": updated["reference"]}


@router.get("/admin/{request_id}/documents")
async def admin_list_documents(
    request_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("requests.view_documents")),
):
    """Admin: list documents for a request."""
    repo = HelpRequestRepository(db)
    if not await repo.find_by_id(request_id):
        raise not_found_error("Help request")

    from app.repositories.base import _to_str_id
    cursor = db.request_documents.find({"request_id": request_id})
    docs = [_to_str_id(d) async for d in cursor]
    # Remove storage_id from response (opaque)
    for d in docs:
        d.pop("storage_id", None)
    return docs


@router.get("/admin/{request_id}/documents/{doc_id}/download")
async def admin_download_document(
    request_id: str,
    doc_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("requests.view_documents")),
):
    """Admin: authorized document download."""
    from app.repositories.base import BaseRepository, _to_str_id
    base_repo = BaseRepository(db, "request_documents")
    doc_meta = await base_repo.find_by_id(doc_id)
    if not doc_meta or doc_meta.get("request_id") != request_id:
        raise not_found_error("Document")

    audit = AuditRepository(db)
    await audit.log(AuditLogCreate(
        actor_id=current_user["id"],
        actor_email=current_user["email"],
        action=AuditAction.REQUEST_DOCUMENT_ACCESSED,
        resource_type="request_document",
        resource_id=doc_id,
        metadata={"request_id": request_id},
    ))

    gridfs = get_gridfs()
    storage = GridFSStorageProvider(gridfs)
    content, content_type = await storage.retrieve(doc_meta["storage_id"])

    return StreamingResponse(
        io.BytesIO(content),
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{doc_meta.get("original_filename", "document")}"'
        },
    )
