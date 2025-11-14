"""
Favorites API endpoints.

Provides CRUD operations for user-specific machine favorites.
All operations require authentication and enforce user ownership via RLS.
"""

from __future__ import annotations

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.auth import User, get_current_user
from app.db import get_db
from app.models import Favorite, Machine
from app.schemas import (
    FavoriteCreate,
    FavoriteListResponse,
    FavoriteResponse,
    FavoriteUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=FavoriteListResponse)
async def list_favorites(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FavoriteListResponse:
    """
    Get all favorites for the current user.

    Returns favorites with machine details.
    """
    user_id = UUID(user.id)

    # Query favorites with machine details
    stmt = (
        select(Favorite)
        .where(Favorite.user_id == user_id)
        .options(joinedload(Favorite.machine))
        .order_by(Favorite.created_at.desc())
    )

    result = await db.execute(stmt)
    favorites = result.scalars().all()

    # Count total
    count_stmt = select(func.count()).select_from(Favorite).where(Favorite.user_id == user_id)
    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    return FavoriteListResponse(
        favorites=[
            FavoriteResponse(
                machine_id=fav.machine_id,
                created_at=fav.created_at,
                notes=fav.notes,
                machine=fav.machine,
            )
            for fav in favorites
        ],
        total=total,
    )


@router.post("", response_model=FavoriteResponse, status_code=status.HTTP_201_CREATED)
async def create_favorite(
    favorite: FavoriteCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FavoriteResponse:
    """
    Add a machine to user favorites.

    Returns 409 if the favorite already exists.
    """
    user_id = UUID(user.id)

    # Check if machine exists
    machine_stmt = select(Machine).where(Machine.id == favorite.machine_id)
    machine_result = await db.execute(machine_stmt)
    machine = machine_result.scalar_one_or_none()

    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with id '{favorite.machine_id}' not found",
        )

    # Check if favorite already exists
    existing_stmt = select(Favorite).where(
        Favorite.user_id == user_id,
        Favorite.machine_id == favorite.machine_id,
    )
    existing_result = await db.execute(existing_stmt)
    existing = existing_result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Machine already in favorites",
        )

    # Create favorite
    new_favorite = Favorite(
        user_id=user_id,
        machine_id=favorite.machine_id,
        notes=favorite.notes,
    )

    db.add(new_favorite)
    await db.commit()
    await db.refresh(new_favorite)

    # Load machine details
    await db.refresh(new_favorite, ["machine"])

    logger.info(
        "favorite.created",
        extra={"user_id": str(user_id), "machine_id": favorite.machine_id},
    )

    return FavoriteResponse(
        machine_id=new_favorite.machine_id,
        created_at=new_favorite.created_at,
        notes=new_favorite.notes,
        machine=new_favorite.machine,
    )


@router.get("/{machine_id}", response_model=FavoriteResponse)
async def get_favorite(
    machine_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FavoriteResponse:
    """
    Get a specific favorite by machine ID.
    """
    user_id = UUID(user.id)

    stmt = (
        select(Favorite)
        .where(Favorite.user_id == user_id, Favorite.machine_id == machine_id)
        .options(joinedload(Favorite.machine))
    )

    result = await db.execute(stmt)
    favorite = result.scalar_one_or_none()

    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found",
        )

    return FavoriteResponse(
        machine_id=favorite.machine_id,
        created_at=favorite.created_at,
        notes=favorite.notes,
        machine=favorite.machine,
    )


@router.patch("/{machine_id}", response_model=FavoriteResponse)
async def update_favorite(
    machine_id: str,
    update: FavoriteUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FavoriteResponse:
    """
    Update favorite notes.
    """
    user_id = UUID(user.id)

    stmt = (
        select(Favorite)
        .where(Favorite.user_id == user_id, Favorite.machine_id == machine_id)
        .options(joinedload(Favorite.machine))
    )

    result = await db.execute(stmt)
    favorite = result.scalar_one_or_none()

    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found",
        )

    # Update notes
    if update.notes is not None:
        favorite.notes = update.notes

    await db.commit()
    await db.refresh(favorite)

    logger.info(
        "favorite.updated",
        extra={"user_id": str(user_id), "machine_id": machine_id},
    )

    return FavoriteResponse(
        machine_id=favorite.machine_id,
        created_at=favorite.created_at,
        notes=favorite.notes,
        machine=favorite.machine,
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear_all_favorites(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Clear all favorites for the current user.

    This is a bulk delete operation that removes all favorite entries
    for the authenticated user. Useful for "Clear Favorites" functionality.
    """
    user_id = UUID(user.id)

    # Delete all favorites for this user
    delete_stmt = delete(Favorite).where(Favorite.user_id == user_id)
    result = await db.execute(delete_stmt)
    await db.commit()

    deleted_count = result.rowcount

    logger.info(
        "favorites.cleared",
        extra={"user_id": str(user_id), "count": deleted_count},
    )


@router.delete("/{machine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_favorite(
    machine_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Remove a machine from user favorites.
    """
    user_id = UUID(user.id)

    # Check if favorite exists
    stmt = select(Favorite).where(
        Favorite.user_id == user_id,
        Favorite.machine_id == machine_id,
    )
    result = await db.execute(stmt)
    favorite = result.scalar_one_or_none()

    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found",
        )

    # Delete favorite
    delete_stmt = delete(Favorite).where(
        Favorite.user_id == user_id,
        Favorite.machine_id == machine_id,
    )
    await db.execute(delete_stmt)
    await db.commit()

    logger.info(
        "favorite.deleted",
        extra={"user_id": str(user_id), "machine_id": machine_id},
    )
