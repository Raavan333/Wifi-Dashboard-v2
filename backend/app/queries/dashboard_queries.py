# ============================================================
# EXECUTIVE SUMMARY
# ============================================================

EXECUTIVE_SUMMARY_QUERY = """
SELECT
    COUNT(DISTINCT user_mac) AS total_devices,
    COUNT(DISTINCT employee_id)
        FILTER (WHERE employee_id IS NOT NULL) AS total_users,
    COUNT(DISTINCT employee_id)
        FILTER (
            WHERE employee_id IS NOT NULL
              AND total_success_count >= 1
        ) AS valid_users,
    COUNT(DISTINCT user_mac)
        FILTER (
            WHERE employee_id IS NULL
              AND total_success_count = 0
        ) AS invalid_devices,
    COUNT(DISTINCT user_mac)
        FILTER (WHERE ux_available = FALSE) AS ux_missing
FROM wifi_user_summary;
"""

SUCCESS_FAILURE_QUERY = """
SELECT
    COALESCE(SUM(total_success_count), 0) AS success_count,
    COALESCE(SUM(total_failure_count), 0) AS failure_count
FROM wifi_user_summary;
"""

# Pre-aggregated recovery query (<5ms, zero 7.4M event scan)
RECOVERY_ANALYSIS_SUMMARY_QUERY = """
SELECT
    COUNT(DISTINCT user_mac)
        FILTER (WHERE first_fail_timestamp IS NOT NULL OR total_failure_count > 0)
        AS failed_devices,
    COUNT(DISTINCT user_mac)
        FILTER (WHERE recovered_after_failure = TRUE)
        AS recovered_devices,
    COUNT(DISTINCT user_mac)
        FILTER (
            WHERE (first_fail_timestamp IS NOT NULL OR total_failure_count > 0)
              AND COALESCE(recovered_after_failure, FALSE) = FALSE
        )
        AS unrecovered_devices
FROM wifi_user_summary;
"""

# Fallback recovery query only if 001_aggregation_layer.sql has not been applied
RECOVERY_ANALYSIS_EVENT_FALLBACK_QUERY = """
WITH mac_bounds AS (
    SELECT
        user_mac,
        MIN(appeared_timestamp) FILTER (WHERE status = 'FAIL') AS first_fail_ts,
        MAX(appeared_timestamp) FILTER (WHERE status = 'SUCCESS') AS last_success_ts
    FROM wifi_event_history
    WHERE status IN ('FAIL', 'SUCCESS')
    GROUP BY user_mac
)
SELECT
    COUNT(*) FILTER (WHERE first_fail_ts IS NOT NULL) AS failed_devices,
    COUNT(*) FILTER (
        WHERE first_fail_ts IS NOT NULL
          AND last_success_ts IS NOT NULL
          AND last_success_ts > first_fail_ts
    ) AS recovered_devices,
    COUNT(*) FILTER (
        WHERE first_fail_ts IS NOT NULL
          AND (last_success_ts IS NULL OR last_success_ts <= first_fail_ts)
    ) AS unrecovered_devices
FROM mac_bounds;
"""

# ============================================================
# USER POPULATION
# ============================================================

USER_POPULATION_QUERY = """
WITH multi AS (
    SELECT employee_id
    FROM wifi_user_summary
    WHERE employee_id IS NOT NULL
    GROUP BY employee_id
    HAVING COUNT(DISTINCT user_mac) > 1
)
SELECT
    COUNT(DISTINCT w.employee_id)
        FILTER (
            WHERE w.employee_id IS NOT NULL
              AND w.total_success_count >= 1
        ) AS valid_users,
    (SELECT COUNT(*) FROM multi) AS multi_device_users
FROM wifi_user_summary w;
"""

DEVICE_DISTRIBUTION_QUERY = """
WITH device_counts AS (
    SELECT
        employee_id,
        COUNT(DISTINCT user_mac) AS device_count
    FROM wifi_user_summary
    WHERE employee_id IS NOT NULL
    GROUP BY employee_id
)
SELECT
    bucket,
    COUNT(*) AS user_count
FROM (
    SELECT
        CASE
            WHEN device_count = 1 THEN '1'
            WHEN device_count = 2 THEN '2'
            WHEN device_count = 3 THEN '3'
            WHEN device_count BETWEEN 4 AND 5 THEN '4-5'
            ELSE '6+'
        END AS bucket,
        CASE
            WHEN device_count = 1 THEN 1
            WHEN device_count = 2 THEN 2
            WHEN device_count = 3 THEN 3
            WHEN device_count BETWEEN 4 AND 5 THEN 4
            ELSE 5
        END AS sort_order
    FROM device_counts
) bucketed
GROUP BY bucket, sort_order
ORDER BY sort_order;
"""

# Uses MAX(last_seen_timestamp) as reference timestamp so historical datasets work accurately
RECENT_ACTIVITY_QUERY = """
WITH ref AS (
    SELECT MAX(last_seen_timestamp) AS max_ts
    FROM wifi_user_summary
)
SELECT
    COUNT(DISTINCT w.user_mac)
        FILTER (WHERE w.last_seen_timestamp >= r.max_ts - INTERVAL '7 days')
        AS macs_last_7_days,
    COUNT(DISTINCT w.user_mac)
        FILTER (WHERE w.last_seen_timestamp >= r.max_ts - INTERVAL '30 days')
        AS macs_last_30_days,
    COUNT(DISTINCT w.user_mac)
        FILTER (WHERE w.last_seen_timestamp >= r.max_ts - INTERVAL '90 days')
        AS macs_last_90_days
FROM wifi_user_summary w
CROSS JOIN ref r;
"""

# ============================================================
# CONNECTIVITY HEALTH
# ============================================================

CONNECTIVITY_HEALTH_QUERY = """
SELECT
    COALESCE(SUM(total_success_count), 0) AS total_success,
    COALESCE(SUM(total_failure_count), 0) AS total_failure,
    COALESCE(
        ROUND(
            100.0 * SUM(total_success_count)
            / NULLIF(SUM(total_success_count) + SUM(total_failure_count), 0),
            2
        ),
        0
    ) AS success_rate,
    COALESCE(
        ROUND(
            100.0 * SUM(total_failure_count)
            / NULLIF(SUM(total_success_count) + SUM(total_failure_count), 0),
            2
        ),
        0
    ) AS failure_rate
FROM wifi_user_summary;
"""

OUTCOME_DISTRIBUTION_QUERY = """
SELECT
    COUNT(DISTINCT user_mac)
        FILTER (WHERE total_success_count > 0 AND total_failure_count = 0)
        AS success_only,
    COUNT(DISTINCT user_mac)
        FILTER (WHERE total_success_count > 0 AND total_failure_count > 0)
        AS success_and_failure,
    COUNT(DISTINCT user_mac)
        FILTER (WHERE total_success_count = 0 AND total_failure_count > 0)
        AS failure_only,
    COUNT(DISTINCT user_mac)
        FILTER (WHERE total_success_count = 0 AND total_failure_count = 0)
        AS unknown_only
FROM wifi_user_summary;
"""

# ============================================================
# SSID INTELLIGENCE
# ============================================================

SSID_DISTRIBUTION_QUERY = """
SELECT
    ssid,
    COUNT(DISTINCT employee_id) AS user_count
FROM (
    SELECT
        employee_id,
        UNNEST(observed_ssids) AS ssid
    FROM wifi_user_summary
    WHERE employee_id IS NOT NULL
      AND observed_ssids IS NOT NULL
) tmp
WHERE ssid IS NOT NULL AND ssid <> ''
GROUP BY ssid
ORDER BY user_count DESC
LIMIT $1;
"""

SSID_COMBINATIONS_QUERY = """
WITH normalized AS (
    SELECT
        employee_id,
        ARRAY_TO_STRING(
            ARRAY(
                SELECT DISTINCT s
                FROM UNNEST(observed_ssids) AS s
                WHERE s IS NOT NULL AND s <> ''
                ORDER BY s
            ),
            ' + '
        ) AS ssid_combination
    FROM wifi_user_summary
    WHERE employee_id IS NOT NULL
      AND observed_ssids IS NOT NULL
      AND cardinality(observed_ssids) > 0
)
SELECT
    ssid_combination,
    COUNT(DISTINCT employee_id) AS user_count
FROM normalized
WHERE ssid_combination <> ''
GROUP BY ssid_combination
ORDER BY user_count DESC
LIMIT $1;
"""

SSID_FAIL_EXISTS_QUERY = """
SELECT EXISTS (
    SELECT 1
    FROM wifi_event_history
    WHERE status = 'FAIL'
      AND ssid IS NOT NULL
      AND ssid <> ''
    LIMIT 1
);
"""

SSID_FAILURE_DISTRIBUTION_QUERY = """
SELECT
    ssid,
    COUNT(*) FILTER (WHERE status = 'FAIL') AS failure_count,
    COALESCE(
        ROUND(
            100.0 * COUNT(*) FILTER (WHERE status = 'FAIL')
            / NULLIF(COUNT(*) FILTER (WHERE status IN ('FAIL', 'SUCCESS')), 0),
            2
        ),
        0
    ) AS failure_rate
FROM wifi_event_history
WHERE ssid IS NOT NULL
  AND ssid <> ''
  AND status IN ('FAIL', 'SUCCESS')
GROUP BY ssid
HAVING COUNT(*) FILTER (WHERE status = 'FAIL') > 0
ORDER BY failure_count DESC
LIMIT $1;
"""

# ============================================================
# LOCATION OVERVIEW
# ============================================================

LOCATION_USERS_DISTRIBUTION_QUERY = r"""
SELECT
    regexp_replace(BTRIM(location), '\s+', ' ', 'g') AS location,
    COUNT(DISTINCT employee_id) AS user_count
FROM wifi_user_summary
WHERE location IS NOT NULL
  AND BTRIM(location) <> ''
  AND UPPER(BTRIM(location)) <> 'NA'
  AND employee_id IS NOT NULL
GROUP BY regexp_replace(BTRIM(location), '\s+', ' ', 'g')
ORDER BY user_count DESC
LIMIT $1;
"""

LOCATION_DEVICES_DISTRIBUTION_QUERY = r"""
SELECT
    regexp_replace(BTRIM(location), '\s+', ' ', 'g') AS location,
    COUNT(DISTINCT user_mac) AS device_count
FROM wifi_user_summary
WHERE location IS NOT NULL
  AND BTRIM(location) <> ''
  AND UPPER(BTRIM(location)) <> 'NA'
GROUP BY regexp_replace(BTRIM(location), '\s+', ' ', 'g')
ORDER BY device_count DESC
LIMIT $1;
"""

# ============================================================
# USER ACTIVITY
# ============================================================

DURATION_DISTRIBUTION_QUERY = """
SELECT
    duration_bucket,
    COUNT(DISTINCT employee_id) AS user_count
FROM (
    SELECT
        employee_id,
        CASE
            WHEN observed_duration < INTERVAL '1 day' THEN '<1 Day'
            WHEN observed_duration < INTERVAL '7 days' THEN '1-7 Days'
            WHEN observed_duration < INTERVAL '30 days' THEN '7-30 Days'
            WHEN observed_duration < INTERVAL '60 days' THEN '30-60 Days'
            ELSE '60-90 Days'
        END AS duration_bucket,
        CASE
            WHEN observed_duration < INTERVAL '1 day' THEN 1
            WHEN observed_duration < INTERVAL '7 days' THEN 2
            WHEN observed_duration < INTERVAL '30 days' THEN 3
            WHEN observed_duration < INTERVAL '60 days' THEN 4
            ELSE 5
        END AS sort_order
    FROM wifi_user_summary
    WHERE observed_duration IS NOT NULL
      AND employee_id IS NOT NULL
) bucketed
GROUP BY duration_bucket, sort_order
ORDER BY sort_order;
"""

NEW_USERS_TREND_QUERY = """
WITH first_emp AS (
    SELECT
        employee_id,
        MIN(first_seen_timestamp) AS first_seen
    FROM wifi_user_summary
    WHERE employee_id IS NOT NULL
      AND first_seen_timestamp IS NOT NULL
    GROUP BY employee_id
)
SELECT
    DATE(first_seen) AS observation_date,
    COUNT(*) AS users
FROM first_emp
GROUP BY DATE(first_seen)
ORDER BY observation_date;
"""

# Pre-aggregated daily_active_user_summary (<2ms)
ACTIVE_USERS_TREND_AGG_QUERY = """
SELECT
    activity_date AS observation_date,
    active_users AS users
FROM daily_active_user_summary
ORDER BY activity_date;
"""

# Fallback only if daily_active_user_summary table does not exist yet
ACTIVE_USERS_TREND_FALLBACK_QUERY = """
SELECT
    DATE(e.appeared_timestamp) AS observation_date,
    COUNT(DISTINCT s.employee_id) AS users
FROM wifi_event_history e
JOIN wifi_user_summary s
  ON e.user_mac = s.user_mac
WHERE e.appeared_timestamp IS NOT NULL
  AND s.employee_id IS NOT NULL
GROUP BY DATE(e.appeared_timestamp)
ORDER BY observation_date;
"""

# ============================================================
# DATA QUALITY (VALID CLASSIFICATION = DISTINCT EMPLOYEE COUNT)
# ============================================================

DATA_QUALITY_QUERY = """
SELECT
    COUNT(DISTINCT user_mac) AS total_devices,
    COUNT(DISTINCT employee_id)
        FILTER (
            WHERE employee_id IS NOT NULL
              AND total_success_count >= 1
        ) AS valid_users,
    COUNT(DISTINCT user_mac)
        FILTER (WHERE employee_id IS NULL) AS unmapped_users,
    COUNT(DISTINCT user_mac)
        FILTER (WHERE ux_available = FALSE) AS ux_missing,
    COUNT(DISTINCT user_mac)
        FILTER (
            WHERE employee_id IS NULL
              AND total_success_count = 0
        ) AS invalid_devices,
    COUNT(DISTINCT user_mac)
        FILTER (WHERE employee_id IS NOT NULL) AS employee_mapped_devices,
    COUNT(DISTINCT user_mac)
        FILTER (WHERE ux_available = TRUE) AS ux_enriched_devices,
    COUNT(DISTINCT user_mac)
        FILTER (
            WHERE location IS NOT NULL
              AND BTRIM(location) <> ''
              AND UPPER(BTRIM(location)) <> 'NA'
        ) AS location_mapped_devices,
    COUNT(DISTINCT user_mac)
        FILTER (
            WHERE ap_hostname IS NOT NULL
              AND BTRIM(ap_hostname) <> ''
              AND UPPER(BTRIM(ap_hostname)) <> 'NA'
        ) AS ap_mapped_devices,
    COUNT(DISTINCT user_mac)
        FILTER (
            WHERE observed_ssids IS NOT NULL
              AND cardinality(observed_ssids) > 0
        ) AS ssid_covered_devices
FROM wifi_user_summary;
"""

COVERAGE_METRICS_QUERY = """
SELECT
    COUNT(DISTINCT user_mac) AS total_devices,
    COUNT(DISTINCT user_mac)
        FILTER (
            WHERE ap_hostname IS NOT NULL
              AND BTRIM(ap_hostname) <> ''
              AND UPPER(BTRIM(ap_hostname)) <> 'NA'
        ) AS ap_mapped_devices,
    COUNT(DISTINCT user_mac)
        FILTER (
            WHERE location IS NOT NULL
              AND BTRIM(location) <> ''
              AND UPPER(BTRIM(location)) <> 'NA'
        ) AS location_mapped_devices
FROM wifi_user_summary;
"""

# ============================================================
# AP ANALYTICS
# ============================================================

TOP_APS_QUERY = r"""
SELECT
    regexp_replace(BTRIM(ap_hostname), '\s+', ' ', 'g') AS ap_hostname,
    COUNT(DISTINCT employee_id)
        FILTER (WHERE employee_id IS NOT NULL) AS users,
    COUNT(DISTINCT user_mac) AS devices,
    COALESCE(SUM(total_success_count), 0) AS success_count,
    COALESCE(SUM(total_failure_count), 0) AS failure_count,
    COALESCE(
        ROUND(
            100.0 * SUM(total_failure_count)
            / NULLIF(SUM(total_success_count + total_failure_count), 0),
            2
        ),
        0
    ) AS failure_rate
FROM wifi_user_summary
WHERE ap_hostname IS NOT NULL
  AND BTRIM(ap_hostname) <> ''
  AND UPPER(BTRIM(ap_hostname)) <> 'NA'
GROUP BY regexp_replace(BTRIM(ap_hostname), '\s+', ' ', 'g')
ORDER BY users DESC, devices DESC
LIMIT $1;
"""

WORST_APS_QUERY = r"""
SELECT
    regexp_replace(BTRIM(ap_hostname), '\s+', ' ', 'g') AS ap_hostname,
    COUNT(DISTINCT employee_id)
        FILTER (WHERE employee_id IS NOT NULL) AS users,
    COUNT(DISTINCT user_mac) AS devices,
    COALESCE(SUM(total_success_count), 0) AS success_count,
    COALESCE(SUM(total_failure_count), 0) AS failure_count,
    COALESCE(
        ROUND(
            100.0 * SUM(total_failure_count)
            / NULLIF(SUM(total_success_count + total_failure_count), 0),
            2
        ),
        0
    ) AS failure_rate
FROM wifi_user_summary
WHERE ap_hostname IS NOT NULL
  AND BTRIM(ap_hostname) <> ''
  AND UPPER(BTRIM(ap_hostname)) <> 'NA'
GROUP BY regexp_replace(BTRIM(ap_hostname), '\s+', ' ', 'g')
HAVING COALESCE(SUM(total_success_count + total_failure_count), 0) >= $1
ORDER BY failure_rate DESC, failure_count DESC
LIMIT $2;
"""

# ============================================================
# INACTIVE USERS (USES MAX(last_seen_timestamp) AS REFERENCE)
# ============================================================

INACTIVE_USERS_QUERY = """
WITH ref AS (
    SELECT MAX(last_seen_timestamp) AS max_ts
    FROM wifi_user_summary
)
SELECT
    w.employee_id,
    COUNT(DISTINCT w.user_mac) AS device_count,
    MAX(w.last_seen_timestamp) AS last_seen_timestamp,
    COUNT(*) OVER() AS total_records
FROM wifi_user_summary w
CROSS JOIN ref r
WHERE w.employee_id IS NOT NULL
GROUP BY w.employee_id, r.max_ts
HAVING MAX(w.last_seen_timestamp) < r.max_ts - ($1::INT * INTERVAL '1 day')
ORDER BY last_seen_timestamp ASC NULLS FIRST
LIMIT $2 OFFSET $3;
"""

# ============================================================
# RARE USERS
# ============================================================

RARE_USERS_QUERY = """
SELECT
    employee_id,
    COUNT(DISTINCT user_mac) AS device_count,
    COALESCE(SUM(total_appearance_count), 0) AS appearance_count,
    MAX(last_seen_timestamp) AS last_seen_timestamp,
    COUNT(*) OVER() AS total_records
FROM wifi_user_summary
WHERE employee_id IS NOT NULL
GROUP BY employee_id
HAVING COALESCE(SUM(total_appearance_count), 0) < $1
ORDER BY appearance_count ASC, last_seen_timestamp DESC NULLS LAST
LIMIT $2 OFFSET $3;
"""
