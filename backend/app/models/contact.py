"""
Contact submission Pydantic models.
"""
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class ContactCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=80)
    last_name: str = Field(..., min_length=1, max_length=80)
    email: EmailStr
    message: str = Field(..., min_length=10, max_length=2000)


class ContactOut(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    message: str
    created_at: datetime
