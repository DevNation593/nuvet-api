# Technical Operations Runbook

## 1) E2E in CI

Workflow: .github/workflows/technical-quality.yml

Coverage:
- API test suite (Jest)
- Web test suite (Vitest)
- Real smoke E2E by starting API + Web and probing:
  - /api/v1/health/live
  - /api/v1/health/metrics
  - /auth/login

## 2) Observability

### Structured logs
- Request completion logs in JSON with:
  - requestId
  - method
  - path
  - statusCode
  - durationMs
  - tenantId

### Metrics
- Prometheus endpoint: GET /api/v1/health/metrics
- Includes:
  - default Node metrics (CPU, memory, GC, event loop)
  - nuvet_api_http_requests_total
  - nuvet_api_http_request_duration_ms

### Traces
- HTTP spans via TraceInterceptor using @opentelemetry/api
- Works as no-op by default until an OTEL SDK exporter is attached.

### Suggested alerts
- p95 latency > 500ms for 10m
- 5xx rate > 2% for 5m
- health/ready failing > 3 checks
- sudden drop of requests to zero in business hours

Template files:
- docs/observability/alerts.dev.prometheus.yml
- docs/observability/alerts.qa.prometheus.yml
- docs/observability/alerts.prod.prometheus.yml
- docs/observability/alerts.prometheus.yml (legacy/default profile)
- docs/observability/grafana-dashboard-starter.json

## 3) Backups and Recovery

Scripts:
- scripts/backup-db.sh
- scripts/restore-db.sh
- scripts/drill-backup-restore.sh

Drill evidence checklist:
- docs/drills/backup-restore-drill-checklist.md

Recommended policy:
- Full backup daily + retention 30 days
- Weekly restore drill in isolated environment
- RTO target: <= 60 minutes
- RPO target: <= 24 hours

## 4) Feature Flags

Flags are enabled through env vars:
- FEATURE_FLAGS=flag_a,flag_b
- FEATURE_FLAGS_JSON={"flag_a":true,"flag_b":false}

Scheduler env vars:
- CLINICAL_REMINDERS_CRON (default: every 2 hours)
- CLINICAL_REMINDERS_TIMEZONE (default: America/Guayaquil)

Implemented high-impact flags:
- clinical_reminders_manual_trigger
- clinical_reminders_scheduler

## 5) Deployment Hardening

### Secrets
- Keep secrets only in secret manager (no plain .env in repo)
- Rotate JWT, DB and provider credentials every 90 days
- Run credential leak scans on PRs

### Health checks
- Liveness: /api/v1/health/live
- Readiness: /api/v1/health/ready

### SLI / SLO baseline
- Availability SLO: 99.9%
- API latency SLO: p95 < 400ms
- Error budget burn alerts: 2h and 24h windows

### Incident process
- Detect via alerts
- Triage in < 15 minutes
- Mitigation + comms channel
- Postmortem within 48h
