"""
Swan Turbines Foundation — FastAPI Application Entry Point
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.database import connect_db, disconnect_db
from app.core.logging import configure_logging
from app.api.health import router as health_router
from app.api.v1 import router as v1_router

settings = get_settings()
configure_logging("DEBUG" if settings.DEBUG else "INFO")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown."""
    logger.info("Starting Swan Turbines Foundation API (env=%s)", settings.APP_ENV)
    await connect_db()
    yield
    await disconnect_db()
    logger.info("Swan Turbines Foundation API shut down.")


app = FastAPI(
    title="Swan Turbines Foundation API",
    description="Backend API for Swan Turbines Foundation charity management platform.",
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ── Global exception handler ──────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all handler — never return stack traces to clients.
    Internal details are logged securely.
    """
    logger.exception("Unhandled exception: %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred.",
            }
        },
    )

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(health_router)
app.include_router(v1_router)

# ── Root ──────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "name": "Swan Turbines Foundation API",
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "status": "running",
    }
