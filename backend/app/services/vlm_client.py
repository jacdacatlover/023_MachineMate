from __future__ import annotations

import base64
import json
import logging
import random
import re
import uuid
from difflib import SequenceMatcher
from typing import Any, Dict, Optional, Sequence, Tuple

import httpx

from ..config import DEFAULT_MACHINE_OPTIONS, MACHINES_CATALOG, get_settings
from ..schemas import VLMResponse
from .prompt_builder import PromptVariant, build_prompt as build_prompt_new
from .trace_store import TraceEntry, trace_store

logger = logging.getLogger("machinemate.vlm")

HUGGINGFACE_HOST = "api-inference.huggingface.co"


class InferenceUnavailable(RuntimeError):
    def __init__(self, trace_id: str, detail: str) -> None:
        super().__init__(detail)
        self.trace_id = trace_id


def build_prompt(machine_options: Sequence[str]) -> str:
    joined = ", ".join(machine_options)
    return (
        "You are a gym machine identifier.\n"
        "I will give you a photo and a list of machines.\n"
        "Look at the photo and choose exactly ONE machine from this list:\n"
        f"{joined}.\n"
        "Follow these rules strictly:\n"
        "1. Use EXACTLY one label from the list. Do not create new names or add modifiers.\n"
        "2. If none of the machines are visible, respond with {\"machine\": \"Unknown\", \"confidence\": 0.0}.\n"
        "3. If you are uncertain, pick the closest label but set confidence below 0.7.\n"
        "4. Respond with valid JSON only — no markdown, prose, or extra keys.\n"
        'Respond ONLY with the machine name and a confidence score from 0–1 in JSON:\n'
        '{"machine": \"...\", \"confidence\": 0.0}'
    )


class VLMClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.machine_options = self.settings.api_machine_options or DEFAULT_MACHINE_OPTIONS
        self.base_url = (self.settings.vlm_api_base_url or "").rstrip("/")
        self.api_mode = self._detect_api_mode(self.base_url)
        self._openai_endpoint = self._build_openai_endpoint(self.base_url)

        # Prompt variant selection for A/B testing
        self._prompt_variant = self._select_prompt_variant()
        self._prompt = self._build_prompt_for_variant()

    def _select_prompt_variant(self) -> PromptVariant:
        """Select prompt variant based on configuration or A/B testing"""
        if self.settings.prompt_ab_testing_enabled:
            # Random selection for A/B testing
            variants = [PromptVariant.ENHANCED_BASELINE, PromptVariant.FEW_SHOT, PromptVariant.CHAIN_OF_THOUGHT]
            selected = random.choice(variants)
            logger.info(
                "vlm.prompt_variant_selected",
                extra={"variant": selected.value, "method": "random_ab_test"}
            )
            return selected
        else:
            # Use configured variant
            variant_str = self.settings.prompt_variant
            try:
                variant = PromptVariant(variant_str)
                logger.info(
                    "vlm.prompt_variant_selected",
                    extra={"variant": variant.value, "method": "config"}
                )
                return variant
            except ValueError:
                logger.warning(
                    "vlm.invalid_prompt_variant",
                    extra={"variant": variant_str, "fallback": "enhanced_baseline"}
                )
                return PromptVariant.ENHANCED_BASELINE

    def _build_prompt_for_variant(self) -> str:
        """Build prompt using the selected variant and metadata"""
        metadata = MACHINES_CATALOG if self.settings.enable_prompt_metadata else None
        return build_prompt_new(
            machine_options=self.machine_options,
            variant=self._prompt_variant,
            machine_metadata=metadata
        )

    @property
    def prompt(self) -> str:
        return self._prompt

    @property
    def prompt_variant(self) -> str:
        """Return the current prompt variant name for logging"""
        return self._prompt_variant.value

    async def classify(self, image_bytes: bytes) -> Optional[VLMResponse]:
        if not self.base_url:
            logger.info("vlm.disabled", extra={"reason": "missing_base_url"})
            return None

        if self.api_mode == "huggingface":
            return await self._classify_huggingface(image_bytes)
        return await self._classify_openai_style(image_bytes)

    async def _classify_openai_style(self, image_bytes: bytes) -> Optional[VLMResponse]:
        trace_id = str(uuid.uuid4())
        payload = self._build_openai_payload(image_bytes)
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if self.settings.vlm_api_key:
            headers["Authorization"] = f"Bearer {self.settings.vlm_api_key}"

        timeout = httpx.Timeout(self.settings.vlm_request_timeout)
        endpoint = self._openai_endpoint

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(endpoint, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            error_message = f"{exc.__class__.__name__}: {exc}"
            logger.error(
                "vlm.request_failed",
                extra={"trace_id": trace_id, "error": exc.__class__.__name__, "detail": str(exc)},
            )
            self._record_failure(trace_id, error_message)
            raise InferenceUnavailable(trace_id, f"Visual model request failed (trace {trace_id}).") from exc

        if response.status_code >= 500:
            logger.warning(
                "vlm.server_error",
                extra={"status": response.status_code, "trace_id": trace_id, "body": response.text[:512]},
            )
            return None

        if response.status_code >= 400:
            logger.error(
                "vlm.client_error status=%s trace_id=%s body=%s",
                response.status_code,
                trace_id,
                response.text[:512],
            )
            return None

        message_text = self._extract_message_text(response.json())
        if not message_text:
            logger.warning("vlm.empty_response", extra={"trace_id": trace_id})
            return None

        parsed = self._parse_machine_json(message_text, trace_id)
        if not parsed:
            return None

        return VLMResponse(
            machine=parsed["machine"],
            confidence=float(parsed["confidence"]),
            raw_text=message_text,
            trace_id=trace_id,
            raw_machine=parsed.get("raw_machine"),
            match_score=parsed.get("match_score"),
            unmapped=parsed.get("unmapped", False),
            prompt_variant=self.prompt_variant,
        )

    async def _classify_huggingface(self, image_bytes: bytes) -> Optional[VLMResponse]:
        trace_id = str(uuid.uuid4())
        payload = self._build_huggingface_payload(image_bytes)
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if self.settings.vlm_api_key:
            headers["Authorization"] = f"Bearer {self.settings.vlm_api_key}"

        timeout = httpx.Timeout(self.settings.vlm_request_timeout)
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(self.base_url, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            error_message = f"{exc.__class__.__name__}: {exc}"
            logger.error(
                "vlm.hf_request_failed",
                extra={"trace_id": trace_id, "error": exc.__class__.__name__, "detail": str(exc)},
            )
            self._record_failure(trace_id, error_message)
            raise InferenceUnavailable(trace_id, f"Visual model request failed (trace {trace_id}).") from exc

        logger.info(
            "vlm.hf_response",
            extra={
                "trace_id": trace_id,
                "status": response.status_code,
                "text_sample": response.text[:200],
            },
        )

        if response.status_code == 503:
            # Hugging Face can return 503 while warming the model.
            logger.warning("vlm.hf_warming", extra={"trace_id": trace_id})
            return None

        if response.status_code >= 500:
            logger.warning(
                "vlm.server_error status=%s trace_id=%s body=%s",
                response.status_code,
                trace_id,
                response.text[:512],
            )
            return None

        if response.status_code >= 400:
            logger.error(
                "vlm.client_error status=%s trace_id=%s body=%s",
                response.status_code,
                trace_id,
                response.text[:512],
            )
            return None

        data = response.json()
        if isinstance(data, list) and data:
            data = data[0]

        if isinstance(data, dict) and "generated_text" in data:
            message_text = data["generated_text"]
        elif isinstance(data, dict) and "error" in data:
            logger.error("vlm.hf_error", extra={"trace_id": trace_id, "body": data})
            return None
        else:
            message_text = str(data)

        parsed = self._parse_machine_json(message_text, trace_id)
        if not parsed:
            return None

        return VLMResponse(
            machine=parsed["machine"],
            confidence=float(parsed["confidence"]),
            raw_text=message_text,
            trace_id=trace_id,
            raw_machine=parsed.get("raw_machine"),
            match_score=parsed.get("match_score"),
            unmapped=parsed.get("unmapped", False),
            prompt_variant=self.prompt_variant,
        )

    def _build_openai_payload(self, image_bytes: bytes) -> Dict[str, Any]:
        base64_image = base64.b64encode(image_bytes).decode("ascii")
        image_part = {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
        system_part = {"type": "text", "text": self._prompt}
        user_part = {
            "type": "text",
            "text": "Here is the photo. Respond exactly as instructed in the system prompt.",
        }
        model = self.settings.vlm_model or "qwen-vl-chat"
        return {
            "model": model,
            "messages": [
                {"role": "system", "content": [system_part]},
                {"role": "user", "content": [user_part, image_part]},
            ],
            "max_tokens": 256,
            "temperature": 0,
        }

    def _build_huggingface_payload(self, image_bytes: bytes) -> Dict[str, Any]:
        base64_image = base64.b64encode(image_bytes).decode("ascii")
        prompt = (
            "<|im_start|>system\n"
            f"{self._prompt}\n"
            "<|im_end|>\n"
            "<|im_start|>user\n"
            "<image>\n"
            "Identify the machine and respond exactly as instructed above.\n"
            "<|im_end|>\n"
            "<|im_start|>assistant\n"
        )
        return {
            "inputs": {
                "image": base64_image,
                "prompt": prompt,
            },
            "parameters": {
                "max_new_tokens": 256,
                "temperature": 0,
            },
        }

    @staticmethod
    def _extract_message_text(data: Dict[str, Any]) -> Optional[str]:
        choices = data.get("choices") or []
        if not choices:
            return None

        message = choices[0].get("message") or {}
        content = message.get("content")

        if isinstance(content, list):
            for chunk in content:
                if chunk.get("type") == "text":
                    return chunk.get("text")
        elif isinstance(content, str):
            return content

        return message.get("text")

    def _parse_machine_json(self, text: str, trace_id: str) -> Optional[dict]:
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}")
            if start == -1 or end == -1 or end <= start:
                logger.warning("vlm.response_not_json", extra={"trace_id": trace_id, "text": text[:200]})
                return None
            try:
                parsed = json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                logger.warning("vlm.response_partial_json", extra={"trace_id": trace_id, "text": text[:200]})
                return None

        machine = parsed.get("machine")
        confidence = parsed.get("confidence")
        if not machine or confidence is None:
            logger.warning("vlm.response_missing_fields", extra={"trace_id": trace_id, "payload": parsed})
            return None

        try:
            confidence_value = float(confidence)
        except (TypeError, ValueError):
            logger.warning("vlm.response_invalid_confidence", extra={"trace_id": trace_id, "confidence": confidence})
            return None

        parsed["confidence"] = max(0.0, min(1.0, confidence_value))

        raw_machine = str(machine).strip()
        canonical_machine, match_score = self._canonicalize_machine(raw_machine)
        parsed["raw_machine"] = raw_machine if raw_machine else None
        parsed["match_score"] = match_score if match_score > 0 else None

        if canonical_machine:
            parsed["machine"] = canonical_machine
            parsed["unmapped"] = False
            if match_score is not None and match_score < 0.9:
                parsed["confidence"] = min(parsed["confidence"], 0.6)
            if canonical_machine.lower() != raw_machine.lower():
                logger.info(
                    "vlm.response_normalized_machine",
                    extra={
                        "trace_id": trace_id,
                        "raw": raw_machine,
                        "normalized": canonical_machine,
                        "score": round(match_score, 3) if match_score is not None else None,
                    },
                )
        else:
            parsed["machine"] = raw_machine or "Unknown"
            parsed["unmapped"] = True
            parsed["confidence"] = min(parsed["confidence"], 0.49)
            logger.warning(
                "vlm.response_unmapped_machine",
                extra={
                    "trace_id": trace_id,
                    "raw": raw_machine,
                    "score": round(match_score, 3) if match_score is not None else None,
                },
            )

        return parsed

    def _record_failure(self, trace_id: str, error: str) -> None:
        trace_store.record(
            TraceEntry(
                trace_id=trace_id,
                mocked=False,
                error=error,
                model=self.settings.vlm_model,
                prompt=self._prompt,
            )
        )

    @staticmethod
    def _detect_api_mode(base_url: str) -> str:
        if not base_url:
            return "disabled"
        if HUGGINGFACE_HOST in base_url:
            return "huggingface"
        return "openai"

    @staticmethod
    def _build_openai_endpoint(base_url: str) -> str:
        trimmed = base_url.rstrip("/")
        if not trimmed:
            return ""

        if trimmed.endswith("/chat/completions"):
            return trimmed

        if trimmed.endswith("/v1"):
            return f"{trimmed}/chat/completions"

        return f"{trimmed}/v1/chat/completions"

    def _canonicalize_machine(self, value: str) -> Tuple[Optional[str], float]:
        normalized_value = self._normalize_machine_text(value)
        if not normalized_value:
            return None, 0.0

        best_score = 0.0
        best_option: Optional[str] = None

        for option in self.machine_options:
            option_normalized = self._normalize_machine_text(option)
            if option_normalized == normalized_value:
                return option, 1.0

            score = SequenceMatcher(None, normalized_value, option_normalized).ratio()

            if option_normalized in normalized_value or normalized_value in option_normalized:
                score = max(score, 0.95)

            if score > best_score:
                best_score = score
                best_option = option

        if best_option and best_score >= 0.65:
            return best_option, best_score

        return None, best_score

    @staticmethod
    def _normalize_machine_text(value: str) -> str:
        lowered = value.lower()
        stripped = re.sub(r"[^a-z0-9\s]", " ", lowered)
        collapsed = re.sub(r"\s+", " ", stripped)
        return collapsed.strip()
