# Enterprise WiFi Observability & Investigation Platform — Backend

Production FastAPI + `asyncpg` + PostgreSQL backend powering the WiFi Analytics Dashboard and Root-Cause Investigation workspace.

## Architecture

```
backend/
  requirements.txt
  .env.example
  app/
    main.py                 # FastAPI lifespan, CORS, logging, root-mounted routers
    config.py               # Pydantic Settings (.env loader)
    logging_config.py       # Structured JSON logging
    api/                    # FastAPI routers & dependency injection
    services/               # Business logic & 300s stampede-protected caching
    repositories/           # AsyncPG data access layer
    queries/                # Parameterized PostgreSQL queries (7.4M+ event scale)
    schemas/                # Pydantic v2 request/response contracts
    models/                 # Database entity models & schema exports
    db/                     # AsyncPG pool lifecycle & prepared statements
    cache/                  # 300s TTL cache with per-key async locks
    constants/              # Status & threshold constants
    middleware/             # Error handlers & structured request logging
    utils/                  # SQL QueryBuilder, pagination, validators
```

## Setup & Run

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
- `GET /dashboard/connectivity`
- `GET /dashboard/ssid`
- `GET /dashboard/location`
- `GET /dashboard/activity`
- `GET /dashboard/data-quality`
- `GET /dashboard/ap`
- `GET /dashboard/inactive-users?page=1&page_size=50`
- `GET /dashboard/rare-users?page=1&page_size=50`

### Investigation
- `GET /investigate/search?query=...&page=1&page_size=20`
- `GET /investigate/options` (300s TTL Cached, recursive B-tree index skip-scans)
- `POST /investigate/events` (max `page_size=500`)
- `POST /investigate/timeline`
- `POST /investigate/summary`
- `GET /investigate/user/{employee_id}`
- `GET /investigate/mac/{user_mac}`
- `GET /investigate/location/{location}`
- `GET /investigate/ssid/{ssid}`
- `GET /investigate/ap/{ap_hostname}`

## Query Analysis & Recommended Composite Indexes (Optional for 7.4M+ Scale)

The existing single-column indexes handle standard lookups. For heavy multi-filter investigation queries and chronological recovery scans on `wifi_event_history`, these composite indexes can further accelerate execution if `EXPLAIN ANALYZE` shows sequential scans:

- `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weh_mac_status_appeared ON wifi_event_history (user_mac, status, appeared_timestamp);` (accelerates chronological `FAIL` -> `SUCCESS` recovery checks and per-MAC timelines)
- `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weh_appeared_status ON wifi_event_history (appeared_timestamp DESC, status);` (accelerates default sorted paginated event explorer and daily timeline aggregations)
- `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weh_ssid_status ON wifi_event_history (ssid, status) WHERE ssid IS NOT NULL;` (accelerates SSID failure rate aggregation)
