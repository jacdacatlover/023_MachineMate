-- ============================================================================
-- MachineMate Initial Schema Migration
-- ============================================================================
-- This migration creates the core tables for the MachineMate application:
-- - users: User profiles (extends Supabase auth.users)
-- - machines: Machine catalog with metadata
-- - favorites: User-specific machine favorites
-- - history: User identification history
-- - media_assets: Media files (images, videos, thumbnails)
--
-- All tables have Row Level Security (RLS) enabled for data protection.
-- ============================================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- Users Table (Profile Data)
-- ============================================================================
-- Extends Supabase auth.users with additional profile information
-- The id column references auth.users(id) via foreign key

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  preferences jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb
);

-- Enable RLS
alter table public.users enable row level security;

-- RLS Policies: Users can only read/update their own profile
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- Allow insert during signup (triggered automatically)
create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

-- Create indexes
create index if not exists users_email_idx on public.users(email);
create index if not exists users_created_at_idx on public.users(created_at desc);

-- Updated at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on public.users
  for each row execute function public.handle_updated_at();

-- ============================================================================
-- Machines Table (Catalog)
-- ============================================================================
-- Central machine catalog with detailed information

create table if not exists public.machines (
  id text primary key,
  name text not null,
  category text not null,
  difficulty text not null default 'beginner',
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] default '{}',
  equipment_type text,

  -- Guidance content
  setup_steps jsonb default '[]'::jsonb,
  how_to_steps jsonb default '[]'::jsonb,
  common_mistakes jsonb default '[]'::jsonb,
  safety_tips jsonb default '[]'::jsonb,
  beginner_tips jsonb default '[]'::jsonb,

  -- Media references
  thumbnail_url text,
  image_url text,
  video_url text,
  muscle_diagram_url text,

  -- Metadata
  tags text[] default '{}',
  metadata jsonb default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS (read-only for all authenticated users)
alter table public.machines enable row level security;

-- RLS Policies: Anyone can read machines, only service role can modify
create policy "machines_select_all" on public.machines
  for select using (true); -- Public read access

create policy "machines_insert_service" on public.machines
  for insert with check (false); -- Only via service role (bypasses RLS)

create policy "machines_update_service" on public.machines
  for update using (false); -- Only via service role

create policy "machines_delete_service" on public.machines
  for delete using (false); -- Only via service role

-- Create indexes
create index if not exists machines_name_idx on public.machines(name);
create index if not exists machines_category_idx on public.machines(category);
create index if not exists machines_difficulty_idx on public.machines(difficulty);
create index if not exists machines_is_active_idx on public.machines(is_active) where is_active = true;
create index if not exists machines_created_at_idx on public.machines(created_at desc);

-- Text search index for machine names
create index if not exists machines_name_search_idx on public.machines using gin(to_tsvector('english', name));

-- Updated at trigger
create trigger machines_updated_at
  before update on public.machines
  for each row execute function public.handle_updated_at();

-- ============================================================================
-- Favorites Table
-- ============================================================================
-- User-specific machine favorites

create table if not exists public.favorites (
  user_id uuid not null references public.users(id) on delete cascade,
  machine_id text not null references public.machines(id) on delete cascade,
  created_at timestamptz not null default now(),
  notes text,
  metadata jsonb default '{}'::jsonb,

  primary key(user_id, machine_id)
);

-- Add missing columns to existing favorites table (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'favorites' AND column_name = 'notes') THEN
    ALTER TABLE public.favorites ADD COLUMN notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'favorites' AND column_name = 'metadata') THEN
    ALTER TABLE public.favorites ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Enable RLS
alter table public.favorites enable row level security;

-- RLS Policies: Users can only access their own favorites
create policy "favorites_owner" on public.favorites
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create indexes
create index if not exists favorites_user_id_idx on public.favorites(user_id);
create index if not exists favorites_machine_id_idx on public.favorites(machine_id);
create index if not exists favorites_created_at_idx on public.favorites(user_id, created_at desc);

-- ============================================================================
-- History Table
-- ============================================================================
-- User identification history and activity tracking

create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  machine_id text not null references public.machines(id) on delete cascade,

  -- Identification metadata
  confidence numeric(5,2),
  source text not null default 'unknown', -- 'backend_api', 'manual', 'fallback'

  -- Timestamps
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  -- Additional context
  photo_uri text,
  meta jsonb default '{}'::jsonb
);

-- Add missing columns to existing history table (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'history' AND column_name = 'created_at') THEN
    ALTER TABLE public.history ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'history' AND column_name = 'taken_at') THEN
    ALTER TABLE public.history ADD COLUMN taken_at timestamptz NOT NULL DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'history' AND column_name = 'confidence') THEN
    ALTER TABLE public.history ADD COLUMN confidence numeric(5,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'history' AND column_name = 'source') THEN
    ALTER TABLE public.history ADD COLUMN source text NOT NULL DEFAULT 'unknown';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'history' AND column_name = 'photo_uri') THEN
    ALTER TABLE public.history ADD COLUMN photo_uri text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'history' AND column_name = 'meta') THEN
    ALTER TABLE public.history ADD COLUMN meta jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Enable RLS
alter table public.history enable row level security;

-- RLS Policies: Users can only access their own history
create policy "history_owner" on public.history
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create indexes
create index if not exists history_user_id_idx on public.history(user_id);
create index if not exists history_machine_id_idx on public.history(machine_id);
create index if not exists history_taken_at_idx on public.history(user_id, taken_at desc);
create index if not exists history_created_at_idx on public.history(created_at desc);

-- ============================================================================
-- Media Assets Table
-- ============================================================================
-- Track media files (images, videos, thumbnails) with metadata

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),

  -- Asset metadata
  asset_type text not null check (asset_type in ('image', 'video', 'thumbnail', 'diagram')),
  content_type text not null,
  file_size bigint,

  -- Storage reference
  bucket_name text not null,
  storage_path text not null,
  public_url text,

  -- Ownership (nullable for system assets)
  user_id uuid references public.users(id) on delete cascade,
  machine_id text references public.machines(id) on delete cascade,

  -- Dimensions (for images/videos)
  width integer,
  height integer,
  duration integer, -- for videos (in seconds)

  -- Metadata
  metadata jsonb default '{}'::jsonb,
  tags text[] default '{}',

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.media_assets enable row level security;

-- RLS Policies: Users can access their own assets and public system assets
create policy "media_assets_select_own_or_public" on public.media_assets
  for select using (
    user_id is null -- System assets (no owner)
    or auth.uid() = user_id -- User's own assets
  );

create policy "media_assets_insert_own" on public.media_assets
  for insert with check (auth.uid() = user_id);

create policy "media_assets_update_own" on public.media_assets
  for update using (auth.uid() = user_id);

create policy "media_assets_delete_own" on public.media_assets
  for delete using (auth.uid() = user_id);

-- Create indexes
create index if not exists media_assets_user_id_idx on public.media_assets(user_id);
create index if not exists media_assets_machine_id_idx on public.media_assets(machine_id);
create index if not exists media_assets_asset_type_idx on public.media_assets(asset_type);
create index if not exists media_assets_bucket_path_idx on public.media_assets(bucket_name, storage_path);
create index if not exists media_assets_created_at_idx on public.media_assets(created_at desc);

-- Updated at trigger
create trigger media_assets_updated_at
  before update on public.media_assets
  for each row execute function public.handle_updated_at();

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function to automatically create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create user profile on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Data Retention Policies
-- ============================================================================

-- Function to clean up old history records (optional - can be scheduled)
create or replace function public.cleanup_old_history(days_to_keep integer default 90)
returns integer as $$
declare
  deleted_count integer;
begin
  delete from public.history
  where taken_at < now() - (days_to_keep || ' days')::interval;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$ language plpgsql;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

comment on table public.users is 'User profile data extending Supabase auth.users';
comment on table public.machines is 'Machine catalog with guidance content';
comment on table public.favorites is 'User-specific machine favorites';
comment on table public.history is 'User identification history and activity';
comment on table public.media_assets is 'Media file tracking with storage references';

comment on function public.handle_new_user() is 'Automatically creates user profile when auth user signs up';
comment on function public.cleanup_old_history(integer) is 'Deletes history records older than specified days (default 90)';
