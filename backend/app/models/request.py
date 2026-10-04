"""
Help Request Pydantic models.
Three-step workflow: Applicant Info → Request Info → Documents.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class RequestStatus:
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

    ALL = [PENDING, UNDER_REVIEW, ACCEPTED, REJECTED]

    # Allowed transitions
    TRANSITIONS = {
        PENDING: [UNDER_REVIEW, ACCEPTED, REJECTED],
        UNDER_REVIEW: [ACCEPTED, REJECTED, PENDING],
        ACCEPTED: [],
        REJECTED: [],
    }

    @classmethod
    def can_transition(cls, from_status: str, to_status: str) -> bool:
        return to_status in cls.TRANSITIONS.get(from_status, [])


class RequestUrgency:
    NORMAL = "normal"
    URGENT = "urgent"
    EMERGENCY = "emergency"

    ALL = [NORMAL, URGENT, EMERGENCY]


class SupportType:
    MEDICAL = "medical"
    EDUCATION = "education"
    FOOD = "food"
    HOUSING = "housing"
    EMERGENCY = "emergency"
    COMMUNITY_DEVELOPMENT = "community_development"
    OTHER = "other"

    ALL = [MEDICAL, EDUCATION, FOOD, HOUSING, EMERGENCY, COMMUNITY_DEVELOPMENT, OTHER]


# ── Step 1: Applicant Information ─────────────────────────────────────────────

class ApplicantInfo(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    mobile: str = Field(..., min_length=8, max_length=25)
    email: Optional[str] = None
    address: str = Field(..., min_length=2, max_length=300)
    city: str = Field(..., min_length=2, max_length=80)
    state: str = Field(..., min_length=2, max_length=80)

    @field_validator("email", mode="before")
    @classmethod
    def clean_email(cls, v):
        if not v or not str(v).strip():
            return None
        return str(v).strip().lower()


# ── Step 2: Request Information ───────────────────────────────────────────────

class RequestInfo(BaseModel):
    support_type: str = Field(default="other")
    description: str = Field(..., min_length=5, max_length=2500)
    beneficiaries: int = Field(default=1, ge=1, le=10000)
    amount_required: str = Field(..., max_length=100)
    urgency: str = Field(default=RequestUrgency.NORMAL)

    @field_validator("support_type", mode="before")
    @classmethod
    def validate_support_type(cls, v):
        v_str = str(v).lower().strip() if v else "other"
        mapping = {
            "food or essential supplies": SupportType.FOOD,
            "medical care & surgeries": SupportType.MEDICAL,
            "education & schooling": SupportType.EDUCATION,
            "shelter & housing repair": SupportType.HOUSING,
            "water & community sanitation": SupportType.COMMUNITY_DEVELOPMENT,
            "disaster & emergency relief": SupportType.EMERGENCY,
        }
        v_clean = mapping.get(v_str, v_str)
        if v_clean in SupportType.ALL:
            return v_clean
        return SupportType.OTHER

    @field_validator("urgency", mode="before")
    @classmethod
    def validate_urgency(cls, v):
        v_str = str(v).lower().strip() if v else "normal"
        mapping = {
            "low": RequestUrgency.NORMAL,
            "medium": RequestUrgency.NORMAL,
            "high": RequestUrgency.URGENT,
            "critical": RequestUrgency.EMERGENCY,
        }
        v_clean = mapping.get(v_str, v_str)
        if v_clean in RequestUrgency.ALL:
            return v_clean
        return RequestUrgency.NORMAL



# ── Full submission ───────────────────────────────────────────────────────────

class HelpRequestCreate(BaseModel):
    applicant: ApplicantInfo
    request: RequestInfo
    consent: bool = Field(...)

    @field_validator("consent")
    @classmethod
    def must_consent(cls, v):
        if not v:
            raise ValueError("You must agree to the terms to submit a request.")
        return v


class StatusUpdateRequest(BaseModel):
    status: str
    admin_note: Optional[str] = Field(None, max_length=1500)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v not in RequestStatus.ALL:
            raise ValueError(f"status must be one of: {RequestStatus.ALL}")
        return v


class HelpRequestOut(BaseModel):
    id: str
    reference: str
    status: str
    support_type: str
    urgency: str
    applicant: Optional[ApplicantInfo] = None
    request: Optional[RequestInfo] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"populate_by_name": True}



class HelpRequestDetailOut(BaseModel):
    id: str
    reference: str
    applicant: ApplicantInfo
    request: RequestInfo
    status: str
    admin_note: Optional[str]
    document_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"populate_by_name": True}


class HelpRequestListResponse(BaseModel):
    requests: List[HelpRequestOut]
    total: int
    page: int
    page_size: int
