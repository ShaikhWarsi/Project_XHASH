# Backend Systems Roadmap

## Priority 1 (P0) — Ship-blocking

| System | Status | Action |
|--------|--------|--------|
| **Auth (OAuth2, JWT)** | ❌ Missing | Add `fastapi-users` or custom JWT with `python-jose`. Store refresh tokens in DB. Required before any multi-tenant features. |
| **Audit log (immutable)** | ⚠️ Partial | In-memory `_audit_logs` list in `audit_routes.py`. Replace with DB-backed append-only table. |
| **Backup/restore** | ❌ Missing | Add `pg_dump` / SQLite backup to cron. Store backups in S3/MinIO. |
| **CI/CD** | ❌ Missing | GitHub Actions workflow: lint → test → build → deploy. |

## Priority 2 (P1) — Performance & Cost

| System | Status | Action |
|--------|--------|--------|
| **Cache layer (Redis)** | ⚠️ Partial | `api/cache_adapter.py` exists with Redis support; not wired into all routes. Wire into yfinance, Finnhub, market_data. |
| **Time-series DB** | ❌ Missing | Add TimescaleDB for OHLCV/orderbook storage. Migrate off SQLite for production. BRIN indexes already planned in migration. |
| **Object storage (S3/MinIO)** | ❌ Missing | Store chart exports, backtest results, reports. Add `boto3` / `minio` client. |
| **Message queue** | ⚠️ Partial | Celery config exists; no queue yet in production. Deploy Redis + Celery worker. |
| **Load balancer (nginx)** | ✅ Done | `deploy/nginx.conf` configured. |
| **CDN (Cloudflare)** | ❌ Missing | Point DNS to Cloudflare, cache static assets at edge. |

## Priority 3 (P2) — Observability & Ops

| System | Status | Action |
|--------|--------|--------|
| **Container orchestration** | ⚠️ Partial | `docker-compose.yml` exists. Migrate to Kubernetes or ECS for prod. |
| **Observability stack** | ⚠️ Partial | Prometheus instrumentator wired. Add Grafana dashboard, Loki log shipping, Tempo traces. |
| **APM** | ✅ Done | Sentry + DataDog wired (configurable via env vars). |
| **Secrets manager** | ❌ Missing | Move env vars to Vault or AWS Secrets Manager. Use `python-dotenv` for dev fallback. |

## Priority 4 (P3) — Growth

| System | Status | Action |
|--------|--------|--------|
| **Billing (Stripe)** | ❌ Missing | Add Stripe integration for usage-based billing on LLM calls. |
| **Tenant isolation** | ❌ Missing | Add `tenant_id` column to all models. Row-level security policies. |
| **API gateway** | ❌ Missing | Evaluate Kong or Tyk for rate limiting, auth, routing. Not urgent for single-server. |
| **Service mesh** | ❌ Missing | Overkill for v1. Revisit at 10+ microservices. |
| **Search (Elasticsearch)** | ❌ Missing | Index news, signals, trades. Add `elasticsearch-dsl` for full-text search. |
| **Disaster recovery** | ❌ Missing | Multi-region DB replication, S3 cross-region replication. |

## Current Architecture

```
Client → nginx → Uvicorn (4 workers) → SQLite/PostgreSQL
                                 └→ Redis (cache)
                                 └→ Celery (async tasks)
                                 └→ Sentry (APM)
```
