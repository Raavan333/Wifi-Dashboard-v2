-- ============================================================================
-- Enterprise WiFi Observability Platform - Aggregation Layer Migration
-- Eliminates 7.4M-row runtime scans on /dashboard for Recovery & Daily Activity
-- ============================================================================

-- 1. Add incremental recovery state columns to wifi_user_summary
ALTER TABLE wifi_user_summary
    ADD COLUMN IF NOT EXISTS recovered_after_failure BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS first_fail_timestamp TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_success_after_fail TIMESTAMPTZ;

-- 2. Backfill chronological recovery state per MAC:
--    FAIL event followed chronologically later by SUCCESS event for same user_mac
WITH mac_first_fail AS (
    SELECT
        user_mac,
        MIN(appeared_timestamp) AS first_fail_ts
    FROM wifi_event_history
    WHERE status = 'FAIL'
    GROUP BY user_mac
),
mac_last_success AS (
    SELECT
        e.user_mac,
        MAX(e.appeared_timestamp) AS last_success_ts
    FROM wifi_event_history e
    JOIN mac_first_fail f
      ON e.user_mac = f.user_mac
    WHERE e.status = 'SUCCESS'
      AND e.appeared_timestamp > f.first_fail_ts
    GROUP BY e.user_mac
)
UPDATE wifi_user_summary s
SET
    first_fail_timestamp = f.first_fail_ts,
    last_success_after_fail = ls.last_success_ts,
    recovered_after_failure = (ls.last_success_ts IS NOT NULL)
FROM mac_first_fail f
LEFT JOIN mac_last_success ls
  ON f.user_mac = ls.user_mac
WHERE s.user_mac = f.user_mac;

-- 3. Create daily_active_user_summary aggregation table
CREATE TABLE IF NOT EXISTS daily_active_user_summary (
    activity_date DATE PRIMARY KEY,
    active_users INTEGER NOT NULL DEFAULT 0,
    active_devices INTEGER NOT NULL DEFAULT 0,
    total_events BIGINT NOT NULL DEFAULT 0,
    success_events BIGINT NOT NULL DEFAULT 0,
    fail_events BIGINT NOT NULL DEFAULT 0,
    unknown_events BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Populate daily_active_user_summary from wifi_event_history + wifi_user_summary
INSERT INTO daily_active_user_summary (
    activity_date,
    active_users,
    active_devices,
    total_events,
    success_events,
    fail_events,
    unknown_events,
    updated_at
)
SELECT
    DATE(e.appeared_timestamp) AS activity_date,
    COUNT(DISTINCT s.employee_id) FILTER (WHERE s.employee_id IS NOT NULL) AS active_users,
    COUNT(DISTINCT e.user_mac) AS active_devices,
    COUNT(*) AS total_events,
    COUNT(*) FILTER (WHERE e.status = 'SUCCESS') AS success_events,
    COUNT(*) FILTER (WHERE e.status = 'FAIL') AS fail_events,
    COUNT(*) FILTER (WHERE e.status = 'UNKNOWN') AS unknown_events,
    NOW() AS updated_at
FROM wifi_event_history e
LEFT JOIN wifi_user_summary s
  ON e.user_mac = s.user_mac
WHERE e.appeared_timestamp IS NOT NULL
GROUP BY DATE(e.appeared_timestamp)
ON CONFLICT (activity_date) DO UPDATE SET
    active_users = EXCLUDED.active_users,
    active_devices = EXCLUDED.active_devices,
    total_events = EXCLUDED.total_events,
    success_events = EXCLUDED.success_events,
    fail_events = EXCLUDED.fail_events,
    unknown_events = EXCLUDED.unknown_events,
    updated_at = NOW();

-- 5. Supporting indexes for summary & investigation filters
CREATE INDEX IF NOT EXISTS idx_wus_recovered_after_failure
    ON wifi_user_summary (recovered_after_failure)
    WHERE first_fail_timestamp IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wus_ap_mac
    ON wifi_user_summary (ap_mac)
    WHERE ap_mac IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wus_asset_id
    ON wifi_user_summary (asset_id)
    WHERE asset_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wus_device_ip
    ON wifi_user_summary (device_ip)
    WHERE device_ip IS NOT NULL;

-- 6. Case-insensitive, trimmed functional indexes for fast entity resolution
CREATE INDEX IF NOT EXISTS idx_wus_user_mac_norm
    ON wifi_user_summary (LOWER(BTRIM(user_mac)));

CREATE INDEX IF NOT EXISTS idx_wus_location_norm
    ON wifi_user_summary (LOWER(BTRIM(location)))
    WHERE location IS NOT NULL AND BTRIM(location) <> '' AND UPPER(BTRIM(location)) <> 'NA';

CREATE INDEX IF NOT EXISTS idx_wus_ap_hostname_norm
    ON wifi_user_summary (LOWER(BTRIM(ap_hostname)))
    WHERE ap_hostname IS NOT NULL AND BTRIM(ap_hostname) <> '' AND UPPER(BTRIM(ap_hostname)) <> 'NA';

CREATE INDEX IF NOT EXISTS idx_wus_ap_mac_norm
    ON wifi_user_summary (LOWER(BTRIM(ap_mac)))
    WHERE ap_mac IS NOT NULL AND BTRIM(ap_mac) <> '' AND UPPER(BTRIM(ap_mac)) <> 'NA';
