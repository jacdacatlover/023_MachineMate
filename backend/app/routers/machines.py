"""
Machines API endpoints.

Provides read access to the machine catalog.
Public read access (no authentication required for basic queries).
"""

from __future__ import annotations

import logging
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Machine
from app.schemas import MachineListResponse, MachineResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/machines", tags=["machines"])


@router.get("", response_model=MachineListResponse)
async def list_machines(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    category: Optional[str] = Query(None, description="Filter by category"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    search: Optional[str] = Query(None, description="Search by machine name"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    is_active: bool = Query(True, description="Filter by active status"),
) -> MachineListResponse:
    """
    Get list of machines with pagination and filters.

    Public endpoint - no authentication required.
    """
    offset = (page - 1) * page_size

    # Build query
    stmt = select(Machine).where(Machine.is_active == is_active)

    # Apply filters
    if category:
        stmt = stmt.where(Machine.category == category)

    if difficulty:
        stmt = stmt.where(Machine.difficulty == difficulty)

    if search:
        # Search in name (case-insensitive)
        stmt = stmt.where(Machine.name.ilike(f"%{search}%"))

    if tags:
        # Filter machines that have all specified tags
        for tag in tags:
            stmt = stmt.where(Machine.tags.contains([tag]))

    # Apply pagination and ordering
    stmt = stmt.order_by(Machine.name).offset(offset).limit(page_size)

    result = await db.execute(stmt)
    machines = result.scalars().all()

    # Count total (with same filters)
    count_stmt = select(func.count()).select_from(Machine).where(Machine.is_active == is_active)

    if category:
        count_stmt = count_stmt.where(Machine.category == category)
    if difficulty:
        count_stmt = count_stmt.where(Machine.difficulty == difficulty)
    if search:
        count_stmt = count_stmt.where(Machine.name.ilike(f"%{search}%"))
    if tags:
        for tag in tags:
            count_stmt = count_stmt.where(Machine.tags.contains([tag]))

    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    return MachineListResponse(
        machines=[MachineResponse.model_validate(machine) for machine in machines],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{machine_id}", response_model=MachineResponse)
async def get_machine(
    machine_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MachineResponse:
    """
    Get a specific machine by ID.

    Public endpoint - no authentication required.
    """
    stmt = select(Machine).where(Machine.id == machine_id)
    result = await db.execute(stmt)
    machine = result.scalar_one_or_none()

    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with id '{machine_id}' not found",
        )

    return MachineResponse.model_validate(machine)


@router.get("/categories/list", response_model=List[str])
async def list_categories(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> List[str]:
    """
    Get list of all unique machine categories.

    Public endpoint - no authentication required.
    """
    stmt = select(Machine.category.distinct()).where(Machine.is_active == True).order_by(Machine.category)
    result = await db.execute(stmt)
    categories = [cat for cat in result.scalars().all() if cat]

    return categories


@router.get("/difficulties/list", response_model=List[str])
async def list_difficulties(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> List[str]:
    """
    Get list of all unique difficulty levels.

    Public endpoint - no authentication required.
    """
    stmt = select(Machine.difficulty.distinct()).where(Machine.is_active == True).order_by(Machine.difficulty)
    result = await db.execute(stmt)
    difficulties = [diff for diff in result.scalars().all() if diff]

    return difficulties
