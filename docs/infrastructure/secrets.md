# Secrets Management - MachineMate

This document describes how secrets and environment variables are managed across different parts of the MachineMate infrastructure.

## Overview

MachineMate uses a **multi-layered secrets strategy**:

1. **Local Development**: `.env` files (gitignored)
2. **Mobile App**: Expo environment variables (EAS Secrets)
3. **Backend**: Environment variables loaded from `.env` or injected by Cloud Run
4. **CI/CD**: GitHub Actions secrets + GCP Workload Identity Federation
5. **Infrastructure**: Terraform variables (with sensitive values in `terraform.tfvars`, gitignored)

## Secrets Inventory

### Mobile App (.env)

| Secret | Where Used | How to Get | Notes |
|--------|-----------|------------|-------|
| `EXPO_PUBLIC_API_BASE_URL` | Expo app | Manually configured per env | Dev: `http://localhost:8000`<br/>Preview: `https://api.dev.yourdomain.com`<br/>Prod: `https://api.yourdomain.com` |
| `EXPO_PUBLIC_SUPABASE_URL` | Expo app + Supabase client | Supabase Dashboard → Settings → API → Project URL | Format: `https://xxxxx.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Expo app + Supabase client | Supabase Dashboard → Settings → API → `anon` `public` | Safe to expose to client |
| `SENTRY_DSN` | Expo app (Sentry SDK) | Sentry.io → Project Settings → Client Keys (DSN) | Optional for error tracking |
| `SENTRY_ORG` | Expo build (source maps) | Sentry.io → Organization slug | Required if using Sentry |
| `SENTRY_PROJECT` | Expo build (source maps) | Sentry.io → Project slug | Required if using Sentry |
| `EAS_PROJECT_ID` | EAS builds & updates | Expo.dev → Project Settings | Required for EAS |

**Storage**:
- Local dev: `.env` (gitignored)
- EAS builds: Configure in `eas.json` or EAS Secrets (web dashboard)

---

### Backend (backend/.env)

| Secret | Where Used | How to Get | Sensitivity | Notes |
|--------|-----------|------------|-------------|-------|
| `DATABASE_URL` | SQLAlchemy | Supabase → Settings → Database → Connection String | **HIGH** | Use connection pooling URL for Cloud Run |
| `SUPABASE_JWT_AUDIENCE` | JWT validation | Fixed value | Low | Usually `"authenticated"` |
| `SUPABASE_JWT_ISSUER` | JWT validation | Supabase → Settings → API → JWT Settings | Low | Format: `https://xxxxx.supabase.co/auth/v1` |
| `SUPABASE_JWT_JWKS_URL` | JWT validation | Derived from project | Low | Format: `https://xxxxx.supabase.co/auth/v1/keys` |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin operations | Supabase → Settings → API → `service_role` | **CRITICAL** | **NEVER expose to client!** Bypasses RLS |
| `FIREWORKS_API_KEY` | Fireworks AI | Fireworks.ai → API Keys | **HIGH** | For VLM inference |
| `MEDIA_PUBLIC_BASE_URL` | Media URLs | Supabase Storage or CDN | Low | Public base URL for media assets |
| `SENTRY_DSN` | Backend error tracking | Sentry.io → Project Settings | Medium | Optional |
| `CORS_ORIGINS` | CORS middleware | Manual config | Low | Comma-separated list of allowed origins |

**Storage**:
- Local dev: `backend/.env` (gitignored)
- Cloud Run: GCP Secret Manager → injected as environment variables

---

### GitHub Actions Secrets

| Secret | Used In | How to Get | Purpose |
|--------|---------|------------|---------|
| `GCP_PROJECT_ID` | CI/CD workflows | GCP Console | Your GCP project ID |
| `GCP_REGION` | Deploy workflow | Manual | e.g., `us-central1` |
| `GCP_WORKLOAD_ID_PROVIDER` | Auth workflow | GCP IAM → Workload Identity Federation | OIDC provider for keyless auth |
| `GCP_SERVICE_ACCOUNT_EMAIL` | Auth workflow | GCP IAM → Service Accounts | SA with Cloud Run deploy permissions |
| `DATABASE_URL` | Deploy workflow | Supabase | Injected into Cloud Run |
| `FIREWORKS_API_KEY` | Deploy workflow | Fireworks.ai | Injected into Cloud Run |
| `MEDIA_PUBLIC_BASE_URL` | Deploy workflow | Supabase or CDN | Public media base URL |
| `SUPABASE_DOMAIN` | Deploy workflow | Supabase | Format: `xxxxx.supabase.co` |
| `CODECOV_TOKEN` | CI workflow | Codecov.io → Repo Settings | For coverage uploads |

**Storage**: GitHub → Repository Settings → Secrets and variables → Actions

---

### Terraform Variables (infra/terraform.tfvars)

| Variable | Purpose | Source | Notes |
|----------|---------|--------|-------|
| `project` | GCP project ID | GCP Console | |
| `region` | GCP region | Manual | e.g., `us-central1` |
| `image` | Container image URL | CI builds | e.g., `us-central1-docker.pkg.dev/...` |
| `database_url` | Cloud Run env | Supabase | **Sensitive** |
| `fireworks_api_key` | Cloud Run env | Fireworks.ai | **Sensitive** |
| `media_public_base_url` | Cloud Run env | Supabase/CDN | |
| `supabase_jwt_aud` | Cloud Run env | Fixed | Usually `authenticated` |
| `supabase_jwt_iss` | Cloud Run env | Supabase | JWT issuer URL |
| `supabase_jwt_jwks` | Cloud Run env | Supabase | JWKS URL |

**Storage**:
- `terraform.tfvars` (gitignored - contains actual values)
- `terraform.tfvars.example` (committed - contains placeholders)

---

## Secret Rotation Procedures

### Quarterly Rotation (Scheduled)

1. **Supabase Database Password**
   - Supabase Dashboard → Settings → Database → Reset Database Password
   - Update `DATABASE_URL` in:
     - Local backend/.env
     - GCP Secret Manager
     - GitHub Actions secrets
     - Redeploy backend

2. **Fireworks AI Key**
   - Fireworks.ai → Create new API key
   - Update `FIREWORKS_API_KEY` in all environments
   - Delete old key after verification

3. **Sentry DSN** (if compromised)
   - Sentry.io → Regenerate DSN
   - Update in `.env`, GitHub Actions, EAS Secrets

### Emergency Rotation (Compromised Secret)

1. **Immediately revoke** the compromised secret
2. **Generate new** secret
3. **Update all locations** (see checklist below)
4. **Verify** all environments are working
5. **Document** the incident in `docs/incidents/`

### Rotation Checklist Template

```markdown
## Secret Rotation: [SECRET_NAME]

**Date**: YYYY-MM-DD
**Rotated by**: [Your Name]
**Reason**: [Scheduled/Compromised/Other]

### Updated Locations
- [ ] Local development (.env files)
- [ ] GCP Secret Manager (if applicable)
- [ ] GitHub Actions secrets
- [ ] EAS Secrets (if mobile secret)
- [ ] Terraform tfvars (if infrastructure)
- [ ] Password manager (team access)

### Verification
- [ ] Local development tested
- [ ] CI/CD pipeline passed
- [ ] Staging deployment verified
- [ ] Production deployment verified

### Cleanup
- [ ] Old secret revoked/deleted
- [ ] Team notified of rotation
```

---

## Access Control

### Who Has Access to What

| Secret Category | Developers | CI/CD | Production |
|----------------|-----------|-------|------------|
| Local .env files | ✅ All devs | ❌ | ❌ |
| Supabase anon key | ✅ All devs | ✅ | ✅ (public) |
| Supabase service role | ⚠️ Backend devs only | ✅ | ✅ |
| GCP credentials | ⚠️ Infra team only | ✅ (OIDC) | ❌ |
| Production DATABASE_URL | ⚠️ Infra team only | ✅ | ✅ |
| GitHub Actions secrets | ⚠️ Repo admins | ✅ | ❌ |

**Legend**:
- ✅ Has access
- ⚠️ Restricted access (need-to-know)
- ❌ No access

---

## Best Practices

### DO ✅

- **Use `.env.example` templates** - Document all required variables
- **Never commit secrets** - Use `.gitignore` for `.env`, `terraform.tfvars`
- **Use GCP Secret Manager** for production secrets
- **Enable audit logging** for secret access
- **Rotate quarterly** or when team members leave
- **Use Workload Identity Federation** instead of service account keys
- **Separate dev/staging/prod** secrets (different Supabase projects, GCP projects)
- **Document every secret** in this file

### DON'T ❌

- **Never hardcode secrets** in source code
- **Never log secret values** (even in debug mode)
- **Never share secrets** via chat/email (use password manager)
- **Never expose service role key** to mobile app
- **Never commit `.env` or `terraform.tfvars`** to git
- **Never use production secrets** in development
- **Never bypass RLS** in production code (use service role sparingly)

---

## Troubleshooting

### "DATABASE_URL is not set"
- Check `backend/.env` exists and is not empty
- Verify no typos in variable name
- Ensure `.env` is in `backend/` directory, not project root

### "JWT validation failed"
- Verify `SUPABASE_JWT_ISSUER` matches your Supabase project URL
- Check `SUPABASE_JWT_JWKS_URL` is accessible
- Ensure `SUPABASE_JWT_AUDIENCE` is `"authenticated"`

### "Cloud Run deployment fails"
- Check GitHub Actions secrets are set correctly
- Verify Workload Identity Federation is configured
- Ensure service account has Cloud Run Admin + Artifact Registry Writer roles

### "Supabase connection failed"
- Verify `DATABASE_URL` has correct password
- Check network connectivity (firewall, VPN)
- Ensure Supabase project is not paused
- Try connection pooling URL (pgbouncer) for Cloud Run

---

## Quick Reference

### Get Supabase Credentials

```bash
# 1. Navigate to Supabase Dashboard
open https://app.supabase.com/

# 2. Select your project (dev/staging/prod)

# 3. Go to Settings → API
# Copy:
# - Project URL → EXPO_PUBLIC_SUPABASE_URL
# - anon public → EXPO_PUBLIC_SUPABASE_ANON_KEY
# - service_role → SUPABASE_SERVICE_ROLE_KEY (backend only!)

# 4. Go to Settings → Database
# Copy Connection String (URI) → DATABASE_URL
# For Cloud Run, use "Connection pooling" string
```

### Setup Local Environment (First Time)

```bash
# 1. Copy templates
cp .env.example .env
cp backend/.env.example backend/.env

# 2. Edit .env files with your actual values
# Use your editor or:
nano .env
nano backend/.env

# 3. Verify backend connection
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/test_connection.py
```

---

## Related Documentation

- [infrastructure.md](../../infrastructure.md) - Overall infrastructure design
- [plan/detailplan.md](../../plan/detailplan.md) - Phase-by-phase implementation plan
- [AGENTS.md](../../AGENTS.md) - Repository structure and guidelines
- [Supabase Documentation](./supabase.md) - Supabase-specific setup (coming soon)

---

**Last Updated**: 2025-11-09
**Owner**: Infrastructure Team
**Review Schedule**: Quarterly (align with secret rotation)
