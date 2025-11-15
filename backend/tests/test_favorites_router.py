"""
Tests for Favorites API endpoints.

Tests cover:
- List user favorites
- Create favorite
- Get specific favorite
- Update favorite notes
- Delete favorite
- Clear all favorites
- Authentication and authorization
"""

from copy import deepcopy
from uuid import UUID

import pytest
from sqlalchemy import select

from app.models import Machine, Favorite


@pytest.mark.asyncio
async def test_list_favorites_empty(async_client, override_get_db, override_get_current_user):
    """Test listing favorites when user has none."""
    response = await async_client.get("/api/v1/favorites")

    assert response.status_code == 200
    data = response.json()
    assert data["favorites"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_favorites_with_data(
    async_client, test_db, override_get_db, override_get_current_user, mock_user, sample_machine_data
):
    """Test listing favorites with data."""
    # Add machine and favorite
    machine = Machine(**sample_machine_data)
    test_db.add(machine)
    await test_db.commit()

    favorite = Favorite(
        user_id=UUID(mock_user.id),
        machine_id="test-machine-1",
        notes="Great machine",
    )
    test_db.add(favorite)
    await test_db.commit()

    response = await async_client.get("/api/v1/favorites")

    assert response.status_code == 200
    data = response.json()
    assert len(data["favorites"]) == 1
    assert data["total"] == 1
    assert data["favorites"][0]["machine_id"] == "test-machine-1"
    assert data["favorites"][0]["notes"] == "Great machine"


@pytest.mark.asyncio
async def test_create_favorite_success(
    async_client, test_db, override_get_db, override_get_current_user, sample_machine_data
):
    """Test creating a new favorite."""
    # Add machine first
    machine = Machine(**sample_machine_data)
    test_db.add(machine)
    await test_db.commit()

    response = await async_client.post(
        "/api/v1/favorites",
        json={"machine_id": "test-machine-1", "notes": "My favorite"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["machine_id"] == "test-machine-1"
    assert data["notes"] == "My favorite"
    assert "created_at" in data


@pytest.mark.asyncio
async def test_create_favorite_machine_not_found(
    async_client, override_get_db, override_get_current_user
):
    """Test creating favorite for non-existent machine."""
    response = await async_client.post(
        "/api/v1/favorites",
        json={"machine_id": "non-existent", "notes": "Test"},
    )

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_favorite_duplicate(
    async_client, test_db, override_get_db, override_get_current_user, mock_user, sample_machine_data
):
    """Test creating duplicate favorite returns conflict."""
    # Add machine and existing favorite
    machine = Machine(**sample_machine_data)
    test_db.add(machine)
    await test_db.commit()

    favorite = Favorite(
        user_id=UUID(mock_user.id),
        machine_id="test-machine-1",
    )
    test_db.add(favorite)
    await test_db.commit()

    # Try to create duplicate
    response = await async_client.post(
        "/api/v1/favorites",
        json={"machine_id": "test-machine-1"},
    )

    assert response.status_code == 409
    assert "already" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_favorite_success(
    async_client, test_db, override_get_db, override_get_current_user, mock_user, sample_machine_data
):
    """Test getting a specific favorite."""
    # Add machine and favorite
    machine = Machine(**sample_machine_data)
    test_db.add(machine)
    await test_db.commit()

    favorite = Favorite(
        user_id=UUID(mock_user.id),
        machine_id="test-machine-1",
        notes="Test notes",
    )
    test_db.add(favorite)
    await test_db.commit()

    response = await async_client.get("/api/v1/favorites/test-machine-1")

    assert response.status_code == 200
    data = response.json()
    assert data["machine_id"] == "test-machine-1"
    assert data["notes"] == "Test notes"


@pytest.mark.asyncio
async def test_get_favorite_not_found(async_client, override_get_db, override_get_current_user):
    """Test getting non-existent favorite."""
    response = await async_client.get("/api/v1/favorites/non-existent")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_favorite_notes(
    async_client, test_db, override_get_db, override_get_current_user, mock_user, sample_machine_data
):
    """Test updating favorite notes."""
    # Add machine and favorite
    machine = Machine(**sample_machine_data)
    test_db.add(machine)
    await test_db.commit()

    favorite = Favorite(
        user_id=UUID(mock_user.id),
        machine_id="test-machine-1",
        notes="Original notes",
    )
    test_db.add(favorite)
    await test_db.commit()

    response = await async_client.patch(
        "/api/v1/favorites/test-machine-1",
        json={"notes": "Updated notes"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["notes"] == "Updated notes"


@pytest.mark.asyncio
async def test_delete_favorite_success(
    async_client, test_db, override_get_db, override_get_current_user, mock_user, sample_machine_data
):
    """Test deleting a favorite."""
    # Add machine and favorite
    machine = Machine(**sample_machine_data)
    test_db.add(machine)
    await test_db.commit()

    favorite = Favorite(
        user_id=UUID(mock_user.id),
        machine_id="test-machine-1",
    )
    test_db.add(favorite)
    await test_db.commit()

    response = await async_client.delete("/api/v1/favorites/test-machine-1")

    assert response.status_code == 204

    # Verify it's deleted
    response = await async_client.get("/api/v1/favorites")
    assert response.json()["total"] == 0


@pytest.mark.asyncio
async def test_delete_favorite_not_found(async_client, override_get_db, override_get_current_user):
    """Test deleting non-existent favorite."""
    response = await async_client.delete("/api/v1/favorites/non-existent")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_clear_all_favorites(
    async_client, test_db, override_get_db, override_get_current_user, mock_user, sample_machine_data
):
    """Test clearing all user favorites."""
    # Add multiple machines/favorites for the same user
    machines = []
    for i in range(3):
        payload = deepcopy(sample_machine_data)
        payload["id"] = f"test-machine-{i}"
        payload["name"] = f"Machine {i}"
        machines.append(Machine(**payload))
    test_db.add_all(machines)
    await test_db.commit()

    for machine in machines:
        favorite = Favorite(
            user_id=UUID(mock_user.id),
            machine_id=machine.id,
        )
        test_db.add(favorite)
    await test_db.commit()

    response = await async_client.delete("/api/v1/favorites")

    assert response.status_code == 204

    # Verify all deleted
    response = await async_client.get("/api/v1/favorites")
    assert response.json()["total"] == 0


@pytest.mark.asyncio
async def test_delete_favorite_forbidden_for_other_user(
    async_client, test_db, override_get_db, override_get_current_user, sample_machine_data
):
    """Ensure deleting another user's favorite returns 404 without removing it."""
    machine = Machine(**sample_machine_data)
    test_db.add(machine)
    await test_db.commit()

    other_user_id = UUID("660e8400-e29b-41d4-a716-446655440001")
    favorite = Favorite(
        user_id=other_user_id,
        machine_id="test-machine-1",
        notes="Belongs to someone else",
    )
    test_db.add(favorite)
    await test_db.commit()

    response = await async_client.delete("/api/v1/favorites/test-machine-1")
    assert response.status_code == 404

    remaining = await test_db.execute(select(Favorite).where(Favorite.user_id == other_user_id))
    assert remaining.scalar_one() is not None


@pytest.mark.asyncio
async def test_clear_all_favorites_only_affects_current_user(
    async_client, test_db, override_get_db, override_get_current_user, mock_user, sample_machine_data
):
    """Ensure bulk clear removes only the authenticated user's favorites."""
    machine_payloads = []
    for idx, machine_id in enumerate(["owned-machine-1", "owned-machine-2", "other-machine"]):
        payload = deepcopy(sample_machine_data)
        payload.update({"id": machine_id, "name": f"Machine {idx}"})
        machine_payloads.append(Machine(**payload))
    test_db.add_all(machine_payloads)
    await test_db.commit()

    current_user_id = UUID(mock_user.id)
    other_user_id = UUID("660e8400-e29b-41d4-a716-446655440001")

    favorites = [
        Favorite(user_id=current_user_id, machine_id="owned-machine-1"),
        Favorite(user_id=current_user_id, machine_id="owned-machine-2"),
        Favorite(user_id=other_user_id, machine_id="other-machine"),
    ]
    test_db.add_all(favorites)
    await test_db.commit()

    response = await async_client.delete("/api/v1/favorites")
    assert response.status_code == 204

    response = await async_client.get("/api/v1/favorites")
    assert response.status_code == 200
    assert response.json()["total"] == 0

    other_favorites = await test_db.execute(select(Favorite).where(Favorite.user_id == other_user_id))
    assert other_favorites.scalar_one() is not None
