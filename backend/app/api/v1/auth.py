"""
Authentication API routes.
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
"""
import logging
from fastapi import APIRouter, Depends, Request, Response
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import LoginRequest, LoginResponse, UserOut
from app.repositories.user_repository import UserRepository
from app.repositories.audit_repository import AuditRepository
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


from datetime import datetime, timezone


def _build_user_out(user: dict) -> UserOut:
    now = datetime.now(timezone.utc)
    return UserOut(
        id=str(user.get("id") or user.get("_id", "")),
        full_name=user.get("full_name", ""),
        email=user.get("email", ""),
        is_active=user.get("is_active", True),
        role_ids=[str(r) for r in user.get("role_ids", [])],
        created_at=user.get("created_at") or now,
        updated_at=user.get("updated_at") or now,
    )



@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Authenticate an admin user and set an HTTP-only session cookie."""
    user_repo = UserRepository(db)
    audit_repo = AuditRepository(db)
    service = AuthService(user_repo, audit_repo)

    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    token, user = await service.login(
        email=payload.email,
        password=payload.password,
        ip=ip,
        user_agent=user_agent,
    )

    # Set HTTP-only cookie — not accessible by JavaScript
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,  # True in production (HTTPS)
        samesite="lax",
        max_age=60 * 60 * 8,  # 8 hours
    )

    return LoginResponse(user=_build_user_out(user), access_token=token)


@router.post("/logout")
async def logout(response: Response):
    """Log out by clearing the session cookie."""
    response.delete_cookie(
        key="access_token",
        httponly=True,
        samesite="lax",
    )
    return {"message": "Logged out successfully."}


@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return _build_user_out(current_user)
