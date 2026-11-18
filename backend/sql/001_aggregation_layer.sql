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

-- 6. Exact incremental recovery updater (call after each summary ingestion batch)
--    Normal forward-time updates touch ONLY events since p_since; out-of-order
--    historical backfills automatically recompute only the affected MACs.
CREATE OR REPLACE FUNCTION refresh_wifi_user_recovery_incremental(p_since TIMESTAMPTZ DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_updated BIGINT := 0;
BEGIN
    WITH impacted_macs AS (
        SELECT DISTINCT user_mac
        FROM wifi_event_history
        WHERE status IN ('FAIL', 'SUCCESS')
          AND (p_since IS NULL OR appeared_timestamp >= p_since OR created_at >= p_since)
    ),
    delta_bounds AS (
        SELECT
            e.user_mac,
            MIN(e.appeared_timestamp) FILTER (WHERE e.status = 'FAIL') AS batch_min_fail,
            MAX(e.appeared_timestamp) FILTER (WHERE e.status = 'SUCCESS') AS batch_max_success
        FROM wifi_event_history e
        JOIN impacted_macs m ON e.user_mac = m.user_mac
        WHERE e.status IN ('FAIL', 'SUCCESS')
          AND (p_since IS NULL OR e.appeared_timestamp >= p_since OR e.created_at >= p_since)
        GROUP BY e.user_mac
    ),
    resolved AS (
        SELECT
            d.user_mac,
            CASE
                WHEN s.first_fail_timestamp IS NULL THEN d.batch_min_fail
                WHEN d.batch_min_fail IS NULL THEN s.first_fail_timestamp
                ELSE LEAST(s.first_fail_timestamp, d.batch_min_fail)
            END AS next_first_fail,
            s.first_fail_timestamp AS prev_first_fail,
            s.last_success_after_fail AS prev_last_success,
            d.batch_min_fail,
            d.batch_max_success
        FROM delta_bounds d
        JOIN wifi_user_summary s ON s.user_mac = d.user_mac
    ),
    late_backfill_recompute AS (
        SELECT
            e.user_mac,
            MIN(e.appeared_timestamp) FILTER (WHERE e.status = 'FAIL') AS exact_first_fail,
            MAX(e.appeared_timestamp) FILTER (WHERE e.status = 'SUCCESS') AS exact_max_success
        FROM wifi_event_history e
        JOIN resolved r ON e.user_mac = r.user_mac
        WHERE (
            r.batch_min_fail IS NOT NULL
            AND (
                r.prev_first_fail IS NULL
                OR r.batch_min_fail < r.prev_first_fail
            )
        )
          AND e.status IN ('FAIL', 'SUCCESS')
        GROUP BY e.user_mac
    )
    UPDATE wifi_user_summary s
    SET
        first_fail_timestamp = COALESCE(lb.exact_first_fail, r.next_first_fail),
        last_success_after_fail = CASE
            WHEN lb.user_mac IS NOT NULL THEN
                CASE
                    WHEN lb.exact_first_fail IS NOT NULL
                     AND lb.exact_max_success IS NOT NULL
                     AND lb.exact_max_success > lb.exact_first_fail
                    THEN lb.exact_max_success
                    ELSE NULL
                END
            WHEN r.next_first_fail IS NOT NULL
             AND GREATEST(r.prev_last_success, r.batch_max_success) IS NOT NULL
             AND GREATEST(r.prev_last_success, r.batch_max_success) > r.next_first_fail
            THEN GREATEST(r.prev_last_success, r.batch_max_success)
            ELSE r.prev_last_success
        END,
        recovered_after_failure = (
            COALESCE(lb.exact_first_fail, r.next_first_fail) IS NOT NULL
            AND (
                CASE
                    WHEN lb.user_mac IS NOT NULL THEN
                        lb.exact_max_success IS NOT NULL
                        AND lb.exact_max_success > lb.exact_first_fail
                    ELSE
                        GREATEST(r.prev_last_success, r.batch_max_success) IS NOT NULL
                        AND GREATEST(r.prev_last_success, r.batch_max_success) > r.next_first_fail
                END
            )
        )
    FROM resolved r
    LEFT JOIN late_backfill_recompute lb ON lb.user_mac = r.user_mac
    WHERE s.user_mac = r.user_mac;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$;

-- 7. Case-insensitive, whitespace-normalized functional indexes for fast entity resolution
CREATE INDEX IF NOT EXISTS idx_wus_user_mac_norm
    ON wifi_user_summary (LOWER(regexp_replace(BTRIM(user_mac), '\s+', ' ', 'g')));

CREATE INDEX IF NOT EXISTS idx_wus_location_norm
    ON wifi_user_summary (LOWER(regexp_replace(BTRIM(location), '\s+', ' ', 'g')))
    WHERE location IS NOT NULL AND BTRIM(location) <> '' AND UPPER(BTRIM(location)) <> 'NA';

CREATE INDEX IF NOT EXISTS idx_wus_ap_hostname_norm
    ON wifi_user_summary (LOWER(regexp_replace(BTRIM(ap_hostname), '\s+', ' ', 'g')))
    WHERE ap_hostname IS NOT NULL AND BTRIM(ap_hostname) <> '' AND UPPER(BTRIM(ap_hostname)) <> 'NA';

CREATE INDEX IF NOT EXISTS idx_wus_ap_mac_norm
    ON wifi_user_summary (LOWER(regexp_replace(BTRIM(ap_mac), '\s+', ' ', 'g')))
    WHERE ap_mac IS NOT NULL AND BTRIM(ap_mac) <> '' AND UPPER(BTRIM(ap_mac)) <> 'NA';
