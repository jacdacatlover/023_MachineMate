#!/usr/bin/env python3
"""
Database Seed Script for Machines Data
Imports machine definitions from ../src/data/machines.json into Supabase
"""

import json
import os
import sys
from pathlib import Path
from supabase import create_client, Client

# Get DATABASE_URL from environment
DATABASE_URL = os.getenv("DATABASE_URL") or "postgresql://postgres.gemxkgkpkaombqkycegc:1OVNWOgA3SfwZcmT@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"

# Supabase credentials
SUPABASE_URL = "https://gemxkgkpkaombqkycegc.supabase.co"
# Use service role key for seeding (bypasses RLS)
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbXhrZ2twa2FvbWJxa3ljZWdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjY2NTA0MiwiZXhwIjoyMDc4MjQxMDQyfQ.H3bpFWGM_S_x7ksKZhusUuerIhV2k5THMHNTxOy9Z4o"

def load_machines_json():
    """Load machines data from src/data/machines.json"""
    json_path = Path(__file__).parent.parent / "src" / "data" / "machines.json"
    print(f"Loading machines from: {json_path}")

    with open(json_path, "r", encoding="utf-8") as f:
        machines = json.load(f)

    print(f"Loaded {len(machines)} machines")
    return machines

def seed_database():
    """Seed the database with machine data"""
    try:
        # Create Supabase client
        print("Connecting to Supabase...")
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

        # Load machines data
        machines = load_machines_json()

        # Clear existing data
        print("Clearing existing machines...")
        supabase.table("machines").delete().neq("id", "").execute()

        # Insert each machine
        print("Inserting machines...")
        for machine in machines:
            # Convert camelCase to snake_case for database columns
            db_machine = {
                "id": machine["id"],
                "name": machine["name"],
                "category": machine["category"],
                "primary_muscles": machine["primaryMuscles"],
                "secondary_muscles": machine.get("secondaryMuscles", []),
                "difficulty": machine["difficulty"],
                "setup_steps": machine["setupSteps"],
                "how_to_steps": machine["howToSteps"],
                "common_mistakes": machine["commonMistakes"],
                "safety_tips": machine["safetyTips"],
                "beginner_tips": machine.get("beginnerTips", []),
                "muscle_diagram_url": machine.get("muscleDiagramImage"),
                "video_url": machine.get("demoVideoUrl"),
                "tags": machine.get("searchKeywords", []),
            }

            supabase.table("machines").insert(db_machine).execute()
            print(f"  ✓ Inserted: {machine['name']}")

        print(f"\n✅ Successfully seeded {len(machines)} machines!")
        return True

    except Exception as e:
        print(f"\n❌ Error seeding database: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = seed_database()
    sys.exit(0 if success else 1)
