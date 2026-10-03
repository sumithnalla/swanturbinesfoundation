"""
Audit log Pydantic models.
"""
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class AuditAction:
    # Auth
    LOGIN_SUCCESS = "login.success"
    LOGIN_FAILED = "login.failed"
    LOGOUT = "logout"
    PASSWORD_CHANGED = "account.password_changed"
    # Campaigns
    CAMPAIGN_CREATED = "campaign.created"
    CAMPAIGN_UPDATED = "campaign.updated"
    CAMPAIGN_DELETED = "campaign.deleted"
    CAMPAIGN_STATUS_CHANGED = "campaign.status_changed"
    # Requests
    REQUEST_SUBMITTED = "request.submitted"
    REQUEST_STATUS_CHANGED = "request.status_changed"
    REQUEST_NOTE_UPDATED = "request.note_updated"
    REQUEST_DOCUMENT_ACCESSED = "request.document_accessed"
    # Users
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    USER_DISABLED = "user.disabled"
    USER_ENABLED = "user.enabled"
    # Email
    EMAIL_SENT = "email.sent"
    EMAIL_FAILED = "email.failed"
    # Contact
    CONTACT_SUBMITTED = "contact.submitted"


class AuditLogCreate(BaseModel):
    actor_id: Optional[str] = None
    actor_email: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    result: str = "success"  # success | failure
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Optional[dict] = None


class AuditLogOut(BaseModel):
    id: str
    actor_id: Optional[str]
    actor_email: Optional[str]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    result: str
    ip_address: Optional[str]
    created_at: datetime
