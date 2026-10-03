"""
Swan Turbines Foundation — Application Configuration
Loaded from environment variables via pydantic-settings.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List


from pathlib import Path

_backend_env = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_backend_env) if _backend_env.exists() else ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_ENV: str = "development"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "swanfoundation_dev"

    # Security
    SECRET_KEY: str = "change-this-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # CORS — parsed from comma-separated string
    CORS_ORIGINS: str = (
        "http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:8000,http://127.0.0.1:8000,https://swanturbinesfoundation.com,"
        "https://admin.swanturbinesfoundation.com,https://manage.swanturbinesfoundation.com"
    )

    # Email
    RESEND_API_KEY: str = ""
    RESEND_FROM: str = "onboarding@resend.dev"
    ADMIN_NOTIFICATION_EMAIL: str = "aruna@swanturbinesfoundation.com"

    # Frontend URLs
    PUBLIC_FRONTEND_URL: str = "http://localhost:3000"
    ADMIN_FRONTEND_URL: str = "http://localhost:3000/admin"
    MANAGE_FRONTEND_URL: str = "http://localhost:3000/manage"

    # File uploads
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_FILE_TYPES: str = (
        "application/pdf,image/jpeg,image/png,image/webp,image/gif"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def allowed_file_types_list(self) -> List[str]:
        return [t.strip() for t in self.ALLOWED_FILE_TYPES.split(",") if t.strip()]

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
