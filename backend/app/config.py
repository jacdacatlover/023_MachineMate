from __future__ import annotations

import json
import logging
from functools import lru_cache
from typing import List, Optional, Sequence

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


logger = logging.getLogger("machinemate.config")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_FILES = tuple(
    str(path)
    for path in (
        PROJECT_ROOT / ".env",
        PROJECT_ROOT / "backend" / ".env",
    )
    if path.exists()
)


def _load_default_machine_options() -> List[str]:
    fallback = [
        "Chest Press Machine",
        "Lat Pulldown",
        "Seated Cable Row",
        "Seated Leg Press",
        "Shoulder Press Machine",
        "Treadmill",
    ]

    try:
        machines_path = PROJECT_ROOT / "src" / "data" / "machines.json"
        data = json.loads(machines_path.read_text(encoding="utf-8"))
        names = [str(item["name"]).strip() for item in data if item.get("name")]
        unique_names = list(dict.fromkeys(name for name in names if name))
        if unique_names:
            return unique_names
        logger.warning("No machine names extracted from %s; falling back to defaults.", machines_path)
    except Exception as exc:
        logger.warning("Failed to load machine options from machines.json: %s", exc)

    return fallback


def _load_machines_catalog() -> List[dict]:
    """Load the full machines catalog including metadata for prompt building"""
    try:
        machines_path = PROJECT_ROOT / "src" / "data" / "machines.json"
        data = json.loads(machines_path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return data
        logger.warning("Machines catalog is not a list: %s", type(data))
    except Exception as exc:
        logger.warning("Failed to load machines catalog from machines.json: %s", exc)

    return []


DEFAULT_MACHINE_OPTIONS = _load_default_machine_options()
MACHINES_CATALOG = _load_machines_catalog()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="machinemate_",
        env_file=ENV_FILES or None,
        extra="ignore",
    )

    # Legacy VLM configuration (machinemate_ prefix)
    api_machine_options: List[str] = DEFAULT_MACHINE_OPTIONS
    vlm_api_base_url: Optional[str] = None
    vlm_api_key: Optional[str] = None
    vlm_model: Optional[str] = None
    vlm_request_timeout: float = 20.0
    enable_mock_responses: bool = True

    # Prompt Engineering Configuration (machinemate_ prefix)
    prompt_variant: str = "enhanced_baseline"  # Options: enhanced_baseline, few_shot, chain_of_thought
    enable_prompt_metadata: bool = True  # Include visual metadata in prompts
    prompt_ab_testing_enabled: bool = False  # Enable random A/B testing of variants

    # Database configuration (no prefix - uses Field alias to bypass env_prefix)
    DATABASE_URL: Optional[str] = Field(default=None, validation_alias="DATABASE_URL")

    # Supabase JWT configuration (no prefix)
    SUPABASE_JWT_AUDIENCE: str = Field(default="authenticated", validation_alias="SUPABASE_JWT_AUDIENCE")
    SUPABASE_JWT_ISSUER: Optional[str] = Field(default=None, validation_alias="SUPABASE_JWT_ISSUER")
    SUPABASE_JWT_JWKS_URL: Optional[str] = Field(default=None, validation_alias="SUPABASE_JWT_JWKS_URL")
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = Field(default=None, validation_alias="SUPABASE_SERVICE_ROLE_KEY")

    # AI/ML configuration (no prefix)
    FIREWORKS_API_KEY: Optional[str] = Field(default=None, validation_alias="FIREWORKS_API_KEY")

    # Media & Storage configuration (no prefix)
    MEDIA_PUBLIC_BASE_URL: Optional[str] = Field(default=None, validation_alias="MEDIA_PUBLIC_BASE_URL")
    STORAGE_BUCKET_MACHINES: str = Field(default="machines", validation_alias="STORAGE_BUCKET_MACHINES")
    STORAGE_BUCKET_TUTORIALS: str = Field(default="tutorials", validation_alias="STORAGE_BUCKET_TUTORIALS")
    STORAGE_BUCKET_USER_UPLOADS: str = Field(default="user-uploads", validation_alias="STORAGE_BUCKET_USER_UPLOADS")

    # Observability configuration (no prefix)
    SENTRY_DSN: Optional[str] = Field(default=None, validation_alias="SENTRY_DSN")
    SENTRY_ENVIRONMENT: str = Field(default="development", validation_alias="SENTRY_ENVIRONMENT")
    LOG_LEVEL: str = Field(default="INFO", validation_alias="LOG_LEVEL")
    LOG_FORMAT: str = Field(default="console", validation_alias="LOG_FORMAT")

    # Security configuration (no prefix)
    CORS_ORIGINS: str = Field(default="http://localhost:8081,exp://localhost:8081", validation_alias="CORS_ORIGINS")
    JWT_EXPIRATION: int = Field(default=3600, validation_alias="JWT_EXPIRATION")
    REQUIRE_AUTH: bool = Field(default=True, validation_alias="REQUIRE_AUTH")

    # Environment configuration (no prefix)
    ENVIRONMENT: str = Field(default="development", validation_alias="ENVIRONMENT")
    DEBUG: bool = Field(default=False, validation_alias="DEBUG")

    @field_validator("api_machine_options", mode="before")
    @classmethod
    def _split_machine_options(cls, value: Sequence[str] | str) -> List[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return list(value)

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: Sequence[str] | str) -> str:
        if isinstance(value, (list, tuple)):
            return ",".join(str(v) for v in value)
        return str(value)

    def get_cors_origins_list(self) -> List[str]:
        """Get CORS origins as a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Global settings instance for convenience
settings = get_settings()
