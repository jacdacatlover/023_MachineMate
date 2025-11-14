from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


@dataclass
class TraceEntry:
    trace_id: str
    machine: Optional[str] = None
    confidence: Optional[float] = None
    mocked: bool = False
    raw_text: Optional[str] = None
    raw_machine: Optional[str] = None
    match_score: Optional[float] = None
    unmapped: bool = False
    model: Optional[str] = None
    prompt: Optional[str] = None
    prompt_variant: Optional[str] = None  # Tracks which prompt variant was used for A/B testing
    error: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))


class TraceStore:
    """
    Very small in-memory store that keeps the last N traces so we can inspect
    raw VLM responses when debugging misclassifications.
    """

    def __init__(self, max_items: int = 100) -> None:
        self.max_items = max_items
        self._entries: "OrderedDict[str, TraceEntry]" = OrderedDict()

    def record(self, entry: TraceEntry) -> None:
        trace_id = entry.trace_id
        if trace_id in self._entries:
            self._entries.pop(trace_id)
        self._entries[trace_id] = entry
        self._trim()

    def get(self, trace_id: str) -> Optional[TraceEntry]:
        entry = self._entries.get(trace_id)
        if entry:
            # Refresh ordering for LRU semantics.
            self._entries.move_to_end(trace_id)
        return entry

    def clear(self) -> None:
        self._entries.clear()

    def _trim(self) -> None:
        while len(self._entries) > self.max_items:
            self._entries.popitem(last=False)


trace_store = TraceStore()
