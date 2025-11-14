from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app, get_settings


class FakeConnection:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def execute(self, statement):
        return None


class FakeEngine:
    def __init__(self, should_fail: bool = False):
        self.should_fail = should_fail

    def connect(self):
        if self.should_fail:
            raise RuntimeError("connect failed")
        return FakeConnection()

    def begin(self):
        if self.should_fail:
            raise RuntimeError("begin failed")
        return FakeConnection()


@pytest.fixture
def client():
    return TestClient(app)


def test_health_checks_database(monkeypatch, client):
    settings = get_settings()
    settings.ENVIRONMENT = "production"
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    monkeypatch.setattr("app.db.get_engine", lambda: FakeEngine())

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_health_handles_database_failure(monkeypatch, client):
    settings = get_settings()
    settings.ENVIRONMENT = "production"
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    monkeypatch.setattr("app.db.get_engine", lambda: FakeEngine(should_fail=True))

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "degraded"


def test_readiness_and_liveness(monkeypatch, client):
    monkeypatch.setattr("app.db.get_engine", lambda: FakeEngine())
    ready = client.get("/health/ready")
    assert ready.status_code == 200
    live = client.get("/health/live")
    assert live.status_code == 200


def test_readiness_failure_returns_503(monkeypatch, client):
    monkeypatch.setattr("app.db.get_engine", lambda: FakeEngine(should_fail=True))
    response = client.get("/health/ready")
    assert response.status_code == 503
@pytest.fixture(autouse=True)
def reset_environment():
    settings = get_settings()
    original = settings.ENVIRONMENT
    yield
    settings.ENVIRONMENT = original
