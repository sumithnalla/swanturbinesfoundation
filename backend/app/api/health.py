"""
Health check endpoint.
GET /health — returns application status without exposing secrets.
"""
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/health")
async def health_check(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Health check endpoint.
    Verifies the application is running and the database is reachable.
    Does not expose secrets or internal configuration.
    """
    try:
        await db.command("ping")
        db_status = "ok"
    except Exception:
        db_status = "error"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "database": db_status,
    }
