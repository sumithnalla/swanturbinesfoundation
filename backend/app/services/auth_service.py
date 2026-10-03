"""
Authentication service — login, logout, password management.
Business logic only — provider-agnostic.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from app.core.security import hash_password, verify_password, create_access_token
from app.core.errors import auth_error, conflict_error
from app.models.audit import AuditLogCreate, AuditAction
from app.repositories.user_repository import UserRepository
from app.repositories.audit_repository import AuditRepository

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(
        self,
        user_repo: UserRepository,
        audit_repo: AuditRepository,
    ):
        self._users = user_repo
        self._audit = audit_repo

    async def login(
        self,
        email: str,
        password: str,
        ip: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> tuple[str, dict]:
        """
        Authenticate a user. Returns (access_token, user_doc).
        Raises HTTPException on failure.
        """
        user = await self._users.find_by_email(email)

        # Generic error for both missing user and wrong password
        _generic_fail = auth_error("Invalid email or password.")

        if not user:
            await self._audit.log(AuditLogCreate(
                action=AuditAction.LOGIN_FAILED,
                result="failure",
                metadata={"email": email, "reason": "user_not_found"},
                ip_address=ip, user_agent=user_agent,
            ))
            raise _generic_fail

        # Check account lock
        locked_until = user.get("locked_until")
        if locked_until:
            if isinstance(locked_until, str):
                locked_until = datetime.fromisoformat(locked_until)
            if locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) < locked_until:
                raise auth_error("Account locked due to too many failed attempts. Try again later.")

        if not user.get("is_active", False):
            raise auth_error("Account is inactive.")

        pwd_hash = user.get("password_hash") or user.get("hashed_password") or ""
        if not verify_password(password, pwd_hash):
            await self._users.increment_failed_login(user["id"])
            await self._audit.log(AuditLogCreate(
                actor_id=user["id"],
                actor_email=email,
                action=AuditAction.LOGIN_FAILED,
                result="failure",
                metadata={"reason": "wrong_password"},
                ip_address=ip, user_agent=user_agent,
            ))
            raise _generic_fail

        # Success
        await self._users.reset_failed_login(user["id"])
        token = create_access_token(user["id"])

        await self._audit.log(AuditLogCreate(
            actor_id=user["id"],
            actor_email=email,
            action=AuditAction.LOGIN_SUCCESS,
            result="success",
            ip_address=ip, user_agent=user_agent,
        ))

        logger.info("User logged in: %s", email)
        return token, user

    async def create_user(
        self,
        full_name: str,
        email: str,
        password: str,
        role_ids: list,
        actor_id: Optional[str] = None,
    ) -> str:
        """Create a new admin user. Returns new user ID."""
        existing = await self._users.find_by_email(email)
        if existing:
            raise conflict_error("A user with this email already exists.")

        hashed = hash_password(password)
        user_id = await self._users.create_user(full_name, email, hashed, role_ids)

        await self._audit.log(AuditLogCreate(
            actor_id=actor_id,
            action=AuditAction.USER_CREATED,
            resource_type="user",
            resource_id=user_id,
            metadata={"email": email, "full_name": full_name},
        ))

        return user_id
