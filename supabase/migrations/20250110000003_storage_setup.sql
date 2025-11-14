-- ============================================================================
-- MachineMate Storage Buckets and Policies
-- ============================================================================
-- This migration creates storage buckets for:
-- - machines: Public machine reference images
-- - tutorials: Private tutorial videos
-- - user-uploads: Private user-generated content
--
-- Each bucket has appropriate RLS policies for access control.
-- ============================================================================

-- ============================================================================
-- Create Storage Buckets
-- ============================================================================

-- Machines bucket (public read)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'machines',
  'machines',
  true,  -- Public read access
  5242880,  -- 5 MB limit
  array['image/png', 'image/jpeg', 'image/webp', 'image/jpg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Tutorials bucket (private, authenticated users)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tutorials',
  'tutorials',
  false,  -- Private, requires authentication
  104857600,  -- 100 MB limit
  array['video/mp4', 'video/quicktime', 'video/x-msvideo']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- User uploads bucket (private, user-specific)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-uploads',
  'user-uploads',
  false,  -- Private
  10485760,  -- 10 MB limit
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================================
-- Storage Policies: machines bucket (public)
-- ============================================================================

-- Anyone can read from machines bucket
create policy "machines_public_read"
  on storage.objects for select
  using (bucket_id = 'machines');

-- Only service role can insert (via backend)
create policy "machines_service_insert"
  on storage.objects for insert
  with check (bucket_id = 'machines' and false);  -- Bypassed by service role

-- Only service role can update
create policy "machines_service_update"
  on storage.objects for update
  using (bucket_id = 'machines' and false);  -- Bypassed by service role

-- Only service role can delete
create policy "machines_service_delete"
  on storage.objects for delete
  using (bucket_id = 'machines' and false);  -- Bypassed by service role

-- ============================================================================
-- Storage Policies: tutorials bucket (authenticated)
-- ============================================================================

-- Authenticated users can read tutorials
create policy "tutorials_authenticated_read"
  on storage.objects for select
  using (
    bucket_id = 'tutorials'
    and auth.role() = 'authenticated'
  );

-- Only service role can insert
create policy "tutorials_service_insert"
  on storage.objects for insert
  with check (bucket_id = 'tutorials' and false);  -- Bypassed by service role

-- Only service role can update
create policy "tutorials_service_update"
  on storage.objects for update
  using (bucket_id = 'tutorials' and false);  -- Bypassed by service role

-- Only service role can delete
create policy "tutorials_service_delete"
  on storage.objects for delete
  using (bucket_id = 'tutorials' and false);  -- Bypassed by service role

-- ============================================================================
-- Storage Policies: user-uploads bucket (user-specific)
-- ============================================================================

-- Users can read their own uploads
-- Files are organized as: user-uploads/{user_id}/{filename}
create policy "user_uploads_read_own"
  on storage.objects for select
  using (
    bucket_id = 'user-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can insert their own files
create policy "user_uploads_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'user-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own files
create policy "user_uploads_update_own"
  on storage.objects for update
  using (
    bucket_id = 'user-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own files
create policy "user_uploads_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'user-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get signed URL for private content
-- Usage: select get_signed_url('tutorials', 'intro-video.mp4', 3600);
create or replace function get_signed_url(
  bucket_name text,
  file_path text,
  expires_in integer default 3600  -- 1 hour default
)
returns text as $$
declare
  signed_url text;
begin
  -- This is a placeholder - actual signed URL generation
  -- should be done via Supabase client SDK or backend
  return concat(
    current_setting('app.supabase_url'),
    '/storage/v1/object/sign/',
    bucket_name,
    '/',
    file_path,
    '?token=<generated-token>'
  );
end;
$$ language plpgsql security definer;

-- Function to cleanup old user uploads (can be scheduled)
create or replace function cleanup_old_user_uploads(days_to_keep integer default 90)
returns integer as $$
declare
  deleted_count integer;
begin
  -- Mark files for deletion if older than threshold
  -- Actual deletion should be done via Supabase Storage API
  -- This function is a placeholder for tracking old files

  with old_files as (
    select name
    from storage.objects
    where bucket_id = 'user-uploads'
      and created_at < now() - (days_to_keep || ' days')::interval
  )
  select count(*) into deleted_count from old_files;

  return deleted_count;
end;
$$ language plpgsql;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

comment on function get_signed_url(text, text, integer) is 'Generate signed URL for private storage objects (placeholder)';
comment on function cleanup_old_user_uploads(integer) is 'Identify old user uploads for cleanup (default 90 days)';
