"""
Database configuration and session management for Supabase Postgres.

This module sets up async SQLAlchemy with asyncpg for connecting to
Supabase Postgres. It provides:
- Async engine and session factory
- Database models base class
- Connection lifecycle management
"""

from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
    AsyncEngine,
)
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Base class for SQLAlchemy models
Base = declarative_base()

# Global engine and session factory
_engine: Optional[AsyncEngine] = None
_async_session_factory: Optional[async_sessionmaker[AsyncSession]] = None


def get_engine() -> AsyncEngine:
    """
    Get or create the async database engine.

    Uses connection pooling for better performance. For serverless
    deployments (Cloud Run), consider using PgBouncer connection pooling
    from Supabase.

    Returns:
        AsyncEngine: The SQLAlchemy async engine
    """
    global _engine

    if _engine is None:
        database_url = settings.DATABASE_URL

        if not database_url:
            raise ValueError(
                "DATABASE_URL environment variable is not set. "
                "Please configure your Supabase connection string."
            )

        # Convert postgresql:// to postgresql+psycopg://
        # Using psycopg3 (async) which works better with Supabase PgBouncer
        if database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        elif not database_url.startswith("postgresql+psycopg://"):
            raise ValueError(
                f"Invalid DATABASE_URL format: {database_url}. "
                "Expected postgresql:// or postgresql+psycopg://"
            )

        # Create async engine with psycopg (async PostgreSQL driver)
        # For serverless: use NullPool to avoid connection pool overhead
        # psycopg works well with Supabase PgBouncer in transaction pooling mode
        _engine = create_async_engine(
            database_url,
            echo=settings.DEBUG,  # Log all SQL queries in debug mode
            poolclass=NullPool,  # Always use NullPool to prevent connection reuse issues
            pool_pre_ping=True,  # Verify connections before using them
        )

        logger.info(f"Database engine created for environment: {settings.ENVIRONMENT}")

    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """
    Get or create the async session factory.

    Returns:
        async_sessionmaker: Factory for creating database sessions
    """
    global _async_session_factory

    if _async_session_factory is None:
        engine = get_engine()
        _async_session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,  # Don't expire objects after commit
            autocommit=False,
            autoflush=False,
        )
        logger.info("Database session factory created")

    return _async_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency for getting a database session.

    Usage in FastAPI endpoints:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(Item))
            return result.scalars().all()

    Yields:
        AsyncSession: Database session
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """
    Initialize the database.

    For Supabase, we manage schema via SQL migrations in the Supabase
    dashboard or CLI. This function just verifies connectivity.

    In production, use Supabase migrations instead of SQLAlchemy's
    create_all() to maintain schema version control.
    """
    engine = get_engine()

    try:
        # Test connection
        async with engine.begin() as conn:
            logger.info("Database connection successful")

        # NOTE: Don't use Base.metadata.create_all() in production
        # Supabase migrations handle schema management
        # Uncomment below only for local development without Supabase
        # async with engine.begin() as conn:
        #     await conn.run_sync(Base.metadata.create_all)

    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise


async def close_db() -> None:
    """
    Close database connections.

    Call this during application shutdown to cleanly close all connections.
    """
    global _engine, _async_session_factory

    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _async_session_factory = None
        logger.info("Database connections closed")


# Optional: Create models here or in separate files
# Example model:
#
# from sqlalchemy import Column, String, DateTime, Numeric
# from sqlalchemy.dialects.postgresql import UUID
# import uuid
# from datetime import datetime
#
# class Favorite(Base):
#     __tablename__ = "favorites"
#
#     user_id = Column(UUID(as_uuid=True), primary_key=True)
#     machine_id = Column(String, primary_key=True)
#     created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
#
# class History(Base):
#     __tablename__ = "history"
#
#     id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
#     machine_id = Column(String, nullable=False)
#     confidence = Column(Numeric, nullable=True)
#     taken_at = Column(DateTime, default=datetime.utcnow, nullable=False)
