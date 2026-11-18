# Enterprise WiFi Observability & Investigation Platform — Backend

Production FastAPI + `asyncpg` + PostgreSQL backend powering the WiFi Analytics Dashboard and Root-Cause Investigation workspace.

## Architecture

```
backend/
  requirements.txt
  .env.example
  sql/
    001_aggregation_layer.sql  # Pre-aggregated recovery columns & daily_active_user_summary
  app/
    main.py                    # FastAPI lifespan, CORS, logging, root-mounted routers
    config.py                  # Pydantic Settings (.env loader)
    logging_config.py          # Structured JSON logging
    api/                       # FastAPI routers & dependency injection
    services/                  # Business logic & 300s stampede-protected caching
    repositories/              # AsyncPG data access layer
    queries/                   # Parameterized PostgreSQL queries (7.4M+ event scale)
    schemas/                   # Pydantic v2 request/response contracts
    models/                    # Database entity models & schema exports
    db/                        # AsyncPG pool lifecycle & aggregation capability detection
    cache/                     # 300s TTL cache with per-key async locks
    constants/                 # Status & threshold constants
    middleware/                # Error handlers & structured request logging
    utils/                     # SQL QueryBuilder, pagination, validators
```

## Setup & Run

1. Apply the idempotent aggregation layer migration (recommended once so `/dashboard` avoids scanning 7.4M `wifi_event_history` rows):

```bash
psql "$DATABASE_URL" -f backend/sql/001_aggregation_layer.sql
```

2. Run the FastAPI server:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your PostgreSQL credentials
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Endpoints (Mounted at Root)

### Health
- `GET /health`

### Dashboard (300s TTL Cached)
- `GET /dashboard`
- `GET /dashboard/summary`
- `GET /dashboard/population`
- `GET /dashboard/connectivity` (includes `Success Rate`, `Failure Rate`, and `Recovery Rate`)
- `GET /dashboard/ssid` (explicitly reports `available: false` when `FAIL` events have no SSID values)
- `GET /dashboard/location` (exposes `location_coverage`)
- `GET /dashboard/activity` (uses `daily_active_user_summary` when available)
- `GET /dashboard/data-quality` (distinct `valid_users`, `ap_coverage`, `location_coverage`, plus `Employee Mapping %`, `UX Enrichment %`, `SSID Coverage`)
- `GET /dashboard/ap` (exposes `ap_coverage: {ap_coverage, mapped_devices, unmapped_devices}`)
- `GET /dashboard/inactive-users?page=1&page_size=50` (anchored to `MAX(last_seen_timestamp)`)
- `GET /dashboard/rare-users?page=1&page_size=50`

### Investigation
- `GET /investigate/search?query=...&page=1&page_size=20` (enriched cross-entity results)
- `GET /investigate/options` (300s TTL Cached, recursive B-tree index skip-scans)
- `GET /investigate/entity/{value}` (universal auto-detecting entity resolver across Employee, Device, AP MAC, AP, Location, SSID)
- `POST /investigate/events` (generic query engine supporting entity/numeric/temporal/boolean filters, `raw_message`/`metadata` search, `group_by`, `group_mode=raw|authentication_attempt`, max `page_size=500`)
- `POST /investigate/timeline` (supports `bucket=hour|day|week|month`)
- `POST /investigate/summary` (summary-consistent with Dashboard when no event-only filters are applied)
- `GET /investigate/user/{employee_id}`
- `GET /investigate/mac/{user_mac}` (case-insensitive, trimmed lookup)
- `GET /investigate/location/{location}` (case-insensitive, trimmed lookup)
- `GET /investigate/ssid/{ssid}` (case-insensitive, trimmed lookup)
- `GET /investigate/ap/{ap_hostname}` (case-insensitive, trimmed lookup with `ap_macs`, `first_seen`, `last_seen`, `metrics`)
- `GET /investigate/ap-mac/{ap_mac}` (case-insensitive, trimmed lookup with `ap_hostnames`, `first_seen`, `last_seen`, `metrics`)

## Query Analysis & Recommended Composite Indexes (Optional for 7.4M+ Scale)

The existing single-column indexes handle standard lookups. For heavy multi-filter investigation queries and chronological recovery scans on `wifi_event_history`, these composite indexes can further accelerate execution if `EXPLAIN ANALYZE` shows sequential scans:

- `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weh_mac_status_appeared ON wifi_event_history (user_mac, status, appeared_timestamp);` (accelerates chronological `FAIL` -> `SUCCESS` recovery checks and per-MAC timelines)
- `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weh_appeared_status ON wifi_event_history (appeared_timestamp DESC, status);` (accelerates default sorted paginated event explorer and daily timeline aggregations)
- `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weh_ssid_status ON wifi_event_history (ssid, status) WHERE ssid IS NOT NULL;` (accelerates SSID failure rate aggregation)
