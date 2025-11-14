# MachineMate Roadmap

Single reference for phase status, major deliverables, and what is coming next.
For implementation details, continue to edit `plan/detailplan.md`.

## Phase History

### Phase 0 — Repository & Environment Baseline ✅
- Fresh clone runs with documented `.env` files.
- FastAPI prototype connects to Supabase Postgres and powers the mock
  `/identify` flow used by the Expo app.
- Fireworks AI pipelines validated with local camera inputs.

### Phase 1 — Supabase Foundations ✅
- Comprehensive SQL migrations covering `users`, `machines`, `favorites`,
  `history`, and `media_assets` with RLS and indexes.
- JWT validation middleware (`backend/app/auth.py`) with JWKS caching and RBAC
  helpers plus 18 pytest cases.
- Storage buckets (`machines`, `tutorials`, `user-uploads`) configured with
  quotas, MIME guards, and ownership policies.
- Setup runbook captured in `docs/infrastructure/phase1-setup.md`; Supabase CLI
  project `gemxkgkpkaombqkycegc` linked for dev.

### Phase 2 — Backend Modernization & Cloud Run ✅
- FastAPI backend now exposes 20+ endpoints (machines, favorites, history,
  media, metrics) with async SQLAlchemy models and Pydantic schemas.
- Health, readiness, and liveness probes plus metrics endpoints wired for Cloud
  Run.
- Infrastructure as code (Terraform), Docker multi-stage builds, and CI/CD
  workflows finished; secrets sourced from GCP Secret Manager.
- Deployment runbook consolidated in `docs/deployment/cloud-run.md`.

## In-Flight & Upcoming

### Phase 3 — Mobile Client Integration (Auth + Data Sync)
- Add Supabase JS client + auth flows, sync favorites/history with backend, and
  stream catalog/media from Supabase with offline caching.

### Phase 4 — Observability, Logging, Quality Gates
- Expand Sentry instrumentation, structured logging on both client and backend,
  and enforce CI gates (lint, type-check, Jest, pytest, migrations, Docker).

### Phase 5 — QA, Compliance, Store Readiness
- Harden manual QA matrix, finalize privacy/compliance materials, configure EAS
  build profiles, and document release/rollback procedures.

### Phase 6 — Scale & Optimization
- Plan for media offloading, caching tiers, async workers, feature flagging, and
  analytics expansion once traffic or cost thresholds trigger upgrades.

## How to Use This Doc

- Need the tactical steps? Open `plan/detailplan.md`.
- Want a snapshot for stakeholders or release notes? Link them here.
- Questions about prior decisions? Reference the phase history summaries and the
  supporting docs they cite.
