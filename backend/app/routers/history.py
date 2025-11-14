"""
History API endpoints.

Provides read access to user identification history.
All operations require authentication and enforce user ownership via RLS.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.auth import User, get_current_user
from app.db import get_db
from app.models import History, Machine
from app.schemas import HistoryCreate, HistoryListResponse, HistoryResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=HistoryListResponse)
async def list_history(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    machine_id: Optional[str] = Query(None, description="Filter by machine ID"),
) -> HistoryListResponse:
    """
    Get user's identification history with pagination.

    Returns history entries sorted by taken_at (most recent first).
    """
    user_id = UUID(user.id)
    offset = (page - 1) * page_size

    # Build query
    stmt = (
        select(History)
        .where(History.user_id == user_id)
        .options(joinedload(History.machine))
        .order_by(History.taken_at.desc())
        .offset(offset)
        .limit(page_size)
    )

    # Apply machine filter if provided
    if machine_id:
        stmt = stmt.where(History.machine_id == machine_id)

    result = await db.execute(stmt)
    history_entries = result.scalars().all()

    # Count total
    count_stmt = select(func.count()).select_from(History).where(History.user_id == user_id)
    if machine_id:
        count_stmt = count_stmt.where(History.machine_id == machine_id)

    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    return HistoryListResponse(
        history=[
            HistoryResponse(
                id=entry.id,
                machine_id=entry.machine_id,
                confidence=float(entry.confidence) if entry.confidence else None,
                source=entry.source,
                taken_at=entry.taken_at,
                created_at=entry.created_at,
                photo_uri=entry.photo_uri,
                machine=entry.machine,
            )
            for entry in history_entries
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=HistoryResponse, status_code=status.HTTP_201_CREATED)
async def create_history_entry(
    history: HistoryCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> HistoryResponse:
    """
    Create a new history entry.

    Typically called after successful machine identification.
    """
    user_id = UUID(user.id)

    # Check if machine exists
    machine_stmt = select(Machine).where(Machine.id == history.machine_id)
    machine_result = await db.execute(machine_stmt)
    machine = machine_result.scalar_one_or_none()

    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with id '{history.machine_id}' not found",
        )

    # Create history entry
    new_entry = History(
        user_id=user_id,
        machine_id=history.machine_id,
        confidence=history.confidence,
        source=history.source,
        photo_uri=history.photo_uri,
        taken_at=history.taken_at or datetime.utcnow(),
    )

    db.add(new_entry)
    await db.commit()
    await db.refresh(new_entry)

    # Load machine details
    await db.refresh(new_entry, ["machine"])

    logger.info(
        "history.created",
        extra={
            "user_id": str(user_id),
            "machine_id": history.machine_id,
            "confidence": history.confidence,
        },
    )

    return HistoryResponse(
        id=new_entry.id,
        machine_id=new_entry.machine_id,
        confidence=float(new_entry.confidence) if new_entry.confidence else None,
        source=new_entry.source,
        taken_at=new_entry.taken_at,
        created_at=new_entry.created_at,
        photo_uri=new_entry.photo_uri,
        machine=new_entry.machine,
    )


@router.get("/{history_id}", response_model=HistoryResponse)
async def get_history_entry(
    history_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> HistoryResponse:
    """
    Get a specific history entry by ID.
    """
    user_id = UUID(user.id)

    stmt = (
        select(History)
        .where(History.id == history_id, History.user_id == user_id)
        .options(joinedload(History.machine))
    )

    result = await db.execute(stmt)
    entry = result.scalar_one_or_none()

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History entry not found",
        )

    return HistoryResponse(
        id=entry.id,
        machine_id=entry.machine_id,
        confidence=float(entry.confidence) if entry.confidence else None,
        source=entry.source,
        taken_at=entry.taken_at,
        created_at=entry.created_at,
        photo_uri=entry.photo_uri,
        machine=entry.machine,
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear_all_history(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Clear all history for the current user.

    This is a bulk delete operation that removes all history entries
    for the authenticated user. Useful for "Clear History" functionality.
    """
    from sqlalchemy import delete

    user_id = UUID(user.id)

    # Delete all history for this user
    delete_stmt = delete(History).where(History.user_id == user_id)
    result = await db.execute(delete_stmt)
    await db.commit()

    deleted_count = result.rowcount

    logger.info(
        "history.cleared",
        extra={"user_id": str(user_id), "count": deleted_count},
    )


@router.delete("/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_history_entry(
    history_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Delete a history entry.
    """
    user_id = UUID(user.id)

    # Check if entry exists
    stmt = select(History).where(History.id == history_id, History.user_id == user_id)
    result = await db.execute(stmt)
    entry = result.scalar_one_or_none()

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History entry not found",
        )

    # Delete entry
    await db.delete(entry)
    await db.commit()

    logger.info(
        "history.deleted",
        extra={"user_id": str(user_id), "history_id": str(history_id)},
    )
