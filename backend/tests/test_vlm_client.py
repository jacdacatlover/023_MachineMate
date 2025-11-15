from __future__ import annotations

import base64
from typing import Callable, Dict
from unittest.mock import AsyncMock

import pytest

from app.services.vlm_client import (
    HUGGINGFACE_HOST,
    VLMClient,
    build_prompt,
)
from app.services.trace_store import trace_store


class DummyHTTPResponse:
    def __init__(self, status_code=200, json_data=None, text=None):
        self.status_code = status_code
        self._json = json_data or {}
        self.text = text or ""

    def json(self):
        return self._json


def mock_async_client(response):
    class _Client:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, *args, **kwargs):
            return response

    return _Client


class DummySettings:
    def __init__(self, **overrides):
        self.api_machine_options = [
            "Leg Press Machine",
            "Lat Pulldown",
            "Seated Cable Row",
        ]
        self.vlm_api_base_url = "https://api.fireworks.ai/inference"
        self.vlm_api_key = None
        self.vlm_request_timeout = 2.5
        self.vlm_model = "qwen-vl-chat"
        self.enable_mock_responses = True
        self.REQUIRE_AUTH = True
        self.ENVIRONMENT = "test"
        self.prompt_variant = "enhanced_baseline"
        self.prompt_ab_testing_enabled = False
        self.enable_prompt_metadata = True
        for key, value in overrides.items():
            setattr(self, key, value)


@pytest.fixture
def make_client(monkeypatch) -> Callable[..., VLMClient]:
    def _factory(**overrides):
        settings = DummySettings(**overrides)
        monkeypatch.setattr("app.services.vlm_client.get_settings", lambda: settings)
        return VLMClient()

    return _factory


def test_build_prompt_lists_machine_options():
    prompt = build_prompt(["A", "B"])
    assert "A, B" in prompt
    assert "choose exactly ONE machine" in prompt


def test_extract_message_text_prefers_text_chunk():
    payload = {
        "choices": [
            {
                "message": {
                    "content": [
                        {"type": "image_url", "image_url": {"url": "data:"}},
                        {"type": "text", "text": "result here"},
                    ]
                }
            }
        ]
    }
    assert VLMClient._extract_message_text(payload) == "result here"


def test_detect_api_mode_handles_variants():
    assert VLMClient._detect_api_mode("") == "disabled"
    assert VLMClient._detect_api_mode(f"https://{HUGGINGFACE_HOST}/demo") == "huggingface"
    assert VLMClient._detect_api_mode("https://api.fireworks.ai") == "openai"


def test_build_openai_endpoint_variants():
    assert (
        VLMClient._build_openai_endpoint("https://api.fireworks.ai/inference")
        == "https://api.fireworks.ai/inference/v1/chat/completions"
    )
    assert (
        VLMClient._build_openai_endpoint("https://api.fireworks.ai/inference/v1")
        == "https://api.fireworks.ai/inference/v1/chat/completions"
    )
    base = "https://api.fireworks.ai/inference/v1/chat/completions"
    assert VLMClient._build_openai_endpoint(base) == base


def test_build_payloads_encode_image(make_client):
    client = make_client()
    payload = client._build_openai_payload(b"bytes")
    encoded = base64.b64encode(b"bytes").decode("ascii")
    assert payload["messages"][1]["content"][1]["image_url"]["url"].endswith(encoded)

    hf_payload = client._build_huggingface_payload(b"bytes")
    assert hf_payload["inputs"]["image"] == encoded
    assert "Identify the machine" in hf_payload["inputs"]["prompt"]


def test_canonicalize_machine_handles_partial_matches(make_client):
    client = make_client()
    machine, score = client._canonicalize_machine("leg press")
    assert machine == "Leg Press Machine"
    assert score >= 0.95


def test_parse_machine_json_normalizes_and_limits_confidence(make_client):
    client = make_client()
    parsed = client._parse_machine_json('{"machine":"leg press machine","confidence":0.95}', "trace-1")
    assert parsed["machine"] == "Leg Press Machine"
    assert parsed["raw_machine"] == "leg press machine"
    assert parsed["unmapped"] is False


def test_parse_machine_json_unmapped_drops_confidence(make_client):
    client = make_client()
    parsed = client._parse_machine_json('{"machine":"mystery device","confidence":0.9}', "trace-2")
    assert parsed["unmapped"] is True
    assert parsed["machine"] == "mystery device"
    assert parsed["confidence"] <= 0.49


def test_parse_machine_json_invalid_confidence_returns_none(make_client):
    client = make_client()
    assert client._parse_machine_json('{"machine":"leg press","confidence":"high"}', "trace-3") is None


def test_record_failure_adds_trace_entry(monkeypatch, make_client):
    records: Dict[str, Dict] = {}

    def fake_record(entry):
        records[entry.trace_id] = {
            "error": entry.error,
            "model": entry.model,
            "prompt": entry.prompt,
        }

    monkeypatch.setattr(trace_store, "record", fake_record)
    client = make_client()
    client._record_failure("trace-123", "boom")
    assert records["trace-123"]["error"] == "boom"


@pytest.mark.asyncio
async def test_classify_returns_none_when_disabled(make_client):
    client = make_client(vlm_api_base_url="")
    assert await client.classify(b"bytes") is None


@pytest.mark.asyncio
async def test_classify_routes_to_huggingface(monkeypatch, make_client):
    fake_response = {"machine": "demo"}
    hf_mock = AsyncMock(return_value=fake_response)
    monkeypatch.setattr(VLMClient, "_classify_huggingface", hf_mock)

    client = make_client(vlm_api_base_url=f"https://{HUGGINGFACE_HOST}/demo")
    result = await client.classify(b"bytes")
    hf_mock.assert_awaited_once()
    assert result == fake_response


@pytest.mark.asyncio
async def test_classify_routes_to_openai(monkeypatch, make_client):
    openai_mock = AsyncMock(return_value={"machine": "Lat Pulldown"})
    monkeypatch.setattr(VLMClient, "_classify_openai_style", openai_mock)
    client = make_client()
    result = await client.classify(b"bytes")
    openai_mock.assert_awaited_once()
    assert result == {"machine": "Lat Pulldown"}


@pytest.mark.asyncio
async def test_classify_openai_style_parses_response(monkeypatch, make_client):
    client = make_client()
    response_payload = {
        "choices": [
            {
                "message": {
                    "content": [
                        {"type": "text", "text": '{"machine":"Lat Pulldown","confidence":0.77}'}
                    ]
                }
            }
        ]
    }
    response = DummyHTTPResponse(status_code=200, json_data=response_payload)
    monkeypatch.setattr("app.services.vlm_client.httpx.AsyncClient", mock_async_client(response))

    result = await client._classify_openai_style(b"bytes")

    assert result is not None
    assert result.machine == "Lat Pulldown"
    assert result.mocked is False


@pytest.mark.asyncio
async def test_classify_openai_style_handles_errors(monkeypatch, make_client):
    client = make_client()
    response = DummyHTTPResponse(status_code=500, text="server error")
    monkeypatch.setattr("app.services.vlm_client.httpx.AsyncClient", mock_async_client(response))

    assert await client._classify_openai_style(b"bytes") is None


@pytest.mark.asyncio
async def test_classify_huggingface_parses_response(monkeypatch, make_client):
    client = make_client(vlm_api_base_url=f"https://{HUGGINGFACE_HOST}/models/demo")
    response = DummyHTTPResponse(
        status_code=200,
        json_data={"generated_text": '{"machine":"Treadmill","confidence":0.6}'},
    )
    monkeypatch.setattr("app.services.vlm_client.httpx.AsyncClient", mock_async_client(response))

    result = await client._classify_huggingface(b"bytes")

    assert result is not None
    assert result.machine == "Treadmill"


@pytest.mark.asyncio
async def test_classify_huggingface_returns_none_on_warmup(monkeypatch, make_client):
    client = make_client(vlm_api_base_url=f"https://{HUGGINGFACE_HOST}/models/demo")
    response = DummyHTTPResponse(status_code=503, text="warming")
    monkeypatch.setattr("app.services.vlm_client.httpx.AsyncClient", mock_async_client(response))

    assert await client._classify_huggingface(b"bytes") is None
