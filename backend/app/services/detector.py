from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Sequence


@dataclass
class Detection:
    """
    Minimal representation of a detected region of interest.
    """

    x: int
    y: int
    width: int
    height: int
    confidence: float


class Detector:
    """
    Placeholder detector that simply indicates no crop is available.

    Eventually this will wrap YOLO/RT-DETR/etc. to produce bounding boxes for
    gym equipment, but the interface lets us land the API contract today.
    """

    async def detect(self, image_bytes: bytes) -> Sequence[Detection]:
        return []


async def crop_image_to_detection(image_bytes: bytes, detection: Detection) -> Optional[bytes]:
    """
    Future helper for cropping the image to the detection bounding box.
    Today this is a stub returning None to keep pre-crop support optional.
    """
    return None
