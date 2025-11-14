-- ============================================================================
-- Alter existing tables to match new schema
-- ============================================================================
-- This migration handles tables that were manually created in Phase 0
-- and ensures they have all the columns required by the full schema
-- ============================================================================

-- Add missing columns to history table if they don't exist
DO $$
BEGIN
  -- Add created_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'history'
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.history ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
    RAISE NOTICE 'Added created_at column to history table';
  END IF;

  -- Add taken_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'history'
    AND column_name = 'taken_at'
  ) THEN
    ALTER TABLE public.history ADD COLUMN taken_at timestamptz NOT NULL DEFAULT now();
    RAISE NOTICE 'Added taken_at column to history table';
  END IF;

  -- Add confidence column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'history'
    AND column_name = 'confidence'
  ) THEN
    ALTER TABLE public.history ADD COLUMN confidence numeric(5,2);
    RAISE NOTICE 'Added confidence column to history table';
  END IF;

  -- Add source column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'history'
    AND column_name = 'source'
  ) THEN
    ALTER TABLE public.history ADD COLUMN source text NOT NULL DEFAULT 'unknown';
    RAISE NOTICE 'Added source column to history table';
  END IF;

  -- Add photo_uri column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'history'
    AND column_name = 'photo_uri'
  ) THEN
    ALTER TABLE public.history ADD COLUMN photo_uri text;
    RAISE NOTICE 'Added photo_uri column to history table';
  END IF;

  -- Add meta column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'history'
    AND column_name = 'meta'
  ) THEN
    ALTER TABLE public.history ADD COLUMN meta jsonb DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added meta column to history table';
  END IF;

  RAISE NOTICE 'History table schema updated successfully';
END $$;

-- Add missing columns to favorites table if they don't exist
DO $$
BEGIN
  -- Add notes column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'favorites'
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.favorites ADD COLUMN notes text;
    RAISE NOTICE 'Added notes column to favorites table';
  END IF;

  -- Add metadata column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'favorites'
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.favorites ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added metadata column to favorites table';
  END IF;

  RAISE NOTICE 'Favorites table schema updated successfully';
END $$;
