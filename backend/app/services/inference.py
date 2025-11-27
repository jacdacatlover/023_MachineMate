from __future__ import annotations

import logging
import uuid

from ..config import DEFAULT_MACHINE_OPTIONS, get_settings
from ..schemas import IdentifyResponse, VLMResponse
from .detector import Detector
from .trace_store import TraceEntry, trace_store
from .vlm_client import InferenceUnavailable, VLMClient

logger = logging.getLogger("machinemate.inference")

# Safe fallback response whenever the VLM is unavailable.
# Returning "Unknown" prevents random hallucinated machines from propagating
# through the mobile app (favorites/history, instructions, etc.).
UNKNOWN_FALLBACK = ("Unknown", 0.0)


class InferenceService:
    def __init__(
        self,
        detector: Detector | None = None,
        vlm_client: VLMClient | None = None,
    ) -> None:
        settings = get_settings()
        self.settings = settings
        self.detector = detector or Detector()
        self.vlm_client = vlm_client or VLMClient()
        self.machine_options = settings.api_machine_options or DEFAULT_MACHINE_OPTIONS
        self.trace_store = trace_store

    async def identify(self, image_bytes: bytes) -> IdentifyResponse:
        """
        Main orchestration entry point.
        """
        try:
            vlm_response = await self.vlm_client.classify(image_bytes)
        except InferenceUnavailable as error:
            logger.warning(
                "inference.vlm_unavailable",
                extra={"trace_id": error.trace_id, "detail": str(error)},
            )
            if self.settings.enable_mock_responses:
                return self._mock_response()
            raise

        if vlm_response:
            return self._build_response_from_vlm(vlm_response)

        if self.settings.enable_mock_responses:
            return self._mock_response()

        raise RuntimeError("No inference pathway available.")

    def _build_response_from_vlm(self, vlm_response: VLMResponse) -> IdentifyResponse:
        trace_id = vlm_response.trace_id
        logger.info(
            "inference.vlm_success",
            extra={
                "trace_id": trace_id,
                "machine": vlm_response.machine,
                "confidence": vlm_response.confidence,
                "mocked": vlm_response.mocked,
                "unmapped": vlm_response.unmapped,
            },
        )

        response = IdentifyResponse(
            machine=vlm_response.machine,
            confidence=vlm_response.confidence,
            trace_id=trace_id,
            mocked=vlm_response.mocked,
        )
        self.trace_store.record(
            TraceEntry(
                trace_id=trace_id,
                machine=vlm_response.machine,
                confidence=vlm_response.confidence,
                mocked=vlm_response.mocked,
                raw_text=vlm_response.raw_text,
                raw_machine=vlm_response.raw_machine,
                match_score=vlm_response.match_score,
                unmapped=vlm_response.unmapped,
                model=self.settings.vlm_model,
                prompt=self.vlm_client.prompt,
                prompt_variant=vlm_response.prompt_variant,
            )
        )
        return response

    def _mock_response(self) -> IdentifyResponse:
        machine, confidence = UNKNOWN_FALLBACK
        trace_id = str(uuid.uuid4())
        logger.info(
            "inference.mock_response",
            extra={"trace_id": trace_id, "machine": machine, "confidence": confidence},
        )
        response = IdentifyResponse(machine=machine, confidence=confidence, trace_id=trace_id, mocked=True)
        self.trace_store.record(
            TraceEntry(
                trace_id=trace_id,
                machine=machine,
                confidence=confidence,
                mocked=True,
                raw_machine=machine,
                match_score=0.0,
                unmapped=True,
                model=self.settings.vlm_model,
                prompt=self.vlm_client.prompt,
                prompt_variant=self.vlm_client.prompt_variant,
            )
        )
        return response
