#!/usr/bin/env python3
"""
Test database connection to Supabase Postgres.

This script verifies that:
1. DATABASE_URL is configured correctly
2. Backend can connect to Supabase
3. Basic queries execute successfully

Usage:
    # From backend directory with activated venv
    python scripts/test_connection.py

    # Or with python path
    PYTHONPATH=. python scripts/test_connection.py
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.db import get_engine, close_db
from app.config import settings
from sqlalchemy import text


async def test_connection():
    """Test database connection and run basic queries."""
    print("=" * 70)
    print("MachineMate Backend - Database Connection Test")
    print("=" * 70)
    print()

    # Check configuration
    print("1. Checking configuration...")
    if not settings.DATABASE_URL:
        print("   ✗ DATABASE_URL is not set")
        print("   Please set DATABASE_URL in backend/.env")
        print()
        print("   Example:")
        print("   DATABASE_URL=postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres")
        return False

    # Mask the password in the URL for display
    db_url = settings.DATABASE_URL
    if "@" in db_url:
        parts = db_url.split("@")
        creds = parts[0].split("://")[1]
        if ":" in creds:
            user = creds.split(":")[0]
            masked_url = db_url.replace(creds, f"{user}:****")
        else:
            masked_url = db_url
    else:
        masked_url = db_url

    print(f"   ✓ DATABASE_URL configured: {masked_url}")
    print(f"   ✓ Environment: {settings.ENVIRONMENT}")
    print()

    # Test connection
    print("2. Testing database connection...")
    try:
        engine = get_engine()
        print(f"   ✓ Engine created: {engine.url.drivername}")
    except Exception as e:
        print(f"   ✗ Failed to create engine: {e}")
        return False

    try:
        async with engine.connect() as conn:
            print("   ✓ Successfully connected to database")
    except Exception as e:
        print(f"   ✗ Connection failed: {e}")
        print()
        print("   Troubleshooting:")
        print("   - Verify DATABASE_URL is correct")
        print("   - Check network connectivity")
        print("   - Ensure Supabase project is active")
        print("   - Verify database password")
        return False

    print()

    # Test basic query
    print("3. Testing basic query...")
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"   ✓ Query successful")
            print(f"   ✓ PostgreSQL version: {version.split()[0] if version else 'Unknown'}")
    except Exception as e:
        print(f"   ✗ Query failed: {e}")
        return False

    print()

    # Test schema query
    print("4. Checking database schema...")
    try:
        async with engine.begin() as conn:
            # Query for existing tables
            result = await conn.execute(
                text("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    ORDER BY table_name
                """)
            )
            tables = [row[0] for row in result.fetchall()]

            if tables:
                print(f"   ✓ Found {len(tables)} table(s) in public schema:")
                for table in tables:
                    print(f"     - {table}")
            else:
                print("   ⚠ No tables found in public schema")
                print("   This is expected if you haven't run Supabase migrations yet")

    except Exception as e:
        print(f"   ✗ Schema query failed: {e}")
        return False

    print()

    # Test Supabase auth schema (if it exists)
    print("5. Checking Supabase auth integration...")
    try:
        async with engine.begin() as conn:
            result = await conn.execute(
                text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.schemata
                        WHERE schema_name = 'auth'
                    )
                """)
            )
            has_auth = result.scalar()

            if has_auth:
                print("   ✓ Supabase auth schema detected")

                # Count auth users (if table exists)
                result = await conn.execute(
                    text("SELECT COUNT(*) FROM auth.users")
                )
                user_count = result.scalar()
                print(f"   ✓ Auth users: {user_count}")
            else:
                print("   ⚠ Supabase auth schema not found")
                print("   Are you sure this is a Supabase database?")

    except Exception as e:
        print(f"   ⚠ Auth check failed (this may be normal): {e}")

    print()

    # Cleanup
    print("6. Cleaning up...")
    await close_db()
    print("   ✓ Connection closed")

    print()
    print("=" * 70)
    print("✅ All tests passed! Database connection is working correctly.")
    print("=" * 70)
    print()
    print("Next steps:")
    print("1. Create database schema using Supabase SQL Editor or migrations")
    print("2. Configure Row Level Security (RLS) policies")
    print("3. Set up Supabase Storage buckets for media")
    print()

    return True


async def main():
    """Main entry point."""
    try:
        success = await test_connection()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
