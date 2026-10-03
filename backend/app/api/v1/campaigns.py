"""
Campaign API routes.

Public:
  GET /api/v1/campaigns              — list active campaigns
  GET /api/v1/campaigns/featured     — featured campaigns for homepage
  GET /api/v1/campaigns/{slug}       — single campaign detail

Admin (requires auth + permission):
  GET    /api/v1/campaigns/admin     — all campaigns with filters
  POST   /api/v1/campaigns           — create campaign
  PUT    /api/v1/campaigns/{id}      — update campaign
  PATCH  /api/v1/campaigns/{id}/status — change status
  DELETE /api/v1/campaigns/{id}      — delete campaign
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.core.dependencies import require_permission, get_current_user
from app.core.errors import not_found_error, conflict_error, validation_error
from app.models.campaign import (
    CampaignCreate, CampaignUpdate, CampaignOut, CampaignListResponse, CampaignStatus
)
from app.models.audit import AuditLogCreate, AuditAction
from app.repositories.campaign_repository import CampaignRepository
from app.repositories.audit_repository import AuditRepository

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/campaigns", tags=["campaigns"])


def _doc_to_out(doc: dict) -> CampaignOut:
    return CampaignOut(
        id=doc["id"],
        title=doc["title"],
        slug=doc["slug"],
        short_description=doc.get("short_description", ""),
        description=doc.get("description", ""),
        status=doc["status"],
        category=doc.get("category", ""),
        featured=doc.get("featured", False),
        display_order=doc.get("display_order", 0),
        target_amount=doc.get("target_amount"),
        raised_amount=doc.get("raised_amount"),
        currency=doc.get("currency", "INR"),
        image_url=doc.get("image_url"),
        facts=doc.get("facts"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


# ── Public routes ─────────────────────────────────────────────────────────────

@router.get("", response_model=CampaignListResponse)
async def list_campaigns(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List all active campaigns (public)."""
    repo = CampaignRepository(db)
    skip = (page - 1) * page_size
    docs = await repo.find_active(skip=skip, limit=page_size)
    total = await repo.count({"status": "active"})
    return CampaignListResponse(
        campaigns=[_doc_to_out(d) for d in docs],
        total=total, page=page, page_size=page_size,
    )


@router.get("/featured", response_model=list)
async def list_featured_campaigns(
    limit: int = Query(3, ge=1, le=10),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Featured campaigns for the homepage (public)."""
    repo = CampaignRepository(db)
    docs = await repo.find_featured(limit=limit)
    return [_doc_to_out(d).model_dump() for d in docs]


@router.get("/{slug}", response_model=CampaignOut)
async def get_campaign(slug: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get a single campaign by slug (public)."""
    repo = CampaignRepository(db)
    doc = await repo.find_by_slug(slug)
    if not doc or doc["status"] == CampaignStatus.DRAFT:
        raise not_found_error("Campaign")
    return _doc_to_out(doc)


# ── Admin routes ──────────────────────────────────────────────────────────────

@router.get("/admin/all", response_model=CampaignListResponse)
async def admin_list_campaigns(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("campaigns.read")),
):
    """Admin: list all campaigns with optional status filter."""
    repo = CampaignRepository(db)
    filter = {}
    if status:
        filter["status"] = status
    skip = (page - 1) * page_size
    docs = await repo.find_all_paged(filter, [("created_at", -1)], skip, page_size)
    total = await repo.count(filter)
    return CampaignListResponse(
        campaigns=[_doc_to_out(d) for d in docs],
        total=total, page=page, page_size=page_size,
    )


@router.post("", response_model=CampaignOut, status_code=201)
async def create_campaign(
    payload: CampaignCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("campaigns.create")),
):
    """Admin: create a new campaign."""
    repo = CampaignRepository(db)
    audit = AuditRepository(db)

    if await repo.slug_exists(payload.slug):
        raise conflict_error(f"A campaign with slug '{payload.slug}' already exists.")

    if payload.status not in CampaignStatus.ALL:
        raise validation_error(f"Invalid status. Must be one of: {CampaignStatus.ALL}")

    campaign_id = await repo.insert_one(payload.model_dump())
    await audit.log(AuditLogCreate(
        actor_id=current_user["id"],
        actor_email=current_user["email"],
        action=AuditAction.CAMPAIGN_CREATED,
        resource_type="campaign",
        resource_id=campaign_id,
        metadata={"slug": payload.slug, "title": payload.title},
    ))
    doc = await repo.find_by_id(campaign_id)
    return _doc_to_out(doc)


@router.put("/{campaign_id}", response_model=CampaignOut)
async def update_campaign(
    campaign_id: str,
    payload: CampaignUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("campaigns.update")),
):
    """Admin: update a campaign."""
    repo = CampaignRepository(db)
    audit = AuditRepository(db)

    existing = await repo.find_by_id(campaign_id)
    if not existing:
        raise not_found_error("Campaign")

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        return _doc_to_out(existing)

    await repo.update_by_id(campaign_id, update_data)
    await audit.log(AuditLogCreate(
        actor_id=current_user["id"],
        actor_email=current_user["email"],
        action=AuditAction.CAMPAIGN_UPDATED,
        resource_type="campaign",
        resource_id=campaign_id,
        metadata={"changes": list(update_data.keys())},
    ))
    return _doc_to_out(await repo.find_by_id(campaign_id))


@router.patch("/{campaign_id}/status")
async def change_campaign_status(
    campaign_id: str,
    status: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("campaigns.update")),
):
    """Admin: change campaign status."""
    if status not in CampaignStatus.ALL:
        raise validation_error(f"Invalid status. Must be one of: {CampaignStatus.ALL}")

    repo = CampaignRepository(db)
    audit = AuditRepository(db)

    existing = await repo.find_by_id(campaign_id)
    if not existing:
        raise not_found_error("Campaign")

    await repo.update_by_id(campaign_id, {"status": status})
    await audit.log(AuditLogCreate(
        actor_id=current_user["id"],
        actor_email=current_user["email"],
        action=AuditAction.CAMPAIGN_STATUS_CHANGED,
        resource_type="campaign",
        resource_id=campaign_id,
        metadata={"from": existing["status"], "to": status},
    ))
    return {"message": f"Campaign status updated to '{status}'."}


@router.delete("/{campaign_id}", status_code=204)
async def delete_campaign(
    campaign_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("campaigns.delete")),
):
    """Admin: delete a campaign."""
    repo = CampaignRepository(db)
    audit = AuditRepository(db)

    existing = await repo.find_by_id(campaign_id)
    if not existing:
        raise not_found_error("Campaign")

    await repo.delete_by_id(campaign_id)
    await audit.log(AuditLogCreate(
        actor_id=current_user["id"],
        actor_email=current_user["email"],
        action=AuditAction.CAMPAIGN_DELETED,
        resource_type="campaign",
        resource_id=campaign_id,
        metadata={"slug": existing.get("slug"), "title": existing.get("title")},
    ))
