# Phase 1 Setup Guide: Supabase Foundations

This guide walks you through completing Phase 1 of the MachineMate deployment plan: setting up Supabase authentication, database tables, and storage.

## Prerequisites

- [ ] Supabase account created at [app.supabase.com](https://app.supabase.com)
- [ ] Supabase CLI installed (`brew install supabase/tap/supabase`)
- [ ] Backend environment variables configured (`backend/.env`)
- [ ] Mobile app environment variables configured (`.env`)

## Step 1: Login to Supabase CLI

```bash
# Login with your Supabase credentials
supabase login

# This will open a browser window to authenticate
# Follow the prompts to generate an access token
```

## Step 2: Link Your Supabase Project

```bash
# From project root
cd /Users/jac/Projects/023_MachineMate

# Link to your Supabase project
supabase link --project-ref gemxkgkpkaombqkycegc

# When prompted, select your project from the list
```

**Note**: Replace `gemxkgkpkaombqkycegc` with your actual project reference if different.

## Step 3: Push Database Migrations

```bash
# Apply all migrations to your Supabase database
supabase db push

# This will create:
# - users, machines, favorites, history, media_assets tables
# - RLS policies for all tables
# - Storage buckets (machines, tutorials, user-uploads)
# - Indexes and helper functions
```

**Expected Output:**
```
Applying migration 20250110_initial_schema.sql...
Applying migration 20250110_storage_setup.sql...
✔ All migrations applied successfully
```

## Step 4: Verify Database Setup

```bash
# Check that tables were created
supabase db diff --schema public

# Should show no differences if migrations applied correctly
```

Or verify via Supabase Dashboard:
1. Go to [app.supabase.com](https://app.supabase.com) → Your Project
2. Navigate to **Table Editor**
3. Confirm these tables exist:
   - `users`
   - `machines`
   - `favorites`
   - `history`
   - `media_assets`

## Step 5: Verify Storage Buckets

1. Go to Supabase Dashboard → **Storage**
2. Confirm these buckets exist:
   - `machines` (Public)
   - `tutorials` (Private)
   - `user-uploads` (Private)

If buckets are missing, you can create them manually or re-run the storage migration:

```bash
supabase db push --db-url "your-database-url" --file supabase/migrations/20250110_storage_setup.sql
```

## Step 6: Verify RLS Policies

1. Go to Supabase Dashboard → **Authentication** → **Policies**
2. Confirm policies exist for each table:

**users table:**
- `users_select_own` - Users can read their own profile
- `users_update_own` - Users can update their own profile
- `users_insert_own` - Users can create their profile on signup

**machines table:**
- `machines_select_all` - Anyone can read machines
- `machines_insert_service`, `machines_update_service`, `machines_delete_service` - Only service role can modify

**favorites table:**
- `favorites_owner` - Users can only access their own favorites

**history table:**
- `history_owner` - Users can only access their own history

**media_assets table:**
- `media_assets_select_own_or_public` - Users can see their files and public system files
- `media_assets_insert_own`, `media_assets_update_own`, `media_assets_delete_own` - Users manage their own files

## Step 7: Test Database Connection from Backend

```bash
cd backend

# Activate virtual environment
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Run connection test
python scripts/test_connection.py
```

**Expected Output:**
```
✅ Database connection successful
✅ Database engine created for environment: development
```

## Step 8: Run Backend Tests

```bash
# Run JWT authentication tests
pytest tests/test_auth.py -v

# Run all tests
pytest tests/ -v --tb=short
```

**Expected**: All tests should pass.

## Step 9: Seed Machine Data (Optional)

You can manually add seed data for the machines catalog:

```sql
-- Run in Supabase SQL Editor

insert into public.machines (id, name, category, difficulty, primary_muscles, setup_steps, how_to_steps) values
('seated-leg-press', 'Seated Leg Press', 'Lower Body', 'beginner',
 array['Quadriceps', 'Glutes', 'Hamstrings'],
 '["Adjust seat position", "Place feet on platform", "Release safety"]'::jsonb,
 '["Push platform away", "Extend legs fully", "Return slowly"]'::jsonb),

('lat-pulldown', 'Lat Pulldown', 'Back', 'beginner',
 array['Latissimus Dorsi', 'Biceps'],
 '["Adjust knee pad", "Grip bar wide", "Sit with thighs secured"]'::jsonb,
 '["Pull bar to chest", "Squeeze shoulder blades", "Return slowly"]'::jsonb),

('chest-press-machine', 'Chest Press Machine', 'Chest', 'beginner',
 array['Pectorals', 'Triceps', 'Deltoids'],
 '["Adjust seat height", "Position handles", "Back against pad"]'::jsonb,
 '["Push handles forward", "Extend arms fully", "Return slowly"]'::jsonb);
```

Or use a backend script (recommended for bulk import):

```bash
# Create a seed script
python backend/scripts/seed_machines.py
```

## Step 10: Test End-to-End Auth Flow

### 10.1 Create a Test User

Via Supabase Dashboard:
1. Go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Email: `test@machinemate.com`
4. Password: `SecureTestPassword123!`
5. Click **Create user**

Or via Supabase CLI:

```bash
supabase auth signup --email test@machinemate.com --password SecureTestPassword123!
```

### 10.2 Get User Access Token

```bash
# Use Supabase CLI to get token
supabase auth login --email test@machinemate.com --password SecureTestPassword123!
```

Or use the Supabase client in your mobile app:

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@machinemate.com',
  password: 'SecureTestPassword123!'
})

const accessToken = data.session?.access_token
console.log('Access Token:', accessToken)
```

### 10.3 Test Backend API with Token

```bash
# Replace TOKEN with the access token from previous step
curl -X GET "http://172.20.10.3:8000/auth/me" \
  -H "Authorization: Bearer TOKEN"

# Expected response:
# {"id":"user-uuid","email":"test@machinemate.com","role":"authenticated"}
```

### 10.4 Test Favorites Flow

```bash
# Add a favorite
curl -X POST "http://172.20.10.3:8000/favorites" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"machine_id":"seated-leg-press"}'

# Get favorites
curl -X GET "http://172.20.10.3:8000/favorites" \
  -H "Authorization: Bearer TOKEN"

# Delete a favorite
curl -X DELETE "http://172.20.10.3:8000/favorites/seated-leg-press" \
  -H "Authorization: Bearer TOKEN"
```

### 10.5 Verify RLS Enforcement

Try to access another user's data (should fail):

```bash
# Create a second test user and get their token
# Then try to access their favorites using first user's token
# Should return empty array or 403 Forbidden
```

## Troubleshooting

### Migration Fails: "relation already exists"

**Problem**: Tables already exist from manual setup.

**Solution**:
1. Option 1: Drop existing tables and re-run migrations (WARNING: loses data)
2. Option 2: Use `on conflict` clauses in migrations (already included)

### RLS Blocks Service Role

**Problem**: Backend gets 403 Forbidden even with service role key.

**Solution**: Verify you're using `SUPABASE_SERVICE_ROLE_KEY` (not anon key) in backend `.env`.

### Storage Policies Not Working

**Problem**: Can't upload files even though authenticated.

**Solution**:
1. Verify file path format: `user-uploads/{user_id}/{filename}`
2. Check file size and MIME type match bucket limits
3. Verify user is authenticated (not using anon session)

### JWT Validation Fails

**Problem**: `401 Unauthorized` on all authenticated endpoints.

**Solution**:
1. Check `SUPABASE_JWT_ISSUER` matches your project URL
2. Verify `SUPABASE_JWT_JWKS_URL` is accessible
3. Ensure token hasn't expired
4. Check `SUPABASE_JWT_AUDIENCE` is "authenticated"

## Acceptance Criteria

Before marking Phase 1 complete, verify:

- [x] All database migrations applied successfully
- [x] RLS policies enabled and tested on all tables
- [x] Storage buckets created with correct policies
- [x] JWT validation middleware working in FastAPI
- [x] Backend tests pass (pytest tests/test_auth.py)
- [x] Test user can sign in and access their data
- [x] Test user cannot access other users' data (RLS working)
- [x] Documentation complete in `docs/infrastructure/supabase.md`

## Next Steps: Phase 2

Once Phase 1 is complete, proceed to **Phase 2: Backend Modernization & Cloud Run Deployment**:

1. Add FastAPI endpoints for `/favorites`, `/history`, `/machines`
2. Containerize backend with Docker
3. Create Terraform configuration for GCP Cloud Run
4. Set up CI/CD pipeline for automated deployments

See `plan/detailplan.md` for full Phase 2 requirements.

---

**Need Help?**
- Supabase Docs: https://supabase.com/docs
- MachineMate Issues: https://github.com/your-org/machinemate/issues
- Slack: #machinemate-dev
