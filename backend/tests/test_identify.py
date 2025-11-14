from __future__ import annotations

import base64
import unittest

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.trace_store import trace_store


def _sample_image_bytes() -> bytes:
    data = (
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAH"
        "gwJ/lcKU7wAAAABJRU5ErkJggg=="
    )
    return base64.b64decode(data)


class IdentifyEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        trace_store.clear()

    def test_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertIn("vlm_configured", payload)
        self.assertIn("mocking_enabled", payload)

    def test_identify_returns_mock_prediction(self):
        files = {"image": ("pixel.png", _sample_image_bytes(), "image/png")}
        response = self.client.post("/identify", files=files)
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("machine", payload)
        self.assertIn("confidence", payload)
        self.assertTrue(payload["mocked"])
        self.assertGreaterEqual(payload["confidence"], 0)
        self.assertLessEqual(payload["confidence"], 1)

    def test_trace_endpoint_returns_latest_entry(self):
        files = {"image": ("pixel.png", _sample_image_bytes(), "image/png")}
        response = self.client.post("/identify", files=files)
        self.assertEqual(response.status_code, 200)
        trace_id = response.json()["trace_id"]

        trace_response = self.client.get(f"/traces/{trace_id}")
        self.assertEqual(trace_response.status_code, 200)
        payload = trace_response.json()
        self.assertEqual(payload["trace_id"], trace_id)
        self.assertTrue(payload["mocked"])
        self.assertIn("created_at", payload)
        self.assertIn("prompt", payload)
        self.assertEqual(payload["machine"], payload["raw_machine"])
        self.assertFalse(payload["unmapped"])

    def test_identify_rejects_non_images(self):
        files = {"image": ("bad.txt", b"not an image", "text/plain")}
        response = self.client.post("/identify", files=files)
        self.assertEqual(response.status_code, 415)


if __name__ == "__main__":
    unittest.main()
