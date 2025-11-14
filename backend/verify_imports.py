#!/usr/bin/env python3
"""Verify that all new dependencies can be imported."""

import sys

def verify_imports():
    """Test importing all new Phase 1 dependencies."""
    errors = []

    # Test database dependencies
    try:
        import sqlalchemy
        print("✓ sqlalchemy imported successfully")
    except ImportError as e:
        errors.append(f"✗ sqlalchemy: {e}")

    try:
        import asyncpg
        print("✓ asyncpg imported successfully")
    except ImportError as e:
        errors.append(f"✗ asyncpg: {e}")

    # Test auth dependencies
    try:
        import jose
        print("✓ python-jose imported successfully")
    except ImportError as e:
        errors.append(f"✗ python-jose: {e}")

    # Test logging dependencies
    try:
        import structlog
        print("✓ structlog imported successfully")
    except ImportError as e:
        errors.append(f"✗ structlog: {e}")

    # Test testing dependencies
    try:
        import pytest
        print("✓ pytest imported successfully")
    except ImportError as e:
        errors.append(f"✗ pytest: {e}")

    if errors:
        print("\nErrors found:")
        for error in errors:
            print(f"  {error}")
        sys.exit(1)
    else:
        print("\n✅ All new dependencies imported successfully!")
        sys.exit(0)

if __name__ == "__main__":
    verify_imports()
