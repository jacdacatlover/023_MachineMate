from __future__ import annotations

import pytest

from app.schemas import IdentifyResponse, VLMResponse
from app.services.inference import InferenceService, get_settings
from app.services.trace_store import trace_store
from app.services.vlm_client import InferenceUnavailable


class DummyInferenceSettings:
    def __init__(self, **overrides):
        self.api_machine_options = ["Lat Pulldown", "Leg Press"]
        self.enable_mock_responses = True
        self.vlm_model = "qwen-vl-chat"
        for key, value in overrides.items():
            setattr(self, key, value)


class FakeVLMClient:
    def __init__(self, response: VLMResponse | None = None, error: Exception | None = None):
        self._response = response
        self._error = error
        self.prompt = "Prompt"

    async def classify(self, image_bytes: bytes) -> VLMResponse | None:
        if self._error:
            raise self._error
        return self._response


@pytest.fixture(autouse=True)
def clear_trace_store():
    trace_store.clear()
    yield
    trace_store.clear()


@pytest.fixture
def configure_settings(monkeypatch):
    settings = DummyInferenceSettings()
    monkeypatch.setattr("app.services.inference.get_settings", lambda: settings)
    return settings


@pytest.mark.asyncio
async def test_identify_returns_vlm_response(monkeypatch, configure_settings):
    vlm_response = VLMResponse(
        machine="Lat Pulldown",
        confidence=0.88,
        raw_text='{"machine":"Lat Pulldown","confidence":0.88}',
        trace_id="trace-vlm",
        mocked=False,
        raw_machine="Lat Pulldown",
        match_score=1.0,
        unmapped=False,
    )
    service = InferenceService(vlm_client=FakeVLMClient(response=vlm_response))

    result = await service.identify(b"bytes")

    assert isinstance(result, IdentifyResponse)
    assert result.machine == "Lat Pulldown"
    assert not result.mocked
    assert trace_store.get("trace-vlm") is not None


@pytest.mark.asyncio
async def test_identify_falls_back_to_mock_response(configure_settings):
    error = InferenceUnavailable(trace_id="trace-error", detail="network failure")
    service = InferenceService(vlm_client=FakeVLMClient(error=error))

    result = await service.identify(b"bytes")

    assert result.mocked is True
    assert trace_store.get(result.trace_id) is not None


@pytest.mark.asyncio
async def test_identify_raises_when_mock_disabled(monkeypatch, configure_settings):
    configure_settings.enable_mock_responses = False
    error = InferenceUnavailable(trace_id="trace-error", detail="network failure")
    service = InferenceService(vlm_client=FakeVLMClient(error=error))

    with pytest.raises(InferenceUnavailable):
        await service.identify(b"bytes")
