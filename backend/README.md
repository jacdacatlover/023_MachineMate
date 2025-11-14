# MachineMate Backend

Production FastAPI service that powers machines, favorites, history, media, and
metrics APIs for the mobile app. The backend is deployed to Google Cloud Run via
Terraform and GitHub Actions.

## Stack

- FastAPI + Uvicorn (async/await end to end)
- SQLAlchemy 2.x models backed by Supabase Postgres (RLS enforced)
- Pydantic v2 schemas for request/response validation
- Supabase JWT verification (`app/auth.py`) with JWKS caching + RBAC helpers
- Structured logging + health/readiness probes for Cloud Run

## Local Development

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # fill DATABASE_URL, Supabase JWT metadata, service-role key, Fireworks API key
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs live at http://localhost:8000/docs. Remember to run `npm start` from
the Expo app pointing `EXPO_PUBLIC_API_BASE_URL` to this local server when
testing end to end.

## Testing

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v --tb=short
```

`tests/test_auth.py` contains JWKS/JWT coverage; add new feature tests under
`tests/` mirroring the `app/routers` structure. Use `PYTHONPATH=.` if needed so
relative imports resolve.

## Deployment

Use `docs/deployment/cloud-run.md` for the authoritative Cloud Run workflow
(gcloud, Terraform, Docker, CI/CD). The short checklist lives in
`DEPLOYMENT_CHECKLIST.md`.

Key directories:

- `app/routers/` – API endpoints for machines, favorites, history, media, metrics
- `app/models.py`, `app/schemas.py`, `app/db.py` – database layer
- `app/services/` – Fireworks AI inference helpers, tracing utilities
- `tests/` – Pytest suite
- `Dockerfile`, `docker-compose.dev.yml` – container build and local smoke tests

## Related Docs

- `docs/infrastructure/supabase.md` – database schema + storage policies
- `docs/infrastructure/secrets.md` – environment variable inventory
- `docs/roadmap.md` – phase status and upcoming work
