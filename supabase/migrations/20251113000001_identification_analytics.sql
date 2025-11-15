-- ============================================================================
-- Identification Analytics Migration
-- ============================================================================
-- This migration creates tables for tracking machine identification outcomes
-- to enable A/B testing of different prompt variants and analyze accuracy.
--
-- Tables created:
-- - identification_events: Core identification attempts with prompt variant
-- - identification_corrections: User corrections to track accuracy
-- ============================================================================

-- ============================================================================
-- Identification Events Table
-- ============================================================================
-- Tracks every machine identification attempt including the prompt variant used

create table if not exists public.identification_events (
  id uuid primary key default uuid_generate_v4(),
  trace_id text unique not null,  -- Reference to VLM trace for debugging
  user_id uuid references public.users(id) on delete set null,  -- Null if anonymous

  -- Prediction details
  machine_predicted text not null,  -- What the VLM predicted
  confidence numeric(4,3) check (confidence >= 0 and confidence <= 1),  -- 0.0 to 1.0
  prompt_variant text not null,  -- Which prompt variant was used (enhanced_baseline, few_shot, chain_of_thought)

  -- VLM response metadata
  raw_machine text,  -- Raw machine name before canonicalization
  match_score numeric(4,3),  -- Fuzzy match score if canonicalized
  unmapped boolean default false,  -- True if VLM response couldn't be mapped
  model text,  -- VLM model used (e.g., "qwen-vl-chat")

  -- Request metadata
  auto_navigated boolean default false,  -- True if confidence was high enough for auto-navigation
  image_size_bytes integer,  -- Size of uploaded image
  processing_time_ms integer,  -- Time taken to process request

  -- Timestamps
  created_at timestamptz not null default now(),

  -- Metadata for future extensibility
  metadata jsonb default '{}'::jsonb
);

-- Enable RLS
alter table public.identification_events enable row level security;

-- RLS Policies: Users can only read their own events
create policy "identification_events_select_own" on public.identification_events
  for select using (auth.uid() = user_id or user_id is null);

-- Allow insert for authenticated and anonymous users
create policy "identification_events_insert" on public.identification_events
  for insert with check (true);

-- Create indexes for analytics queries
create index if not exists identification_events_user_id_idx on public.identification_events(user_id);
create index if not exists identification_events_prompt_variant_idx on public.identification_events(prompt_variant);
create index if not exists identification_events_created_at_idx on public.identification_events(created_at desc);
create index if not exists identification_events_machine_predicted_idx on public.identification_events(machine_predicted);
create index if not exists identification_events_trace_id_idx on public.identification_events(trace_id);

-- Composite index for A/B testing analytics
create index if not exists identification_events_variant_confidence_idx
  on public.identification_events(prompt_variant, confidence);


-- ============================================================================
-- Identification Corrections Table
-- ============================================================================
-- Tracks when users manually correct/override the VLM prediction
-- This is crucial for measuring accuracy of different prompt variants

create table if not exists public.identification_corrections (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.identification_events(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,

  -- Correction details
  machine_selected text not null,  -- What the user actually selected
  correction_source text not null default 'manual_picker',  -- How the correction was made (manual_picker, favorites, history)

  -- Timestamps
  created_at timestamptz not null default now(),
  time_to_correction_ms integer,  -- Time from prediction to correction

  -- Metadata
  metadata jsonb default '{}'::jsonb
);

-- Enable RLS
alter table public.identification_corrections enable row level security;

-- RLS Policies
create policy "identification_corrections_select_own" on public.identification_corrections
  for select using (auth.uid() = user_id or user_id is null);

create policy "identification_corrections_insert" on public.identification_corrections
  for insert with check (true);

-- Create indexes
create index if not exists identification_corrections_event_id_idx
  on public.identification_corrections(event_id);
create index if not exists identification_corrections_user_id_idx
  on public.identification_corrections(user_id);
create index if not exists identification_corrections_created_at_idx
  on public.identification_corrections(created_at desc);


-- ============================================================================
-- Analytics View: Prompt Variant Performance
-- ============================================================================
-- Aggregated view for analyzing prompt variant accuracy

create or replace view public.prompt_variant_analytics as
select
  ie.prompt_variant,
  count(ie.id) as total_identifications,
  count(ic.id) as total_corrections,
  round((1.0 - (count(ic.id)::numeric / nullif(count(ie.id), 0))) * 100, 2) as accuracy_percentage,
  avg(ie.confidence) as avg_confidence,
  percentile_cont(0.5) within group (order by ie.confidence) as median_confidence,
  count(case when ie.auto_navigated then 1 end) as auto_navigated_count,
  count(distinct ie.user_id) as unique_users,
  min(ie.created_at) as first_used,
  max(ie.created_at) as last_used
from public.identification_events ie
left join public.identification_corrections ic on ic.event_id = ie.id
group by ie.prompt_variant;

-- Grant access to the analytics view
grant select on public.prompt_variant_analytics to authenticated, anon;


-- ============================================================================
-- Analytics View: Daily Identification Stats
-- ============================================================================
-- Daily breakdown of identification metrics

create or replace view public.daily_identification_stats as
select
  date_trunc('day', ie.created_at) as date,
  ie.prompt_variant,
  count(ie.id) as total_identifications,
  count(ic.id) as total_corrections,
  round((1.0 - (count(ic.id)::numeric / nullif(count(ie.id), 0))) * 100, 2) as accuracy_percentage,
  avg(ie.confidence) as avg_confidence,
  count(case when ie.auto_navigated then 1 end) as auto_navigated_count
from public.identification_events ie
left join public.identification_corrections ic on ic.event_id = ie.id
group by date_trunc('day', ie.created_at), ie.prompt_variant
order by date desc, ie.prompt_variant;

-- Grant access to the daily stats view
grant select on public.daily_identification_stats to authenticated, anon;


-- ============================================================================
-- Function: Record Identification Event
-- ============================================================================
-- Helper function to insert identification events from the backend

create or replace function public.record_identification_event(
  p_trace_id text,
  p_user_id uuid,
  p_machine_predicted text,
  p_confidence numeric,
  p_prompt_variant text,
  p_raw_machine text default null,
  p_match_score numeric default null,
  p_unmapped boolean default false,
  p_model text default null,
  p_auto_navigated boolean default false,
  p_image_size_bytes integer default null,
  p_processing_time_ms integer default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid as $$
declare
  v_event_id uuid;
begin
  insert into public.identification_events (
    trace_id,
    user_id,
    machine_predicted,
    confidence,
    prompt_variant,
    raw_machine,
    match_score,
    unmapped,
    model,
    auto_navigated,
    image_size_bytes,
    processing_time_ms,
    metadata
  ) values (
    p_trace_id,
    p_user_id,
    p_machine_predicted,
    p_confidence,
    p_prompt_variant,
    p_raw_machine,
    p_match_score,
    p_unmapped,
    p_model,
    p_auto_navigated,
    p_image_size_bytes,
    p_processing_time_ms,
    p_metadata
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$ language plpgsql security definer;

-- Grant execute permission
grant execute on function public.record_identification_event to authenticated, anon;


-- ============================================================================
-- Function: Record Identification Correction
-- ============================================================================
-- Helper function to record when a user corrects a prediction

create or replace function public.record_identification_correction(
  p_trace_id text,
  p_user_id uuid,
  p_machine_selected text,
  p_correction_source text default 'manual_picker',
  p_time_to_correction_ms integer default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid as $$
declare
  v_event_id uuid;
  v_correction_id uuid;
begin
  -- Find the event by trace_id
  select id into v_event_id
  from public.identification_events
  where trace_id = p_trace_id
  limit 1;

  if v_event_id is null then
    raise exception 'No identification event found with trace_id: %', p_trace_id;
  end if;

  -- Insert the correction
  insert into public.identification_corrections (
    event_id,
    user_id,
    machine_selected,
    correction_source,
    time_to_correction_ms,
    metadata
  ) values (
    v_event_id,
    p_user_id,
    p_machine_selected,
    p_correction_source,
    p_time_to_correction_ms,
    p_metadata
  )
  returning id into v_correction_id;

  return v_correction_id;
end;
$$ language plpgsql security definer;

-- Grant execute permission
grant execute on function public.record_identification_correction to authenticated, anon;


-- ============================================================================
-- Comments
-- ============================================================================

comment on table public.identification_events is
  'Tracks every machine identification attempt including VLM predictions and prompt variants used for A/B testing';

comment on table public.identification_corrections is
  'Records when users manually override VLM predictions, used to calculate accuracy metrics';

comment on view public.prompt_variant_analytics is
  'Aggregated analytics showing accuracy and performance metrics for each prompt variant';

comment on view public.daily_identification_stats is
  'Daily breakdown of identification metrics per prompt variant for trend analysis';

comment on column public.identification_events.prompt_variant is
  'Prompt variant used: enhanced_baseline, few_shot, or chain_of_thought';

comment on column public.identification_events.auto_navigated is
  'True if confidence was high enough to automatically navigate to machine detail page';

comment on column public.identification_corrections.correction_source is
  'How the user made the correction: manual_picker, favorites, history, or search';
