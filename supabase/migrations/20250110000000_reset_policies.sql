-- ============================================================================
-- Reset existing policies for clean migration
-- ============================================================================
-- This migration runs BEFORE the main schema migration to clean up
-- existing policies so they can be recreated consistently
-- ============================================================================

-- Drop all existing policies to allow clean recreation
DO $$
BEGIN
  -- favorites table policies
  DROP POLICY IF EXISTS "favorites_owner" ON public.favorites;
  
  -- history table policies
  DROP POLICY IF EXISTS "history_owner" ON public.history;
  
  RAISE NOTICE 'Existing policies dropped successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy drop handled: %', SQLERRM;
END $$;
