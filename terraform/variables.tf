/**
 * Terraform Variables for MachineMate Infrastructure
 */

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "production"
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

# ============================================================================
# Cloud Run Configuration
# ============================================================================

variable "min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 1
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 10
}

variable "cpu_limit" {
  description = "CPU limit for each Cloud Run instance"
  type        = string
  default     = "1000m"
}

variable "memory_limit" {
  description = "Memory limit for each Cloud Run instance"
  type        = string
  default     = "512Mi"
}

variable "cpu_idle" {
  description = "CPU allocation when idle"
  type        = bool
  default     = true
}

variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "INFO"
}

# ============================================================================
# Supabase Configuration
# ============================================================================

variable "supabase_jwt_issuer" {
  description = "Supabase JWT issuer URL (e.g., https://your-project.supabase.co/auth/v1)"
  type        = string
}

variable "supabase_jwks_url" {
  description = "Supabase JWKS URL for JWT verification"
  type        = string
}

# ============================================================================
# Security Configuration
# ============================================================================

variable "cors_origins" {
  description = "Comma-separated list of allowed CORS origins"
  type        = string
  default     = "*"
}
