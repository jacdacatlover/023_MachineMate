from __future__ import annotations

import logging

import pytest

from app.main import app
from app.routers.media import get_supabase_client


class FakeBucket:
    def __init__(self):
        self.uploaded = []
        self.removed = []

    def upload(self, *, path, file, file_options):
        self.uploaded.append(
            {"path": path, "size": len(file), "content_type": file_options.get("content-type")}
        )
        return {"Key": path}

    def get_public_url(self, path):
        return f"https://cdn.local/{path}"

    def remove(self, paths):
        self.removed.extend(paths)


class ErrorBucket(FakeBucket):
    def __init__(self, upload_error: Exception | None = None, remove_error: Exception | None = None):
        super().__init__()
        self._upload_error = upload_error
        self._remove_error = remove_error

    def upload(self, *, path, file, file_options):
        if self._upload_error:
            raise self._upload_error
        return super().upload(path=path, file=file, file_options=file_options)

    def remove(self, paths):
        if self._remove_error:
            raise self._remove_error
        super().remove(paths)


class FakeStorage:
    def __init__(self):
        self.bucket = FakeBucket()
        self.last_bucket = None

    def from_(self, bucket_name):
        self.last_bucket = bucket_name
        return self.bucket


class FakeSupabaseClient:
    def __init__(self):
        self.storage = FakeStorage()


@pytest.fixture
def fake_supabase_client():
    client = FakeSupabaseClient()
    app.dependency_overrides[get_supabase_client] = lambda: client
    yield client
    app.dependency_overrides.pop(get_supabase_client, None)


@pytest.mark.asyncio
async def test_upload_media_validates_content_type(async_client, override_get_current_user, fake_supabase_client):
    response = await async_client.post(
        "/api/v1/media/upload",
        files={"file": ("notes.txt", b"text", "text/plain")},
    )
    assert response.status_code == 415


@pytest.mark.asyncio
async def test_upload_media_happy_path(async_client, override_get_current_user, fake_supabase_client):
    response = await async_client.post(
        "/api/v1/media/upload",
        files={"file": ("photo.jpg", b"image-bytes", "image/jpeg")},
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["bucket"] == fake_supabase_client.storage.last_bucket
    assert fake_supabase_client.storage.bucket.uploaded


@pytest.mark.asyncio
async def test_delete_media_rejects_other_users(async_client, override_get_current_user, fake_supabase_client):
    response = await async_client.delete("/api/v1/media/delete/another-user/photo.jpg")
    assert response.status_code == 403
    assert not fake_supabase_client.storage.bucket.removed


@pytest.mark.asyncio
async def test_delete_media_success(async_client, override_get_current_user, fake_supabase_client, mock_user):
    file_path = f"{mock_user.id}/photo.jpg"
    response = await async_client.delete(f"/api/v1/media/delete/{file_path}")
    assert response.status_code == 204
    assert fake_supabase_client.storage.bucket.removed == [file_path]


@pytest.mark.asyncio
async def test_upload_media_rejects_empty_file(async_client, override_get_current_user, fake_supabase_client):
    response = await async_client.post(
        "/api/v1/media/upload",
        files={"file": ("photo.jpg", b"", "image/jpeg")},
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "Empty file"
    assert not fake_supabase_client.storage.bucket.uploaded


@pytest.mark.asyncio
async def test_upload_media_handles_storage_failure(
    async_client, override_get_current_user, fake_supabase_client, caplog
):
    fake_supabase_client.storage.bucket = ErrorBucket(upload_error=RuntimeError("boom"))
    caplog.set_level(logging.ERROR)

    response = await async_client.post(
        "/api/v1/media/upload",
        files={"file": ("photo.jpg", b"image-bytes", "image/jpeg")},
    )

    assert response.status_code == 500
    assert "Failed to upload file" in response.json()["detail"]
    assert any(record.message == "media.upload_failed" for record in caplog.records)


@pytest.mark.asyncio
async def test_delete_media_handles_storage_failure(
    async_client, override_get_current_user, fake_supabase_client, mock_user, caplog
):
    fake_supabase_client.storage.bucket = ErrorBucket(remove_error=RuntimeError("boom"))
    caplog.set_level(logging.ERROR)

    file_path = f"{mock_user.id}/photo.jpg"
    response = await async_client.delete(f"/api/v1/media/delete/{file_path}")

    assert response.status_code == 500
    assert "Failed to delete file" in response.json()["detail"]
    assert any(record.message == "media.delete_failed" for record in caplog.records)
