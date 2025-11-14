/**
 * Terraform Outputs for MachineMate Infrastructure
 */

output "cloud_run_url" {
  description = "URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.machinemate_api.uri
}

output "service_name" {
  description = "Name of the Cloud Run service"
  value       = google_cloud_run_v2_service.machinemate_api.name
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.machinemate.repository_id}"
}

output "service_account_email" {
  description = "Email of the service account"
  value       = google_service_account.machinemate_api.email
}

output "secret_ids" {
  description = "Secret Manager secret IDs"
  value = {
    database_url              = google_secret_manager_secret.database_url.secret_id
    supabase_service_role_key = google_secret_manager_secret.supabase_service_role_key.secret_id
    fireworks_api_key         = google_secret_manager_secret.fireworks_api_key.secret_id
    sentry_dsn                = google_secret_manager_secret.sentry_dsn.secret_id
  }
}
