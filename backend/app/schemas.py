from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ============================================================================
# Machine Identification Schemas (existing)
# ============================================================================


class IdentifyResponse(BaseModel):
    machine: str = Field(description="Predicted machine label.")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score in [0, 1].")
    trace_id: str = Field(description="Server trace for observability.")
    mocked: bool = Field(description="Indicates the response is a placeholder.")


class VLMResponse(BaseModel):
    machine: str
    confidence: float
    raw_text: str
    trace_id: str
    mocked: bool = False
    raw_machine: Optional[str] = None
    match_score: Optional[float] = None
    unmapped: bool = False
    prompt_variant: Optional[str] = None  # Tracks which prompt variant was used


class ErrorResponse(BaseModel):
    detail: str


class TraceDetails(BaseModel):
    trace_id: str
    machine: Optional[str] = None
    confidence: Optional[float] = None
    mocked: bool = False
    raw_text: Optional[str] = None
    raw_machine: Optional[str] = None
    match_score: Optional[float] = None
    unmapped: bool = False
    model: Optional[str] = None
    prompt: Optional[str] = None
    prompt_variant: Optional[str] = None  # Tracks which prompt variant was used
    error: Optional[str] = None
    created_at: datetime


# ============================================================================
# Machine Catalog Schemas
# ============================================================================


class MachineBase(BaseModel):
    """Base schema for machine data"""
    name: str
    category: str
    difficulty: str = "beginner"
    primary_muscles: List[str] = Field(default_factory=list)
    secondary_muscles: List[str] = Field(default_factory=list)
    equipment_type: Optional[str] = None

    # Guidance content
    setup_steps: List[str] = Field(default_factory=list)
    how_to_steps: List[str] = Field(default_factory=list)
    common_mistakes: List[str] = Field(default_factory=list)
    safety_tips: List[str] = Field(default_factory=list)
    beginner_tips: List[str] = Field(default_factory=list)

    # Media references
    thumbnail_url: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    muscle_diagram_url: Optional[str] = None

    # Metadata
    tags: List[str] = Field(default_factory=list)
    meta: Dict[str, Any] = Field(
        default_factory=dict,
        serialization_alias="metadata",
        validation_alias="meta",
    )
    is_active: bool = True


class MachineResponse(MachineBase):
    """Machine response schema with all fields"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class MachineListResponse(BaseModel):
    """Paginated list of machines"""
    machines: List[MachineResponse]
    total: int
    page: int
    page_size: int


# ============================================================================
# Favorites Schemas
# ============================================================================


class FavoriteCreate(BaseModel):
    """Create a new favorite"""
    machine_id: str
    notes: Optional[str] = None


class FavoriteUpdate(BaseModel):
    """Update favorite notes"""
    notes: Optional[str] = None


class FavoriteResponse(BaseModel):
    """Favorite response with machine details"""
    model_config = ConfigDict(from_attributes=True)

    machine_id: str
    created_at: datetime
    notes: Optional[str] = None
    machine: Optional[MachineResponse] = None


class FavoriteListResponse(BaseModel):
    """List of user favorites"""
    favorites: List[FavoriteResponse]
    total: int


# ============================================================================
# History Schemas
# ============================================================================


class HistoryCreate(BaseModel):
    """Create a new history entry"""
    machine_id: str
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    source: str = "backend_api"
    photo_uri: Optional[str] = None
    taken_at: Optional[datetime] = None


class HistoryResponse(BaseModel):
    """History response with machine details"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    machine_id: str
    confidence: Optional[float] = None
    source: str
    taken_at: datetime
    created_at: datetime
    photo_uri: Optional[str] = None
    machine: Optional[MachineResponse] = None


class HistoryListResponse(BaseModel):
    """Paginated list of history entries"""
    history: List[HistoryResponse]
    total: int
    page: int
    page_size: int


# ============================================================================
# Media Upload Schemas
# ============================================================================


class MediaUploadResponse(BaseModel):
    """Response from media upload"""
    url: str
    public_url: str
    bucket: str
    path: str
    size: int
    content_type: str


# ============================================================================
# User Schemas
# ============================================================================


class UserResponse(BaseModel):
    """User profile response"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    preferences: Dict[str, Any] = Field(default_factory=dict)
