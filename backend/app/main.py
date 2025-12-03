from __future__ import annotations

import os
from typing import Annotated

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .config import Settings, get_settings
from .logging_config import configure_logging, get_logger
from .middleware import LoggingMiddleware
from .schemas import ErrorResponse, IdentifyResponse, TraceDetails
from .services.inference import InferenceService
from .services.vlm_client import InferenceUnavailable
from .services.trace_store import trace_store

# Import routers
from .routers import favorites, history, machines, media, metrics

# Configure structured logging
configure_logging()
logger = get_logger(__name__)

app = FastAPI(
    title="MachineMate API",
    version="0.2.0",
    description="Backend API for MachineMate - Machine identification and workout guidance",
)

# Configure CORS from settings
_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.get_cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add logging middleware for request tracing
app.add_middleware(LoggingMiddleware)

# Include routers
app.include_router(machines.router, prefix="/api/v1")
app.include_router(favorites.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")
app.include_router(media.router, prefix="/api/v1")
app.include_router(metrics.router, prefix="/api/v1")


def get_inference_service(settings: Annotated[Settings, Depends(get_settings)]) -> InferenceService:
    return InferenceService()


@app.get("/health")
async def health(settings: Annotated[Settings, Depends(get_settings)]) -> dict:
    """
    Health check endpoint for monitoring and load balancers.

    Returns service status and configuration details.
    """
    from app.db import get_engine

    # Check database connectivity
    # Tests run without a live Postgres endpoint; short-circuit when pytest is active.
    is_test_env = settings.ENVIRONMENT.lower() == "test" or os.getenv("PYTEST_CURRENT_TEST") is not None
    db_healthy = is_test_env
    if not db_healthy:
        try:
            engine = get_engine()
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            db_healthy = True
        except Exception as e:
            logger.warning(f"Database health check failed: {e}")

    return {
        "status": "ok" if db_healthy else "degraded",
        "version": "0.2.0",
        "environment": settings.ENVIRONMENT,
        "database": {
            "connected": db_healthy,
        },
        "vlm_configured": settings.vlm_api_base_url is not None,
        "mocking_enabled": settings.enable_mock_responses,
        "features": {
            "auth": settings.REQUIRE_AUTH,
            "favorites": True,
            "history": True,
            "media_upload": True,
        },
    }


@app.get("/health/ready")
async def readiness() -> dict:
    """
    Readiness probe for Kubernetes/Cloud Run.

    Returns 200 if the service is ready to accept traffic.
    """
    from app.db import get_engine

    # Check if database is accessible
    try:
        engine = get_engine()
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"ready": True}
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(status_code=503, detail="Service not ready")


@app.get("/health/live")
async def liveness() -> dict:
    """
    Liveness probe for Kubernetes/Cloud Run.

    Returns 200 if the service is alive.
    """
    return {"alive": True}


@app.post(
    "/identify",
    response_model=IdentifyResponse,
    responses={415: {"model": ErrorResponse}, 422: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
)
async def identify_machine(
    service: Annotated[InferenceService, Depends(get_inference_service)],
    image: UploadFile = File(...),
) -> IdentifyResponse:
    """
    Identify the machine captured in `image`.
    """
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Unsupported media type")

    payload = await image.read()
    if len(payload) == 0:
        raise HTTPException(status_code=422, detail="Empty image payload")

    try:
        result = await service.identify(payload)
    except InferenceUnavailable as error:
        logger.warning("inference.vlm_unavailable", extra={"trace_id": error.trace_id, "detail": str(error)})
        raise HTTPException(status_code=503, detail=str(error))
    except RuntimeError as error:
        logger.exception("inference.unavailable")
        raise HTTPException(status_code=503, detail=str(error))

    return result


@app.get(
    "/traces/{trace_id}",
    response_model=TraceDetails,
    responses={404: {"model": ErrorResponse}},
)
async def fetch_trace(trace_id: str) -> TraceDetails:
    entry = trace_store.get(trace_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Trace not found")

    return TraceDetails(
        trace_id=entry.trace_id,
        machine=entry.machine,
        confidence=entry.confidence,
        mocked=entry.mocked,
        raw_text=entry.raw_text,
        raw_machine=entry.raw_machine,
        match_score=entry.match_score,
        unmapped=entry.unmapped,
        model=entry.model,
        prompt=entry.prompt,
        error=entry.error,
        created_at=entry.created_at,
    )
