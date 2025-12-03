/**
 * MachineMate Infrastructure - Google Cloud Run Deployment
 *
 * This Terraform configuration deploys the MachineMate backend to Cloud Run
 * with Artifact Registry for container images and Secret Manager for secrets.
 */

terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "machinemate-023-tfstate"
    prefix = "prod"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ============================================================================
# Artifact Registry for Docker images
# ============================================================================

resource "google_artifact_registry_repository" "machinemate" {
  location      = var.region
  repository_id = "machinemate"
  description   = "MachineMate container images"
  format        = "DOCKER"

  labels = {
    app = "machinemate"
    env = var.environment
  }
}

# ============================================================================
# Secret Manager for sensitive configuration
# ============================================================================

resource "google_secret_manager_secret" "database_url" {
  secret_id = "machinemate-database-url"

  replication {
    auto {}
  }

  labels = {
    app = "machinemate"
    env = var.environment
  }
}

resource "google_secret_manager_secret" "supabase_service_role_key" {
  secret_id = "machinemate-supabase-service-role-key"

  replication {
    auto {}
  }

  labels = {
    app = "machinemate"
    env = var.environment
  }
}

resource "google_secret_manager_secret" "fireworks_api_key" {
  secret_id = "machinemate-fireworks-api-key"

  replication {
    auto {}
  }

  labels = {
    app = "machinemate"
    env = var.environment
  }
}

resource "google_secret_manager_secret" "sentry_dsn" {
  secret_id = "machinemate-sentry-dsn"

  replication {
    auto {}
  }

  labels = {
    app = "machinemate"
    env = var.environment
  }
}

resource "google_secret_manager_secret" "supabase_jwt_secret" {
  secret_id = "machinemate-supabase-jwt-secret"

  replication {
    auto {}
  }

  labels = {
    app = "machinemate"
    env = var.environment
  }
}

# ============================================================================
# Service Account for Cloud Run
# ============================================================================

resource "google_service_account" "machinemate_api" {
  account_id   = "machinemate-api"
  display_name = "MachineMate API Service Account"
  description  = "Service account for MachineMate Cloud Run service"
}

# Grant access to secrets
resource "google_secret_manager_secret_iam_member" "database_url_access" {
  secret_id = google_secret_manager_secret.database_url.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.machinemate_api.email}"
}

resource "google_secret_manager_secret_iam_member" "supabase_key_access" {
  secret_id = google_secret_manager_secret.supabase_service_role_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.machinemate_api.email}"
}

resource "google_secret_manager_secret_iam_member" "fireworks_key_access" {
  secret_id = google_secret_manager_secret.fireworks_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.machinemate_api.email}"
}

resource "google_secret_manager_secret_iam_member" "sentry_dsn_access" {
  secret_id = google_secret_manager_secret.sentry_dsn.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.machinemate_api.email}"
}

resource "google_secret_manager_secret_iam_member" "supabase_jwt_secret_access" {
  secret_id = google_secret_manager_secret.supabase_jwt_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.machinemate_api.email}"
}

# ============================================================================
# Cloud Run Service
# ============================================================================

resource "google_cloud_run_v2_service" "machinemate_api" {
  name     = "machinemate-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.machinemate_api.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.machinemate.repository_id}/backend:${var.image_tag}"

      ports {
        name           = "http1"
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
        cpu_idle = var.cpu_idle
      }

      # Environment variables (non-sensitive)
      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      env {
        name  = "LOG_LEVEL"
        value = var.log_level
      }

      env {
        name  = "LOG_FORMAT"
        value = "json"
      }

      env {
        name  = "SENTRY_ENVIRONMENT"
        value = var.environment
      }

      env {
        name  = "SUPABASE_JWT_AUDIENCE"
        value = "authenticated"
      }

      env {
        name  = "SUPABASE_JWT_ISSUER"
        value = var.supabase_jwt_issuer
      }

      env {
        name  = "SUPABASE_JWT_JWKS_URL"
        value = var.supabase_jwks_url
      }

      env {
        name  = "CORS_ORIGINS"
        value = var.cors_origins
      }

      env {
        name  = "REQUIRE_AUTH"
        value = "true"
      }

      # Secrets from Secret Manager
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SUPABASE_SERVICE_ROLE_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.supabase_service_role_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "FIREWORKS_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.fireworks_api_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SENTRY_DSN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.sentry_dsn.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SUPABASE_JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.supabase_jwt_secret.secret_id
            version = "latest"
          }
        }
      }

      # Startup probe - checks if the container has started successfully
      startup_probe {
        http_get {
          path = "/health/live"
          port = 8080
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        timeout_seconds       = 5
        failure_threshold     = 3
      }

      # Liveness probe - checks if the container is still running
      liveness_probe {
        http_get {
          path = "/health/live"
          port = 8080
        }
        period_seconds    = 30
        timeout_seconds   = 5
        failure_threshold = 3
      }
    }

    timeout = "300s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  labels = {
    app = "machinemate"
    env = var.environment
  }

  depends_on = [
    google_secret_manager_secret_iam_member.database_url_access,
    google_secret_manager_secret_iam_member.supabase_key_access,
    google_secret_manager_secret_iam_member.fireworks_key_access,
    google_secret_manager_secret_iam_member.sentry_dsn_access,
  ]
}

# Allow unauthenticated access to the Cloud Run service
resource "google_cloud_run_v2_service_iam_member" "noauth" {
  name     = google_cloud_run_v2_service.machinemate_api.name
  location = google_cloud_run_v2_service.machinemate_api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
