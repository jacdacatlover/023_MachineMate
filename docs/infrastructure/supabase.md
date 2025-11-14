# Supabase Configuration Guide

This document describes the Supabase setup for MachineMate, including database schema, authentication, storage buckets, and Row Level Security (RLS) policies.

## Table of Contents
- [Project Overview](#project-overview)
- [Environment Setup](#environment-setup)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [Storage Buckets](#storage-buckets)
- [Row Level Security](#row-level-security)
- [Migrations](#migrations)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Project Overview

MachineMate uses Supabase for:
- **Authentication**: User signup, login, and session management
- **Database**: Postgres with async SQLAlchemy (via asyncpg)
- **Storage**: Media files (images, videos, thumbnails)
- **Real-time** (future): Live updates for collaborative features

### Architecture

```
Mobile App (Expo)
  ↓ Supabase Auth (JWT)
  ↓
FastAPI Backend
  ↓ Service Role Key
  ↓
Supabase Postgres (with RLS)
```

- **Mobile app** authenticates users via Supabase Auth (email/password, magic links, social)
- **Backend** validates JWTs using JWKS and accesses database with service role key
- **RLS policies** ensure users can only access their own data

## Environment Setup

### Required Environment Variables

#### Mobile App (`.env`)
```bash
# Supabase configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key...

# Backend API
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000  # or Cloud Run URL
```

#### Backend (`backend/.env`)
```bash
# Database connection (use connection pooling for production)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-[REGION].pooler.supabase.com:6543/postgres

# JWT validation
SUPABASE_JWT_AUDIENCE=authenticated
SUPABASE_JWT_ISSUER=https://[PROJECT-REF].supabase.co/auth/v1
SUPABASE_JWT_JWKS_URL=https://[PROJECT-REF].supabase.co/auth/v1/keys

# Service role key (SENSITIVE - never expose to client!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key...

# Storage
MEDIA_PUBLIC_BASE_URL=https://[PROJECT-REF].supabase.co/storage/v1/object/public/
STORAGE_BUCKET_MACHINES=machines
STORAGE_BUCKET_TUTORIALS=tutorials
STORAGE_BUCKET_USER_UPLOADS=user-uploads
```

### Getting Credentials

1. **Project URL and Keys**:
   - Go to [app.supabase.com](https://app.supabase.com)
   - Select your project → Settings → API
   - Copy `Project URL`, `anon key`, and `service_role key`

2. **Database Connection String**:
   - Settings → Database → Connection string
   - Use **Connection pooling** (port 6543) for production
   - Use **Direct connection** (port 5432) for local development

3. **JWT Settings**:
   - Settings → API → JWT Settings
   - Note the `aud` (audience) and `iss` (issuer)
   - JWKS URL is `https://[PROJECT-REF].supabase.co/auth/v1/keys`

## Database Schema

### Core Tables

#### `public.users`
User profile data extending `auth.users`.

```sql
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  preferences jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb
);
```

**Indexes:**
- `users_email_idx` on `email`
- `users_created_at_idx` on `created_at DESC`

#### `public.machines`
Machine catalog with guidance content.

```sql
create table public.machines (
  id text primary key,
  name text not null,
  category text not null,
  difficulty text not null default 'beginner',
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] default '{}',
  setup_steps jsonb default '[]'::jsonb,
  how_to_steps jsonb default '[]'::jsonb,
  common_mistakes jsonb default '[]'::jsonb,
  safety_tips jsonb default '[]'::jsonb,
  beginner_tips jsonb default '[]'::jsonb,
  thumbnail_url text,
  image_url text,
  video_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Indexes:**
- `machines_name_idx` on `name`
- `machines_category_idx` on `category`
- `machines_difficulty_idx` on `difficulty`
- `machines_name_search_idx` using GIN for full-text search

#### `public.favorites`
User-specific machine favorites.

```sql
create table public.favorites (
  user_id uuid not null references public.users(id) on delete cascade,
  machine_id text not null references public.machines(id) on delete cascade,
  created_at timestamptz not null default now(),
  notes text,
  metadata jsonb default '{}'::jsonb,
  primary key(user_id, machine_id)
);
```

**Indexes:**
- `favorites_user_id_idx` on `user_id`
- `favorites_machine_id_idx` on `machine_id`
- `favorites_created_at_idx` on `(user_id, created_at DESC)`

#### `public.history`
User identification history and activity tracking.

```sql
create table public.history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  machine_id text not null references public.machines(id) on delete cascade,
  confidence numeric(5,2),
  source text not null default 'unknown',
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  photo_uri text,
  meta jsonb default '{}'::jsonb
);
```

**Indexes:**
- `history_user_id_idx` on `user_id`
- `history_taken_at_idx` on `(user_id, taken_at DESC)`

#### `public.media_assets`
Media file tracking with storage references.

```sql
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null check (asset_type in ('image', 'video', 'thumbnail', 'diagram')),
  content_type text not null,
  file_size bigint,
  bucket_name text not null,
  storage_path text not null,
  public_url text,
  user_id uuid references public.users(id) on delete cascade,
  machine_id text references public.machines(id) on delete cascade,
  width integer,
  height integer,
  duration integer,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Entity Relationships

```
auth.users (Supabase)
  ↓ 1:1
public.users
  ↓ 1:N
public.favorites ←→ public.machines
  ↓ 1:N
public.history → public.machines
  ↓ 1:N
public.media_assets
```

## Authentication

### Supabase Auth Flow

1. **Signup/Login** (Mobile App → Supabase):
   ```typescript
   const { data, error } = await supabase.auth.signUp({
     email: 'user@example.com',
     password: 'secure-password'
   })
   ```

2. **Get Session Token**:
   ```typescript
   const { data: { session } } = await supabase.auth.getSession()
   const accessToken = session?.access_token
   ```

3. **Call Backend API** (Mobile App → FastAPI):
   ```typescript
   const response = await fetch(`${API_BASE_URL}/favorites`, {
     headers: {
       'Authorization': `Bearer ${accessToken}`
     }
   })
   ```

4. **Backend Validates JWT** (FastAPI):
   ```python
   from app.auth import get_current_user

   @app.get("/favorites")
   async def get_favorites(user: User = Depends(get_current_user)):
       # user.id is validated from JWT
       return {"user_id": user.id}
   ```

### JWT Validation

The backend validates JWTs using:
- **JWKS** (JSON Web Key Set) for signature verification
- **Audience** check (`aud` == "authenticated")
- **Issuer** check (`iss` == Supabase project URL)
- **Expiration** check (token not expired)
- **Caching** (JWKS cached for 15 minutes)

See `backend/app/auth.py` for implementation details.

## Storage Buckets

### Bucket Configuration

#### 1. `machines` (Public)
Reference images and diagrams for machine catalog.

- **Access**: Public read
- **Policies**: Only service role can write
- **File types**: PNG, JPG, WebP
- **Max size**: 5 MB per image

#### 2. `tutorials` (Private)
Tutorial videos and premium content.

- **Access**: Authenticated users only (via signed URLs)
- **Policies**: Users can read, only service role can write
- **File types**: MP4, MOV
- **Max size**: 100 MB per video

#### 3. `user-uploads` (Private)
User-generated content (machine photos from camera).

- **Access**: User can only access their own files
- **Policies**: Users can CRUD their own files
- **File types**: PNG, JPG
- **Max size**: 10 MB per image
- **Retention**: Optional cleanup after 90 days

### Creating Buckets

```sql
-- Create buckets via Supabase dashboard or SQL
insert into storage.buckets (id, name, public)
values
  ('machines', 'machines', true),
  ('tutorials', 'tutorials', false),
  ('user-uploads', 'user-uploads', false);
```

### Storage Policies

```sql
-- machines bucket: public read, service role write
create policy "machines_public_read"
  on storage.objects for select
  using (bucket_id = 'machines');

-- user-uploads bucket: users can access their own files
create policy "user_uploads_own_files"
  on storage.objects for all
  using (
    bucket_id = 'user-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
```

## Row Level Security

All tables have RLS enabled. **This is critical** - never disable RLS in production.

### Policy Patterns

#### 1. User-Owned Data
Users can only access their own data.

```sql
create policy "favorites_owner" on public.favorites
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

#### 2. Public Read, Service Role Write
Anyone can read, only backend can modify.

```sql
create policy "machines_select_all" on public.machines
  for select using (true);

create policy "machines_modify_service" on public.machines
  for all using (false);  -- Bypassed by service role
```

#### 3. Self-Managed Profiles
Users can read and update their own profile.

```sql
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);
```

### Testing RLS

Always test RLS policies before deploying:

```sql
-- Switch to authenticated user context
set local role authenticated;
set local request.jwt.claims.sub to '550e8400-e29b-41d4-a716-446655440000';

-- Try to access another user's data (should fail)
select * from favorites where user_id != '550e8400-e29b-41d4-a716-446655440000';

-- Reset to superuser
reset role;
```

## Migrations

### Applying Migrations

1. **Link Supabase Project**:
   ```bash
   supabase login
   supabase link --project-ref your-project-ref
   ```

2. **Push Migrations**:
   ```bash
   supabase db push
   ```

3. **Verify**:
   ```bash
   supabase db diff --schema public
   ```

### Migration Files

Migrations are stored in `supabase/migrations/`:
- `20250110_initial_schema.sql` - Core tables, indexes, RLS

### CI/CD Integration

GitHub Actions automatically applies migrations on deploy:

```yaml
- name: Apply Supabase Migrations
  run: |
    supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
    supabase db push
```

## Testing

### Local Development

1. **Start Local Supabase** (optional):
   ```bash
   supabase start
   ```

2. **Run Migrations**:
   ```bash
   supabase db reset  # Fresh start
   ```

3. **Seed Data**:
   ```bash
   psql $DATABASE_URL < scripts/seed_machines.sql
   ```

### Backend Tests

Run pytest with database connection:

```bash
cd backend
pytest tests/test_auth.py -v
```

### RLS Tests

Create test users and verify policies:

```python
# tests/test_rls.py
async def test_user_cannot_access_others_favorites(db_session, user1, user2):
    # user1 tries to access user2's favorites
    result = await db_session.execute(
        select(Favorite).where(Favorite.user_id == user2.id)
    )
    # Should be empty due to RLS
    assert len(result.scalars().all()) == 0
```

## Troubleshooting

### Connection Issues

**Problem**: `DATABASE_URL` connection fails

**Solutions**:
1. Verify connection string format: `postgresql://postgres.[REF]:[PASSWORD]@aws-[REGION].pooler.supabase.com:6543/postgres`
2. Use connection pooling (port 6543) for serverless deployments
3. Check Supabase project is active and accessible
4. Verify IP allowlist (if configured)

### JWT Validation Failures

**Problem**: `401 Unauthorized` on authenticated endpoints

**Solutions**:
1. Verify `SUPABASE_JWT_ISSUER` matches your project URL
2. Check `SUPABASE_JWT_JWKS_URL` is accessible
3. Ensure token hasn't expired (default 1 hour)
4. Verify `SUPABASE_JWT_AUDIENCE` is "authenticated"

### RLS Policy Issues

**Problem**: Users can't access their own data

**Solutions**:
1. Verify `auth.uid()` in policy matches `user_id` column type (UUID)
2. Check user is authenticated (not using anon key)
3. Test policy in SQL Editor with `set local role authenticated`
4. Ensure service role key is used for backend operations

### Storage Upload Failures

**Problem**: File uploads fail with 403 Forbidden

**Solutions**:
1. Verify bucket exists and has correct policies
2. Check file path format: `user-uploads/{user_id}/{filename}`
3. Ensure user is authenticated
4. Verify file size doesn't exceed bucket limits

## Security Checklist

- [ ] RLS enabled on all tables
- [ ] Service role key never exposed to client
- [ ] JWT validation configured with correct issuer/audience
- [ ] Storage policies restrict access appropriately
- [ ] Anon key rate limits configured
- [ ] Database backups enabled (automatic in Supabase)
- [ ] Secrets stored in environment variables (not committed)
- [ ] HTTPS enforced for all connections
- [ ] Regular security audits of RLS policies

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [FastAPI + Supabase Guide](https://supabase.com/docs/guides/api/rest/fastapi)
- [JWT Validation Best Practices](https://supabase.com/docs/guides/auth/server-side-auth)

---

**Last Updated**: 2025-01-10
**Maintained By**: MachineMate DevOps Team
