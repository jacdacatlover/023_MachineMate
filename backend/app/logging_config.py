"""
Structured logging configuration for MachineMate backend.

Uses structlog to emit JSON-formatted logs with trace IDs, user context,
and request metadata for Cloud Logging integration.
"""

import logging
import logging.config
import os
import sys
from typing import Any

import structlog


def configure_logging() -> None:
    """
    Configure structured logging for the FastAPI application.

    Logs are emitted as JSON with contextual fields:
    - trace_id: Request trace ID for distributed tracing
    - user_id: Authenticated user ID (if available)
    - request_id: Unique request identifier
    - release_sha: Git commit SHA for deployment tracking
    - timestamp: ISO 8601 timestamp
    - level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    - event: Log message
    - logger: Logger name
    """
    environment = os.getenv("ENVIRONMENT", "development")
    log_level = os.getenv("LOG_LEVEL", "INFO" if environment == "production" else "DEBUG")
    log_format = os.getenv("LOG_FORMAT", "json" if environment == "production" else "console")

    # Configure Python's logging module
    logging.config.dictConfig({
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "json": {
                "()": structlog.stdlib.ProcessorFormatter,
                "processor": structlog.processors.JSONRenderer(),
                "foreign_pre_chain": [
                    structlog.stdlib.add_log_level,
                    structlog.stdlib.add_logger_name,
                    structlog.processors.TimeStamper(fmt="iso"),
                ],
            },
            "console": {
                "()": structlog.stdlib.ProcessorFormatter,
                "processor": structlog.dev.ConsoleRenderer(),
                "foreign_pre_chain": [
                    structlog.stdlib.add_log_level,
                    structlog.stdlib.add_logger_name,
                    structlog.processors.TimeStamper(fmt="iso"),
                ],
            },
        },
        "handlers": {
            "default": {
                "level": log_level,
                "class": "logging.StreamHandler",
                "stream": sys.stdout,
                "formatter": log_format,
            },
        },
        "loggers": {
            "": {  # Root logger
                "handlers": ["default"],
                "level": log_level,
                "propagate": True,
            },
            "machinemate": {
                "handlers": ["default"],
                "level": log_level,
                "propagate": False,
            },
            "uvicorn": {
                "handlers": ["default"],
                "level": "INFO",
                "propagate": False,
            },
            "uvicorn.access": {
                "handlers": ["default"],
                "level": "INFO",
                "propagate": False,
            },
        },
    })

    # Configure structlog
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.filter_by_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """
    Get a structured logger instance.

    Args:
        name: Logger name (typically __name__)

    Returns:
        Structured logger with context binding support

    Example:
        >>> logger = get_logger(__name__)
        >>> logger.info("user_login", user_id="123", method="email")
    """
    return structlog.get_logger(name)


def bind_context(**kwargs: Any) -> None:
    """
    Bind contextual data to the current execution context.

    All subsequent log calls within this context will include the bound data.

    Args:
        **kwargs: Key-value pairs to bind (trace_id, user_id, request_id, etc.)

    Example:
        >>> bind_context(trace_id="abc123", user_id="user_456")
        >>> logger.info("processing_request")  # Will include trace_id and user_id
    """
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(**kwargs)


def clear_context() -> None:
    """
    Clear all bound context variables.

    Useful for cleanup between requests in async contexts.
    """
    structlog.contextvars.clear_contextvars()
