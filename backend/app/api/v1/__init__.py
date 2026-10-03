"""
API v1 router — aggregates all v1 route modules.
"""
from fastapi import APIRouter
from app.api.v1 import auth, campaigns, requests, contact, admin

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(campaigns.router)
router.include_router(requests.router)
router.include_router(contact.router)
router.include_router(admin.router)
