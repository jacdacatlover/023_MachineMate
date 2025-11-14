"""
Pytest configuration and shared fixtures for backend tests.

This module provides common test fixtures including:
- Test database sessions
- Test HTTP client
- Mock authentication
- Test data factories
"""

import json
import sqlite3
import uuid
from typing import AsyncGenerator
from unittest.mock import AsyncMock, Mock, patch

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy import JSON, text
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.schema import ColumnDefault, DefaultClause
from sqlalchemy.sql.elements import TextClause
from sqlalchemy.sql.sqltypes import ARRAY as SQL_ARRAY

from app.auth import User, get_current_user
from app.db import Base, get_db
from app.main import app


# Allow PostgreSQL-specific JSONB columns to compile against SQLite during tests
@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(element, compiler, **kw):
    return "JSON"


@compiles(PG_ARRAY, "sqlite")
@compiles(SQL_ARRAY, "sqlite")
def compile_array_sqlite(element, compiler, **kw):
    return "TEXT"


@compiles(PG_UUID, "sqlite")
def compile_uuid_sqlite(element, compiler, **kw):
    return "TEXT"


def _register_sqlite_adapters():
    """
    Ensure sqlite3 can serialize Python lists/dicts when binding parameters.
    """
    if getattr(sqlite3, "_machinemate_adapters_registered", False):
        return

    sqlite3.register_adapter(list, lambda value: json.dumps(value))
    sqlite3.register_adapter(dict, lambda value: json.dumps(value))
    sqlite3._machinemate_adapters_registered = True


def _patch_sqlite_defaults():
    """
    Replace PostgreSQL-specific server defaults with SQLite-friendly ones during tests.
    """
    replacements = []
    python_default_overrides = []
    for table in Base.metadata.tables.values():
        for column in table.columns:
            default = column.server_default
            if not default or not isinstance(default.arg, TextClause):
                continue

            clause_text = getattr(default.arg, "text", str(default.arg))
            new_clause = clause_text

            if "::jsonb" in clause_text:
                new_clause = clause_text.replace("::jsonb", "")

            if "now()" in clause_text.lower():
                new_clause = clause_text.replace("now()", "CURRENT_TIMESTAMP")

            if "gen_random_uuid()" in clause_text.lower():
                replacements.append((column, default))
                python_default_overrides.append((column, column.default))
                column.server_default = None
                column.default = ColumnDefault(lambda: uuid.uuid4())
                continue

            if new_clause != clause_text:
                column.server_default = DefaultClause(text(new_clause))
                replacements.append((column, default))

    return replacements, python_default_overrides


def _patch_sqlite_array_types():
    """
    Temporarily replace PostgreSQL ARRAY columns with JSON for SQLite compatibility.
    """
    replacements = []
    for table in Base.metadata.tables.values():
        for column in table.columns:
            if isinstance(column.type, (PG_ARRAY, SQL_ARRAY)):
                replacements.append((column, column.type))
                column.type = JSON()
    return replacements


# ============================================================================
# Database Fixtures
# ============================================================================


@pytest_asyncio.fixture
async def test_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Provide a test database session using SQLite in-memory.

    Each test gets a fresh database with tables created.
    The session is rolled back after each test.
    """
    # Use SQLite in-memory for tests
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )

    default_replacements = []
    python_default_overrides = []
    type_replacements = []

    # Create tables with SQLite-friendly defaults
    if engine.url.get_backend_name() == "sqlite":
        _register_sqlite_adapters()
        default_replacements, python_default_overrides = _patch_sqlite_defaults()
        type_replacements = _patch_sqlite_array_types()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    AsyncSessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    try:
        async with AsyncSessionLocal() as session:
            yield session
            await session.rollback()
    finally:
        # Restore original defaults and types
        for column, original_default in default_replacements:
            column.server_default = original_default

        for column, original_default in python_default_overrides:
            column.default = original_default

        for column, original_type in type_replacements:
            column.type = original_type

        # Cleanup
        await engine.dispose()


@pytest.fixture
def override_get_db(test_db: AsyncSession):
    """
    Override the get_db dependency with test database.
    """
    async def _get_test_db():
        yield test_db

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()


# ============================================================================
# Authentication Fixtures
# ============================================================================


@pytest.fixture
def mock_user() -> User:
    """
    Provide a mock authenticated user for tests.
    """
    return User(
        id="550e8400-e29b-41d4-a716-446655440000",
        email="test@example.com",
        aud="authenticated",
        role="authenticated",
        metadata={},
    )


@pytest.fixture
def mock_admin_user() -> User:
    """
    Provide a mock admin user for tests.
    """
    return User(
        id="660e8400-e29b-41d4-a716-446655440001",
        email="admin@example.com",
        aud="authenticated",
        role="admin",
        metadata={},
    )


@pytest.fixture
def override_get_current_user(mock_user: User):
    """
    Override the get_current_user dependency with mock user.
    """
    async def _get_mock_user():
        return mock_user

    app.dependency_overrides[get_current_user] = _get_mock_user
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def override_get_current_user_admin(mock_admin_user: User):
    """
    Override the get_current_user dependency with mock admin user.
    """
    async def _get_mock_admin():
        return mock_admin_user

    app.dependency_overrides[get_current_user] = _get_mock_admin
    yield
    app.dependency_overrides.clear()


# ============================================================================
# HTTP Client Fixtures
# ============================================================================


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """
    Provide an async HTTP client for testing endpoints.
    """
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def client() -> TestClient:
    """
    Provide a synchronous test client for simple endpoint tests.
    """
    return TestClient(app)


# ============================================================================
# Test Data Fixtures
# ============================================================================


@pytest.fixture
def sample_machine_data():
    """
    Provide sample machine data for tests.
    """
    return {
        "id": "test-machine-1",
        "name": "Leg Press",
        "category": "legs",
        "difficulty": "beginner",
        "primary_muscles": ["quadriceps"],
        "secondary_muscles": ["glutes"],
        "equipment_type": "machine",
        "setup_steps": ["Adjust seat", "Set weight"],
        "how_to_steps": ["Press the platform", "Control return"],
        "common_mistakes": ["Locking knees"],
        "safety_tips": ["Use spotter"],
        "beginner_tips": ["Start light"],
        "image_url": "https://example.com/leg-press.jpg",
        "thumbnail_url": "https://example.com/leg-press-thumb.jpg",
        "video_url": None,
        "muscle_diagram_url": None,
        "tags": ["strength", "legs"],
        "meta": {"description": "Build leg strength"},
        "is_active": True,
    }


@pytest.fixture
def sample_favorite_data():
    """
    Provide sample favorite data for tests.
    """
    return {
        "machine_id": "test-machine-1",
        "notes": "My favorite machine",
    }


@pytest.fixture
def sample_history_data():
    """
    Provide sample history data for tests.
    """
    return {
        "machine_id": "test-machine-1",
        "confidence": 0.95,
        "source": "camera",
        "photo_uri": "file:///path/to/photo.jpg",
    }


# ============================================================================
# Mock External Services
# ============================================================================


@pytest.fixture
def mock_supabase():
    """
    Mock Supabase client for tests.
    """
    mock_client = Mock()
    mock_client.auth.get_session = AsyncMock(return_value=(None, None))
    return mock_client


@pytest.fixture
def mock_fireworks_client():
    """
    Mock Fireworks AI client for VLM tests.
    """
    mock_client = Mock()
    mock_client.generate = AsyncMock(return_value={
        "machine_id": "test-machine-1",
        "confidence": 0.95,
    })
    return mock_client
