"""
Logging middleware for request tracing and structured logging context.
"""

import os
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.logging_config import bind_context, clear_context, get_logger

logger = get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to inject structured logging context for each request.

    Adds the following context to all logs:
    - trace_id: Unique identifier for the request
    - request_id: Alternative name for trace_id (Cloud Logging compatibility)
    - user_id: Authenticated user ID (if available)
    - release_sha: Git commit SHA from environment
    - method: HTTP method
    - path: Request path
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate or extract trace ID
        trace_id = request.headers.get("X-Cloud-Trace-Context", str(uuid.uuid4()))
        # Extract trace ID from Google Cloud Trace format
        # Supports both formats:
        # - Simple: "TRACE_ID/SPAN_ID;o=TRACE_TRUE"
        # - Full: "projects/PROJECT_ID/traces/TRACE_ID/SPAN_ID;o=TRACE_TRUE"
        if "traces/" in trace_id:  # Full format
            trace_id = trace_id.split("traces/")[1].split("/")[0]
        elif "/" in trace_id:  # Simple format
            trace_id = trace_id.split("/")[0]

        # Get release SHA from environment (set by CI/CD)
        release_sha = os.getenv("RELEASE_SHA", "unknown")

        # Extract user ID from request state (set by auth middleware)
        user_id = getattr(request.state, "user_id", None)

        # Bind context for this request
        bind_context(
            trace_id=trace_id,
            request_id=trace_id,  # Alias for compatibility
            user_id=user_id,
            release_sha=release_sha,
            method=request.method,
            path=request.url.path,
        )

        # Log request start
        logger.info(
            "request_started",
            method=request.method,
            path=request.url.path,
            client_host=request.client.host if request.client else None,
        )

        try:
            response = await call_next(request)

            # Log request completion
            logger.info(
                "request_completed",
                status_code=response.status_code,
            )

            # Add trace ID to response headers for client correlation
            response.headers["X-Trace-Id"] = trace_id

            return response

        except Exception as exc:
            # Log request failure
            logger.exception(
                "request_failed",
                exc_info=exc,
            )
            raise

        finally:
            # Clean up context after request
            clear_context()
