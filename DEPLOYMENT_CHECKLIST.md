# MachineMate Backend – Production Deployment Checklist

The authoritative deployment steps now live in `docs/deployment/cloud-run.md`.
Use this file as a printable/high-level reminder so you can track progress while
following the detailed guide.

## Quick Checks

- [ ] **Prereqs**: GCP project with billing, gcloud CLI, Docker, Terraform,
      Supabase migrations applied, Fireworks API key in hand.
- [ ] **Secrets**: `machinemate-database-url`, `machinemate-supabase-service-role-key`,
      `machinemate-fireworks-api-key`, optional `machinemate-sentry-dsn`.
- [ ] **Terraform**: `terraform.tfvars` populated (project/region/JWT metadata/CORS),
      `terraform init && terraform plan` reviewed.
- [ ] **Image**: Docker build succeeds, tagged for
      `us-central1-docker.pkg.dev/<project>/machinemate/backend:latest`, pushed.
- [ ] **Deploy**: `terraform apply -var="image_tag=latest"` (or GitHub Actions deploy)
      completes without errors.
- [ ] **Verify**: `/health`, `/health/ready`, `/api/v1/machines`, and Swagger UI reachable.
- [ ] **Seed data**: `machines` table loaded from `src/data/machines.json` (SQL editor or script).
- [ ] **CI/CD**: GitHub secrets configured and `deploy-backend.yml` run once per release.
- [ ] **Post-flight**: Service URL recorded, Expo env updated, budget alerts configured,
      Cloud Run logs reviewed, incident notes filed if needed.

See `docs/deployment/cloud-run.md` for commands, troubleshooting, and rollback
instructions.
