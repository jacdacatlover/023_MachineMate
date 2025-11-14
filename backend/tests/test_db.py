from __future__ import annotations

import pytest

from app import db


class FakeEngine:
    def __init__(self):
        self.disposed = False

    def begin(self):
        return FakeConnection()

    async def dispose(self):
        self.disposed = True


class FakeConnection:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


class DummySession:
    def __init__(self):
        self.committed = False
        self.rolled_back = False
        self.closed = False

    async def commit(self):
        self.committed = True

    async def rollback(self):
        self.rolled_back = True

    async def close(self):
        self.closed = True


class DummySessionContext:
    def __init__(self, session: DummySession):
        self.session = session

    async def __aenter__(self):
        return self.session

    async def __aexit__(self, exc_type, exc, tb):
        await self.session.close()
        return False


@pytest.fixture(autouse=True)
def reset_db_state():
    original_url = db.settings.DATABASE_URL
    original_debug = db.settings.DEBUG
    original_env = db.settings.ENVIRONMENT
    db._engine = None
    db._async_session_factory = None
    yield
    db._engine = None
    db._async_session_factory = None
    db.settings.DATABASE_URL = original_url
    db.settings.DEBUG = original_debug
    db.settings.ENVIRONMENT = original_env


def test_get_engine_converts_postgres_url(monkeypatch):
    fake_engine = FakeEngine()
    created = {}

    def fake_create_async_engine(url, **kwargs):
        created["url"] = url
        created["kwargs"] = kwargs
        return fake_engine

    monkeypatch.setattr(db, "create_async_engine", fake_create_async_engine)
    monkeypatch.setattr(db.settings, "DATABASE_URL", "postgresql://example/db")

    engine = db.get_engine()

    assert engine is fake_engine
    assert created["url"].startswith("postgresql+psycopg://")
    assert created["kwargs"]["poolclass"] is db.NullPool


def test_get_engine_raises_for_missing_url(monkeypatch):
    monkeypatch.setattr(db.settings, "DATABASE_URL", None)
    with pytest.raises(ValueError):
        db.get_engine()


def test_get_session_factory_caches_sessionmaker(monkeypatch):
    fake_factory = object()
    monkeypatch.setattr(db, "get_engine", lambda: FakeEngine())
    monkeypatch.setattr(db, "async_sessionmaker", lambda *args, **kwargs: fake_factory)

    factory_one = db.get_session_factory()
    factory_two = db.get_session_factory()

    assert factory_one is fake_factory
    assert factory_two is fake_factory


@pytest.mark.asyncio
async def test_get_db_commits_and_closes_session(monkeypatch):
    session = DummySession()

    def session_factory():
        return DummySessionContext(session)

    monkeypatch.setattr(db, "get_session_factory", lambda: session_factory)

    generator = db.get_db()
    yielded_session = await generator.__anext__()
    assert yielded_session is session
    with pytest.raises(StopAsyncIteration):
        await generator.__anext__()
    assert session.committed
    assert session.closed


@pytest.mark.asyncio
async def test_get_db_rolls_back_on_error(monkeypatch):
    session = DummySession()

    def session_factory():
        return DummySessionContext(session)

    monkeypatch.setattr(db, "get_session_factory", lambda: session_factory)

    generator = db.get_db()
    await generator.__anext__()
    with pytest.raises(RuntimeError):
        await generator.athrow(RuntimeError("boom"))
    assert session.rolled_back


@pytest.mark.asyncio
async def test_init_and_close_db(monkeypatch):
    fake_engine = FakeEngine()
    monkeypatch.setattr(db, "create_async_engine", lambda *args, **kwargs: fake_engine)
    monkeypatch.setattr(db.settings, "DATABASE_URL", "postgresql://example/db")

    await db.init_db()
    assert db.get_engine() is fake_engine

    await db.close_db()
    assert fake_engine.disposed is True
