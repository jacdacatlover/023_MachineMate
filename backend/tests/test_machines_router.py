"""
Tests for Machines API endpoints.

Tests cover:
- List machines with pagination and filters
- Get machine by ID
- List categories
- List difficulties
- Error handling (404, invalid params)
"""

from copy import deepcopy
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Machine


@pytest.mark.asyncio
async def test_list_machines_empty(async_client, override_get_db):
    """Test listing machines when database is empty."""
    response = await async_client.get("/api/v1/machines")

    assert response.status_code == 200
    data = response.json()
    assert data["machines"] == []
    assert data["total"] == 0
    assert data["page"] == 1
    assert data["page_size"] == 20


@pytest.mark.asyncio
async def test_list_machines_with_data(async_client, test_db, override_get_db, sample_machine_data):
    """Test listing machines with data in database."""
    # Add test machine to database
    machine = Machine(**sample_machine_data)
    test_db.add(machine)
    await test_db.commit()

    response = await async_client.get("/api/v1/machines")

    assert response.status_code == 200
    data = response.json()
    assert len(data["machines"]) == 1
    assert data["total"] == 1
    assert data["machines"][0]["id"] == "test-machine-1"
    assert data["machines"][0]["name"] == "Leg Press"


@pytest.mark.asyncio
async def test_list_machines_pagination(async_client, test_db, override_get_db, sample_machine_data):
    """Test machines pagination."""
    # Add multiple machines
    for i in range(5):
        machine_payload = deepcopy(sample_machine_data)
        machine_payload.update(
            {
                "id": f"machine-{i}",
                "name": f"Machine {i}",
                "category": "legs",
                "primary_muscles": ["legs"],
            }
        )
        test_db.add(Machine(**machine_payload))
    await test_db.commit()

    # Test first page
    response = await async_client.get("/api/v1/machines?page=1&page_size=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["machines"]) == 2
    assert data["total"] == 5
    assert data["page"] == 1

    # Test second page
    response = await async_client.get("/api/v1/machines?page=2&page_size=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["machines"]) == 2
    assert data["page"] == 2


@pytest.mark.asyncio
async def test_list_machines_filter_by_category(async_client, test_db, override_get_db, sample_machine_data):
    """Test filtering machines by category."""
    # Add machines with different categories
    leg_data = deepcopy(sample_machine_data)
    leg_data.update({"id": "leg-machine", "name": "Leg Press", "category": "legs", "primary_muscles": ["legs"]})

    chest_data = deepcopy(sample_machine_data)
    chest_data.update({"id": "chest-machine", "name": "Chest Press", "category": "chest", "primary_muscles": ["chest"]})

    test_db.add_all([Machine(**leg_data), Machine(**chest_data)])
    await test_db.commit()

    # Filter by legs category
    response = await async_client.get("/api/v1/machines?category=legs")
    assert response.status_code == 200
    data = response.json()
    assert len(data["machines"]) == 1
    assert data["machines"][0]["category"] == "legs"


@pytest.mark.asyncio
async def test_list_machines_search(async_client, test_db, override_get_db, sample_machine_data):
    """Test searching machines by name."""
    # Add machines
    machine1_data = deepcopy(sample_machine_data)
    machine1_data.update({"id": "machine-1", "name": "Leg Press", "category": "legs", "primary_muscles": ["legs"]})

    machine2_data = deepcopy(sample_machine_data)
    machine2_data.update({"id": "machine-2", "name": "Chest Press", "category": "chest", "primary_muscles": ["chest"]})

    test_db.add_all([Machine(**machine1_data), Machine(**machine2_data)])
    await test_db.commit()

    # Search for "leg"
    response = await async_client.get("/api/v1/machines?search=leg")
    assert response.status_code == 200
    data = response.json()
    assert len(data["machines"]) == 1
    assert "Leg" in data["machines"][0]["name"]


@pytest.mark.asyncio
async def test_get_machine_success(async_client, test_db, override_get_db, sample_machine_data):
    """Test getting a specific machine by ID."""
    # Add test machine
    machine = Machine(**sample_machine_data)
    test_db.add(machine)
    await test_db.commit()

    response = await async_client.get("/api/v1/machines/test-machine-1")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "test-machine-1"
    assert data["name"] == "Leg Press"
    assert data["category"] == "legs"


@pytest.mark.asyncio
async def test_get_machine_not_found(async_client, override_get_db):
    """Test getting non-existent machine returns 404."""
    response = await async_client.get("/api/v1/machines/non-existent")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_list_categories(async_client, test_db, override_get_db, sample_machine_data):
    """Test listing unique machine categories."""
    # Add machines with different categories
    machines = []
    for i, category in enumerate(["legs", "chest", "legs"]):
        payload = deepcopy(sample_machine_data)
        payload.update(
            {
                "id": f"machine-{i}",
                "name": f"Machine {i}",
                "category": category,
                "primary_muscles": ["body"],
            }
        )
        machines.append(Machine(**payload))
    test_db.add_all(machines)
    await test_db.commit()

    response = await async_client.get("/api/v1/machines/categories/list")

    assert response.status_code == 200
    categories = response.json()
    assert set(categories) == {"chest", "legs"}


@pytest.mark.asyncio
async def test_list_difficulties(async_client, test_db, override_get_db, sample_machine_data):
    """Test listing unique difficulty levels."""
    # Add machines with different difficulties
    machines = []
    for i, difficulty in enumerate(["beginner", "intermediate", "beginner"]):
        payload = deepcopy(sample_machine_data)
        payload.update(
            {
                "id": f"machine-{i}",
                "name": f"Machine {i}",
                "difficulty": difficulty,
                "primary_muscles": ["body"],
            }
        )
        machines.append(Machine(**payload))
    test_db.add_all(machines)
    await test_db.commit()

    response = await async_client.get("/api/v1/machines/difficulties/list")

    assert response.status_code == 200
    difficulties = response.json()
    assert set(difficulties) == {"beginner", "intermediate"}
