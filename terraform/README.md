# MachineMate Terraform Infrastructure

Terraform lives here for provisioning Artifact Registry, Cloud Run, IAM, and
Secret Manager bindings. Use this README for repo-specific notes; the full
deployment playbook sits in `docs/deployment/cloud-run.md`.

## Quick Start

```bash
brew install terraform
gcloud init && gcloud auth application-default login
gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

cp terraform.tfvars.example terraform.tfvars   # fill project_id, region, Supabase issuer/JWKS, CORS, min/max instances
terraform init
terraform plan
terraform apply -var="image_tag=latest"
```

Secrets (`machinemate-database-url`, `machinemate-supabase-service-role-key`,
`machinemate-fireworks-api-key`, optional `machinemate-sentry-dsn`) must exist in
GCP **before** running `apply`. See `docs/infrastructure/secrets.md` for details.

## Outputs & Maintenance

- `terraform output cloud_run_url` – deployed service URL per environment.
- `terraform destroy` – tear down an environment (double-check before running).
- Update `terraform.tfvars` when bumping `min_instances`, CORS origins, or image
  tags; commit the `.example` file if new variables are added.

For Docker build commands, CI/CD, and verification steps, follow
`docs/deployment/cloud-run.md`.
