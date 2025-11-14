from __future__ import annotations

from uuid import UUID

import pytest
from sqlalchemy import insert

from app.models import Favorite, History, Machine, User


@pytest.mark.asyncio
async def test_metrics_stats_counts(async_client, test_db, override_get_db, sample_machine_data):
    user = User(
        id=UUID("550e8400-e29b-41d4-a716-446655440003"),
        email="metrics@example.com",
        preferences={},
        meta={},
    )
    machine = Machine(**sample_machine_data)
    test_db.add_all([user, machine])
    await test_db.commit()

    await test_db.execute(
        insert(Favorite).values(user_id=user.id, machine_id=machine.id)
    )
    await test_db.execute(
        insert(History).values(user_id=user.id, machine_id=machine.id, source="metrics")
    )
    await test_db.commit()

    response = await async_client.get("/api/v1/metrics/stats")

    assert response.status_code == 200
    payload = response.json()
    assert payload["totals"]["users"] == 1
    assert payload["totals"]["machines"] == 1
    assert payload["totals"]["favorites"] == 1
    assert payload["totals"]["identifications"] == 1
    assert payload["recent_activity"]["identifications_last_7_days"] == 1


@pytest.mark.asyncio
async def test_metrics_categories_breakdown(async_client, test_db, override_get_db, sample_machine_data):
    categories = ["legs", "legs", "chest"]
    machines = []
    for index, category in enumerate(categories):
        payload = sample_machine_data.copy()
        payload["id"] = f"machine-{index}"
        payload["name"] = f"Machine {index}"
        payload["category"] = category
        machines.append(Machine(**payload))
    test_db.add_all(machines)
    await test_db.commit()

    response = await async_client.get("/api/v1/metrics/categories")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_categories"] == 2
    categories = {item["category"]: item["count"] for item in payload["categories"]}
    assert categories["legs"] == 2
    assert categories["chest"] == 1
