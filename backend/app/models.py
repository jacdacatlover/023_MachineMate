"""
SQLAlchemy ORM models for MachineMate database tables.

These models map to the Supabase Postgres schema created in migrations.
They enable type-safe database operations and relationship management.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    ARRAY,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db import Base


class User(Base):
    """
    User profile extending Supabase auth.users.

    Stores additional user information and preferences.
    References auth.users(id) via foreign key.
    """
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(Text, unique=True, nullable=False)
    display_name = Column(Text, nullable=True)
    avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    preferences = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    meta = Column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    # Relationships
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    history = relationship("History", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"


class Machine(Base):
    """
    Machine catalog with detailed information.

    Contains machine metadata, guidance content, and media references.
    Public read access with service-role only modifications.
    """
    __tablename__ = "machines"

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    category = Column(Text, nullable=False)
    difficulty = Column(Text, nullable=False, server_default=text("'beginner'"))
    primary_muscles = Column(ARRAY(Text), nullable=False, server_default=text("'{}'"))
    secondary_muscles = Column(ARRAY(Text), nullable=True, server_default=text("'{}'"))
    equipment_type = Column(Text, nullable=True)

    # Guidance content (stored as JSONB arrays)
    setup_steps = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    how_to_steps = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    common_mistakes = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    safety_tips = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    beginner_tips = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))

    # Media references
    thumbnail_url = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    video_url = Column(Text, nullable=True)
    muscle_diagram_url = Column(Text, nullable=True)

    # Metadata
    tags = Column(ARRAY(Text), nullable=False, server_default=text("'{}'"))
    meta = Column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    # Relationships
    favorites = relationship("Favorite", back_populates="machine", cascade="all, delete-orphan")
    history = relationship("History", back_populates="machine", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Machine(id={self.id}, name={self.name}, category={self.category})>"


class Favorite(Base):
    """
    User-specific machine favorites.

    Composite primary key (user_id, machine_id).
    Users can only access their own favorites (RLS enforced).
    """
    __tablename__ = "favorites"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    machine_id = Column(Text, ForeignKey("machines.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    notes = Column(Text, nullable=True)
    meta = Column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    # Relationships
    user = relationship("User", back_populates="favorites")
    machine = relationship("Machine", back_populates="favorites")

    def __repr__(self) -> str:
        return f"<Favorite(user_id={self.user_id}, machine_id={self.machine_id})>"


class History(Base):
    """
    User identification history and activity tracking.

    Records each machine identification with confidence score and metadata.
    Users can only access their own history (RLS enforced).
    """
    __tablename__ = "history"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    machine_id = Column(Text, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)

    # Identification metadata
    confidence = Column(Numeric(5, 2), nullable=True)
    source = Column(Text, nullable=False, server_default=text("'unknown'"))

    # Timestamps
    taken_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    # Additional context
    photo_uri = Column(Text, nullable=True)
    meta = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    # Relationships
    user = relationship("User", back_populates="history")
    machine = relationship("Machine", back_populates="history")

    def __repr__(self) -> str:
        return f"<History(id={self.id}, user_id={self.user_id}, machine_id={self.machine_id})>"
