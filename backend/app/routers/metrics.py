"""
Metrics and monitoring endpoints.

Provides operational metrics for observability.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Favorite, History, Machine, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/stats")
async def get_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """
    Get application statistics.

    Public endpoint for basic metrics.
    """
    # Count totals
    total_users_stmt = select(func.count()).select_from(User)
    total_machines_stmt = select(func.count()).select_from(Machine).where(Machine.is_active == True)
    total_history_stmt = select(func.count()).select_from(History)
    total_favorites_stmt = select(func.count()).select_from(Favorite)

    total_users_result = await db.execute(total_users_stmt)
    total_machines_result = await db.execute(total_machines_stmt)
    total_history_result = await db.execute(total_history_stmt)
    total_favorites_result = await db.execute(total_favorites_stmt)

    total_users = total_users_result.scalar_one()
    total_machines = total_machines_result.scalar_one()
    total_history = total_history_result.scalar_one()
    total_favorites = total_favorites_result.scalar_one()

    # Recent activity (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_history_stmt = (
        select(func.count())
        .select_from(History)
        .where(History.created_at >= seven_days_ago)
    )
    recent_history_result = await db.execute(recent_history_stmt)
    recent_identifications = recent_history_result.scalar_one()

    return {
        "totals": {
            "users": total_users,
            "machines": total_machines,
            "identifications": total_history,
            "favorites": total_favorites,
        },
        "recent_activity": {
            "identifications_last_7_days": recent_identifications,
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/categories")
async def get_category_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """
    Get machine statistics by category.

    Public endpoint for category breakdown.
    """
    # Count machines per category
    stmt = (
        select(Machine.category, func.count(Machine.id))
        .where(Machine.is_active == True)
        .group_by(Machine.category)
        .order_by(func.count(Machine.id).desc())
    )

    result = await db.execute(stmt)
    categories = [
        {"category": row[0], "count": row[1]}
        for row in result.all()
    ]

    return {
        "categories": categories,
        "total_categories": len(categories),
        "timestamp": datetime.utcnow().isoformat(),
    }
