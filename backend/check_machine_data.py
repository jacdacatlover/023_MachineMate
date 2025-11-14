#!/usr/bin/env python3
"""
Check the actual data structure returned from the database
"""
import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.models import Machine

# Production DATABASE_URL
DATABASE_URL = "postgresql+asyncpg://postgres.gemxkgkpkaombqkycegc:1OVNWOgA3SfwZcmT@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"

async def check_machine_data():
    """Check what the database returns"""
    try:
        print("Connecting to database...")
        engine = create_async_engine(DATABASE_URL, echo=False)
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async with async_session() as session:
            # Get first machine
            stmt = select(Machine).limit(1)
            result = await session.execute(stmt)
            machine = result.scalar_one()

            print(f"\n✓ Machine ID: {machine.id}")
            print(f"✓ Machine Name: {machine.name}")
            print(f"\nField types:")
            print(f"  setup_steps type: {type(machine.setup_steps)}")
            print(f"  setup_steps value: {machine.setup_steps}")
            print(f"\n  how_to_steps type: {type(machine.how_to_steps)}")
            print(f"  how_to_steps value: {machine.how_to_steps}")
            print(f"\n  primary_muscles type: {type(machine.primary_muscles)}")
            print(f"  primary_muscles value: {machine.primary_muscles}")
            print(f"\n  tags type: {type(machine.tags)}")
            print(f"  tags value: {machine.tags}")
            print(f"\n  meta type: {type(machine.meta)}")
            print(f"  meta value: {machine.meta}")

            # Try to convert to Pydantic model
            print("\n\nAttempting Pydantic validation...")
            from app.schemas import MachineResponse
            try:
                machine_response = MachineResponse.model_validate(machine)
                print("✓ Pydantic validation SUCCESS")
            except Exception as e:
                print(f"❌ Pydantic validation FAILED: {e}")

        await engine.dispose()
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    asyncio.run(check_machine_data())
