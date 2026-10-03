"""
MongoDB database connection and access helpers.
Uses motor for async operations.
"""
import logging
from typing import Optional

from motor.motor_asyncio import (
    AsyncIOMotorClient,
    AsyncIOMotorDatabase,
    AsyncIOMotorGridFSBucket,
)

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Module-level client and db references (set during startup)
_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None
_gridfs: Optional[AsyncIOMotorGridFSBucket] = None


async def connect_db() -> None:
    """Open the MongoDB connection. Called on application startup."""
    global _client, _db, _gridfs
    logger.info("Connecting to MongoDB: %s / %s", settings.MONGODB_URI, settings.DATABASE_NAME)
    _client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
    _db = _client[settings.DATABASE_NAME]
    _gridfs = AsyncIOMotorGridFSBucket(_db, bucket_name="request_documents")
    try:
        # Verify connection
        await _client.admin.command("ping")
        logger.info("MongoDB connected successfully.")
        await _ensure_indexes()
    except Exception as e:
        logger.warning("MongoDB connection check failed on startup (%s). App starting in degraded mode.", e)


async def disconnect_db() -> None:
    """Close the MongoDB connection. Called on application shutdown."""
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed.")


def get_db() -> AsyncIOMotorDatabase:
    """Return the active database instance."""
    global _client, _db, _gridfs
    if _db is None:
        _client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
        _db = _client[settings.DATABASE_NAME]
        _gridfs = AsyncIOMotorGridFSBucket(_db, bucket_name="request_documents")
    return _db


def get_gridfs() -> AsyncIOMotorGridFSBucket:
    """Return the GridFS bucket for request documents."""
    global _client, _db, _gridfs
    if _gridfs is None:
        _client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
        _db = _client[settings.DATABASE_NAME]
        _gridfs = AsyncIOMotorGridFSBucket(_db, bucket_name="request_documents")
    return _gridfs


async def _ensure_indexes() -> None:
    """Create required indexes on startup. Idempotent."""
    db = get_db()

    # users
    await db.users.create_index("email", unique=True)
    await db.users.create_index("created_at")

    # roles
    await db.roles.create_index("name", unique=True)

    # campaigns
    await db.campaigns.create_index("slug", unique=True)
    await db.campaigns.create_index("status")
    await db.campaigns.create_index([("status", 1), ("display_order", 1)])
    await db.campaigns.create_index("featured")

    # help_requests
    await db.help_requests.create_index("reference", unique=True)
    await db.help_requests.create_index("status")
    await db.help_requests.create_index("created_at")
    await db.help_requests.create_index([("status", 1), ("urgency", 1)])

    # request_documents
    await db.request_documents.create_index("request_id")

    # contact_submissions
    await db.contact_submissions.create_index("created_at")

    # audit_logs
    await db.audit_logs.create_index("created_at")
    await db.audit_logs.create_index("actor_id")
    await db.audit_logs.create_index("action")

    # counters (for request reference generation)
    await db.counters.create_index("name", unique=True)

    logger.info("Database indexes ensured.")
