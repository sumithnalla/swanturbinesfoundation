"""
Campaign Pydantic models.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class CampaignStatus:
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"

    ALL = [DRAFT, ACTIVE, PAUSED, COMPLETED]


class CampaignCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    slug: str = Field(..., min_length=2, max_length=120, pattern=r"^[a-z0-9-]+$")
    short_description: str = Field(..., max_length=300)
    description: str = Field(..., min_length=10)
    status: str = Field(default=CampaignStatus.DRAFT)
    category: str = Field(..., max_length=80)
    featured: bool = False
    display_order: int = 0
    # Financial (optional — mark as uncertain until confirmed)
    target_amount: Optional[float] = None
    raised_amount: Optional[float] = None
    currency: Optional[str] = "INR"
    # Media
    image_url: Optional[str] = None
    # Additional facts for detail page
    facts: Optional[List[dict]] = None


class CampaignUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    short_description: Optional[str] = Field(None, max_length=300)
    description: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None
    featured: Optional[bool] = None
    display_order: Optional[int] = None
    target_amount: Optional[float] = None
    raised_amount: Optional[float] = None
    image_url: Optional[str] = None
    facts: Optional[List[dict]] = None


class CampaignOut(BaseModel):
    id: str
    title: str
    slug: str
    short_description: str
    description: str
    status: str
    category: str
    featured: bool
    display_order: int
    target_amount: Optional[float]
    raised_amount: Optional[float]
    currency: Optional[str]
    image_url: Optional[str]
    facts: Optional[List[dict]]
    created_at: datetime
    updated_at: datetime

    model_config = {"populate_by_name": True}


class CampaignListResponse(BaseModel):
    campaigns: List[CampaignOut]
    total: int
    page: int
    page_size: int
