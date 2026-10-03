from app.core.config import get_settings
from app.core.database import get_db, get_gridfs
from app.core.security import decode_access_token
from app.core.errors import auth_error, forbidden_error

from fastapi import Cookie, Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
import logging

logger = logging.getLogger(__name__)


async def get_current_user(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    """
    Dependency: extracts and validates the JWT from the request cookie.
    Returns the user document from the database.
    Raises 401 if the token is missing or invalid.
    """
    token: Optional[str] = request.cookies.get("access_token")
    if not token:
        raise auth_error()

    try:
        payload = decode_access_token(token)
        user_id: Optional[str] = payload.get("sub")
        if not user_id:
            raise auth_error()
    except Exception:
        raise auth_error("Session expired or invalid. Please log in again.")

    from bson import ObjectId
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id), "is_active": True})
    except Exception:
        raise auth_error()

    if not user:
        raise auth_error("User account not found or inactive.")

    return user


def require_permission(permission: str):
    """
    Returns a dependency that checks if the current user has the given permission.
    Permissions are stored in the user's roles.
    """
    async def checker(
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_db),
    ) -> dict:
        # Collect all permission names from user's roles
        role_ids = current_user.get("role_ids", [])
        if not role_ids:
            raise forbidden_error()

        perms = set()
        async for role in db.roles.find({"_id": {"$in": role_ids}}):
            for p in role.get("permissions", []):
                perms.add(p)

        resource = permission.split(".")[0] if "." in permission else permission
        has_perm = (
            "*" in perms
            or permission in perms
            or f"{resource}.*" in perms
            or f"{resource}.manage" in perms
        )

        if not has_perm:
            raise forbidden_error()

        return current_user

    return checker
