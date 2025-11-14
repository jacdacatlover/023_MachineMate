"""
Tests for History API endpoints.

Tests cover:
- List user history with pagination
- Create history entry
- Get specific history entry
- Delete history entry
- Clear all history
- Filter by machine
- Authentication and authorization
"""

import pytest
from uuid import UUID
from datetime import datetime
from copy import deepcopy

from app.models import Machine, History


@pytest.mark.asyncio
async def test_list_history_empty(async_client, override_get_db, override_get_current_user):
    """Test listing history when user has none."""
    response = await async_client.get("/api/v1/history")

    assert response.status_code == 200
    data = response.json()
    assert data["history"] == []
    assert data["total"] == 0
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_list_history_with_data(
    async_client, test_db, override_get_db, override_get_current_user, mock_user, sample_machine_data
):
    """Test listing history with data."""
    # Add machine and history
    machine = Machine(**sample_machine_data)
    test_db.add(machine)
    await test_db.commit()

    history = History(
        user_id=UUID(mock_user.id),
        machine_id="test-machine-1",
        confidence=0.95,
        source="camera",
        photo_uri="file:///photo.jpg",
        taken_at=datetime.utcnow(),
    )
    test_db.add(history)
    await test_db.commit()

    response = await async_client.get("/api/v1/history")

    assert response.status_code == 200
    data = response.json()
    assert len(data["history"]) == 1
    assert data["total"] == 1
    assert data["history"][0]["machine_id"] == "test-machine-1"
    assert data["history"][0]["confidence"] == 0.95


@pytest.mark.asyncio
async def test_list_history_pagination(
    async_client, test_db, override_get_db, override_get_current_user, mock_user, sample_machine_data
):
    """Test history pagination."""
    # Add machine
    machine = Machine(**sample_machine_data)
    test_db.add(machine)
    await test_db.commit()

    # Add multiple history entries
    for i in range(5):
        history = History(
            user_id=UUID(mock_user.id),
            machine_id="test-machine-1",
            confidence=0.9 + i * 0.01,
            source="camera",
            taken_at=datetime.utcnow(),
        )
        test_db.add(history)
    await test_db.commit()

    # Test first page
    response = await async_client.get("/api/v1/history?page=1&page_size=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["history"]) == 2
    assert data["total"] == 5
    assert data["page"] == 1

    # Test second page
    response = await async_client.get("/api/v1/history?page=2&page_size=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["history"]) == 2
    assert data["page"] == 2


@pytest.mark.asyncio
async def test_list_history_filter_by_machine(
    async_client, test_db, override_get_db, override_get_current_user, mock_user, sample_machine_data
):
    """Test filtering history by machine ID."""
    # Add machines
    machine1_data = deepcopy(sample_machine_data)
    machine1_data.update({"id": "machine-1", "name": "Machine 1", "category": "legs", "primary_muscles": ["legs"]})
    machine2_data = deepcopy(sample_machine_data)
    machine2_data.update({"id": "machine-2", "name": "Machine 2", "category": "chest", "primary_muscles": ["chest"]})

    test_db.add_all([Machine(**machine1_data), Machine(**machine2_data)])
    await test_db.commit()

    # Add history for both machines
    history1 = History(
        user_id=UUID(mock_user.id),
        machine_id="machine-1",
        source="camera",
        taken_at=datetime.utcnow(),
    )
    history2 = History(
        user_id=UUID(mock_user.id),
        machine_id="machine-2",
        source="camera",
        taken_at=datetime.utcnow(),
    )
    test_db.add_all([history1, history2])
    await test_db.commit()

    # Filter by machine-1
    response = await async_client.get("/api/v1/history?machine_id=machine-1")
    assert response.status_code == 200
    data = response.json()
    assert len(data["history"]) == 1
    assert data["history"][0]["machine_id"] == "machine-1"


@pytest.mark.asyncio
async def test_create_history_entry_success(
    async_client, test_db, override_get_db, override_get_current_user, sample_machine_data
):
    """Test creating a new history entry."""
    # Add machine first
    machine = Machine(**sample_machine_data)
    test_db.add(machine)
    await test_db.commit()

    response = await async_client.post(
        "/api/v1/history",
        json={
            "machine_id": "test-machine-1",
            "confidence": 0.95,
            "source": "camera",
            "photo_uri": "file:///photo.jpg",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["machine_id"] == "test-machine-1"
    assert data["confidence"] == 0.95
    assert data["source"] == "camera"
    assert "created_at" in data


@pytest.mark.asyncio
async def test_create_history_entry_machine_not_found(
    async_client, override_get_db, override_get_current_user
):
    """Test creating history for non-existent machine."""
    response = await async_client.post(
        "/api/v1/history",
        json={
            "machine_id": "non-existent",
            "confidence": 0.95,
            "source": "camera",
        },
    )

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_history_entry_success(
    async_client, test_db, override_get_db, override_get_current_user, mock_user, sample_machine_data
):
    """Test getting a specific history entry."""
    # Add machine and history
    machine = Machine(**sample_machine_data)
    test_db.add(machine)
    await test_db.commit()

    history = History(
        user_id=UUID(mock_user.id),
        machine_id="test-machine-1",
        confidence=0.95,
        source="camera",
        taken_at=datetime.utcnow(),
    )
    test_db.add(history)
    await test_db.commit()

    response = await async_client.get(f"/api/v1/history/{history.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["machine_id"] == "test-machine-1"
    assert data["confidence"] == 0.95


@pytest.mark.asyncio
async def test_get_history_entry_not_found(async_client, override_get_db, override_get_current_user):
    """Test getting non-existent history entry."""
    fake_uuid = "550e8400-e29b-41d4-a716-446655440000"
    response = await async_client.get(f"/api/v1/history/{fake_uuid}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_history_entry_success(
    async_client, test_db, override_get_db, override_get_current_user, mock_user, sample_machine_data
):
    """Test deleting a specific history entry."""
    machine = Machine(**sample_machine_data)
    test_db.add(machine)
    await test_db.commit()

    history = History(
        user_id=UUID(mock_user.id),
        machine_id="test-machine-1",
        confidence=0.92,
        source="camera",
        taken_at=datetime.utcnow(),
    )
    test_db.add(history)
    await test_db.commit()

    response = await async_client.delete(f"/api/v1/history/{history.id}")
    assert response.status_code == 204

    response = await async_client.get("/api/v1/history")
    assert response.json()["total"] == 0


@pytest.mark.asyncio
async def test_delete_history_entry_not_found(async_client, override_get_db, override_get_current_user):
    """Test deleting non-existent history entry."""
    fake_uuid = "660e8400-e29b-41d4-a716-446655440001"
    response = await async_client.delete(f"/api/v1/history/{fake_uuid}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_clear_all_history(
    async_client, test_db, override_get_db, override_get_current_user, mock_user, sample_machine_data
):
    """Test clearing all history entries for the user."""
    machine = Machine(**sample_machine_data)
    test_db.add(machine)
    await test_db.commit()

    entries = []
    for _ in range(3):
        entries.append(
            History(
                user_id=UUID(mock_user.id),
                machine_id="test-machine-1",
                source="camera",
                taken_at=datetime.utcnow(),
            )
        )
    test_db.add_all(entries)
    await test_db.commit()

    response = await async_client.delete("/api/v1/history")
    assert response.status_code == 204

    response = await async_client.get("/api/v1/history")
    assert response.json()["total"] == 0


@pytest.mark.asyncio
async def test_delete_history_entry_success(
    async_client, test_db, override_get_db, override_get_current_user, mock_user, sample_machine_data
):
    """Test deleting a history entry."""
    # Add machine and history
    machine = Machine(**sample_machine_data)
    test_db.add(machine)
    await test_db.commit()

    history = History(
        user_id=UUID(mock_user.id),
        machine_id="test-machine-1",
        source="camera",
        taken_at=datetime.utcnow(),
    )
    test_db.add(history)
    await test_db.commit()

    response = await async_client.delete(f"/api/v1/history/{history.id}")

    assert response.status_code == 204

    # Verify it's deleted
    response = await async_client.get("/api/v1/history")
    assert response.json()["total"] == 0


@pytest.mark.asyncio
async def test_delete_history_entry_not_found(
    async_client, override_get_db, override_get_current_user
):
    """Test deleting non-existent history entry."""
    fake_uuid = "550e8400-e29b-41d4-a716-446655440000"
    response = await async_client.delete(f"/api/v1/history/{fake_uuid}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_clear_all_history(
    async_client, test_db, override_get_db, override_get_current_user, mock_user, sample_machine_data
):
    """Test clearing all user history."""
    # Add machine
    machine = Machine(**sample_machine_data)
    test_db.add(machine)
    await test_db.commit()

    # Add multiple history entries
    for i in range(3):
        history = History(
            user_id=UUID(mock_user.id),
            machine_id="test-machine-1",
            source="camera",
            taken_at=datetime.utcnow(),
        )
        test_db.add(history)
    await test_db.commit()

    response = await async_client.delete("/api/v1/history")

    assert response.status_code == 204

    # Verify all deleted
    response = await async_client.get("/api/v1/history")
    assert response.json()["total"] == 0
