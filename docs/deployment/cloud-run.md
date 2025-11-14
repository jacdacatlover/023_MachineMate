# Cloud Run Deployment Guide

Single source of truth for shipping the MachineMate backend to Google Cloud Run.
Use this doc whenever you need to bootstrap a new environment, redeploy, or
debug an existing service.

## TL;DR Checklist

1. **Prep GCP**
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
   ```
2. **Create/refresh secrets**
   ```bash
   echo -n "postgresql://..." | gcloud secrets create machinemate-database-url --data-file=-    # or secrets versions add
   echo -n "service-role-key" | gcloud secrets create machinemate-supabase-service-role-key --data-file=-
   echo -n "fireworks-api-key" | gcloud secrets create machinemate-fireworks-api-key --data-file=-
   echo -n "https://dummy@sentry.io/123" | gcloud secrets create machinemate-sentry-dsn --data-file=- # optional
   ```
3. **Configure Terraform**
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   # fill in project_id, region, image_tag, Supabase JWT issuer/JWKS URL, CORS origins, min/max instances
   terraform init && terraform plan && terraform apply
   ```
4. **Build + push the backend image**
   ```bash
   cd ../backend
   docker build -t machinemate-backend .
   docker tag machinemate-backend us-central1-docker.pkg.dev/YOUR_PROJECT_ID/machinemate/backend:latest
   gcloud auth configure-docker us-central1-docker.pkg.dev
   docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/machinemate/backend:latest
   ```
5. **Deploy / update Cloud Run**
   ```bash
   cd ../terraform
   terraform apply -var="image_tag=latest"
   ```
6. **Verify**
   ```bash
   SERVICE_URL=$(gcloud run services describe machinemate-api --region=us-central1 --format='value(status.url)')
   curl $SERVICE_URL/health | jq
   curl $SERVICE_URL/api/v1/machines | jq
   open $SERVICE_URL/docs
   ```

## Environment Setup

- **Supabase**: ensure dev/staging/prod projects have all Phase 1 migrations and
  storage policies applied (`supabase db push`). Store the connection pooler URL,
  service-role key, JWT issuer, and JWKS URL in a password manager.
- **Local tooling**: Python 3.11, Docker, Terraform ≥1.5, gcloud CLI. Run
  `gcloud auth login` and `gcloud auth application-default login` before the
  first deploy.
- **Secrets**: production values live in GCP Secret Manager; local development
  stays inside `backend/.env` and `.env`. Follow `docs/infrastructure/secrets.md`
  for rotation guidance.

## Terraform Workflow

All IaC lives in `terraform/`. The module provisions Artifact Registry, Cloud
Run, IAM, and Secret bindings. Typical flow:

1. Copy `terraform.tfvars.example` → `terraform.tfvars`.
2. Supply `project_id`, `region`, `environment`, Supabase JWT metadata, and CORS
   origins.
3. Run `terraform init` once per environment.
4. Use `terraform plan` before every `apply`.
5. When rolling a new image, update `-var="image_tag=..."` or set the value in
   `terraform.tfvars`.

Outputs include the Cloud Run URL and service account identity. Destroy with
`terraform destroy` when tearing down an environment.

## Container Build & CI/CD

- **Local builds**: `backend/Dockerfile` is multi-stage and Cloud Run–ready.
  `docker-compose.dev.yml` remains for local smoke tests but is not required for
  builds.
- **GitHub Actions**: `.github/workflows/deploy-backend.yml` runs pytest, builds,
  pushes to Artifact Registry, then triggers `gcloud run deploy` using Workload
  Identity Federation. Configure repository secrets (`GCP_PROJECT_ID`,
  `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT_EMAIL`, Supabase
  secrets) before using the workflow.
- **Versioning**: tag images with semver (`machinemate/backend:v1.2.3`) when
  cutting releases; keep `latest` for nightly or manual deploys.

## Manual Verification

Run these after every deploy:

```bash
SERVICE_URL=$(gcloud run services describe machinemate-api --region=us-central1 --format='value(status.url)')

# Health + readiness
curl $SERVICE_URL/health | jq
curl $SERVICE_URL/health/ready | jq
curl $SERVICE_URL/health/live | jq

# Core APIs
curl "$SERVICE_URL/api/v1/machines?page=1&page_size=5" | jq
curl "$SERVICE_URL/api/v1/machines/categories/list" | jq

# Auth-required paths (replace TOKEN)
curl -H "Authorization: Bearer TOKEN" "$SERVICE_URL/api/v1/favorites" | jq
```

Check Cloud Run logs via:

```bash
gcloud run services logs read machinemate-api --region=us-central1 --limit=100
```

## Troubleshooting

- **Service fails to start**: confirm secrets exist with
  `gcloud secrets versions list machinemate-database-url`; tail logs for stack
  traces.
- **Database errors**: validate the Supabase connection string (use the
  PgBouncer URL on port 6543) and that migrations ran.
- **JWT 401s**: ensure `SUPABASE_JWT_ISSUER`, `SUPABASE_JWT_JWKS_URL`, and
  `SUPABASE_JWT_AUDIENCE` match your Supabase project settings.
- **Docker build failures**: run `docker system prune -a` and rebuild with
  `--no-cache`; verify `backend/requirements.txt` installs cleanly.
- **Slow cold starts**: lower `min_instances` or bump memory/CPU in Terraform as
  needed; monitor via Cloud Run dashboard.

## Related References

- `docs/infrastructure/secrets.md` – secret inventory and rotation playbooks
- `docs/infrastructure/supabase.md` – schema, auth, and storage configuration
- `backend/README.md` – local development, API overview, and testing commands
- `docs/roadmap.md` – release phases, status, and upcoming work
