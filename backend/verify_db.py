#!/usr/bin/env python3
"""
Verify production database has machines data
"""
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text

# Production DATABASE_URL
DATABASE_URL = "postgresql+asyncpg://postgres.gemxkgkpkaombqkycegc:1OVNWOgA3SfwZcmT@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"

async def verify_database():
    """Verify the database has machines data"""
    try:
        print(f"Connecting to database...")
        engine = create_async_engine(DATABASE_URL, echo=False)

        async with engine.begin() as conn:
            # Check if machines table exists
            result = await conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = 'machines'
                );
            """))
            table_exists = result.scalar()
            print(f"✓ Machines table exists: {table_exists}")

            if table_exists:
                # Count machines
                result = await conn.execute(text("SELECT COUNT(*) FROM machines;"))
                count = result.scalar()
                print(f"✓ Total machines in database: {count}")

                # Get first 5 machines
                result = await conn.execute(text("SELECT id, name, category FROM machines LIMIT 5;"))
                machines = result.fetchall()
                print(f"\nSample machines:")
                for machine in machines:
                    print(f"  - {machine[0]}: {machine[1]} ({machine[2]})")
            else:
                print("❌ Machines table does not exist!")

        await engine.dispose()
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    asyncio.run(verify_database())
