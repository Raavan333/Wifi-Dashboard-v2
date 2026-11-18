# ============================================================
# BASE ENRICHED EVENT QUERIES (JOIN wifi_user_summary)
# ============================================================

BASE_EVENTS_QUERY = """
SELECT
    e.id,
    e.user_mac,
    s.employee_id,
    e.facility,
    e.mnemonic,
    e.status,
    e.ssid,
    e.appeared_timestamp,
    e.elasticsearch_timestamp,
    s.location,
    s.ap_hostname,
    e.raw_message AS message
FROM wifi_event_history e
LEFT JOIN wifi_user_summary s
    ON e.user_mac = s.user_mac
"""

BASE_EVENTS_COUNT_QUERY = """
SELECT COUNT(*)
FROM wifi_event_history e
LEFT JOIN wifi_user_summary s
    ON e.user_mac = s.user_mac
"""

# ============================================================
# TIMELINE (HONORS ALL INVESTIGATION FILTERS)
# ============================================================

EVENT_TIMELINE_QUERY = """
SELECT
    DATE(e.appeared_timestamp) AS activity_date,
    COUNT(*) FILTER (WHERE e.status = 'SUCCESS') AS success_count,
    COUNT(*) FILTER (WHERE e.status = 'FAIL') AS failure_count,
    COUNT(*) FILTER (WHERE e.status = 'UNKNOWN') AS unknown_count,
    COUNT(*) AS total_events
FROM wifi_event_history e
LEFT JOIN wifi_user_summary s
    ON e.user_mac = s.user_mac
"""

# ============================================================
# INVESTIGATION SUMMARY (HONORS ALL FILTERS + RECOVERY ORDER)
# ============================================================

INVESTIGATION_SUMMARY_QUERY_TEMPLATE = """
WITH filtered_events AS (
    SELECT
        e.user_mac,
        e.status,
        e.appeared_timestamp,
        s.employee_id,
        s.total_success_count
    FROM wifi_event_history e
    LEFT JOIN wifi_user_summary s
        ON e.user_mac = s.user_mac
    {where_clause}
),
mac_recovery AS (
    SELECT
        user_mac,
        MIN(appeared_timestamp) FILTER (WHERE status = 'FAIL') AS first_fail_ts,
        MAX(appeared_timestamp) FILTER (WHERE status = 'SUCCESS') AS last_success_ts
    FROM filtered_events
    WHERE status IN ('FAIL', 'SUCCESS')
    GROUP BY user_mac
),
recovery_agg AS (
    SELECT
        COUNT(*) FILTER (WHERE first_fail_ts IS NOT NULL) AS failed_devices,
        COUNT(*) FILTER (
            WHERE first_fail_ts IS NOT NULL
              AND last_success_ts IS NOT NULL
              AND last_success_ts > first_fail_ts
        ) AS recovered_devices
    FROM mac_recovery
),
event_agg AS (
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
                  AND COALESCE(total_success_count, 0) = 0
            ) AS invalid_users,
        COUNT(*) FILTER (WHERE status = 'SUCCESS') AS success_events,
        COUNT(*) FILTER (WHERE status = 'FAIL') AS failure_events
    FROM filtered_events
)
SELECT
    ea.total_devices,
    ea.total_users,
    ea.valid_users,
    ea.invalid_users,
    COALESCE(
        ROUND(
            100.0 * ea.success_events
            / NULLIF(ea.success_events + ea.failure_events, 0),
            2
        ),
        0
    ) AS success_rate,
    COALESCE(
        ROUND(
            100.0 * ea.failure_events
            / NULLIF(ea.success_events + ea.failure_events, 0),
            2
        ),
        0
    ) AS failure_rate,
    COALESCE(
        ROUND(
            100.0 * ra.recovered_devices
            / NULLIF(ra.failed_devices, 0),
            2
        ),
        0
    ) AS recovery_rate
FROM event_agg ea
CROSS JOIN recovery_agg ra;
"""

# ============================================================
# USER & MAC DETAILS
# ============================================================

USER_DEVICES_QUERY = """
SELECT
    user_mac,
    employee_id,
    total_appearance_count,
    total_success_count,
    total_failure_count,
    total_exclusion_count,
    last_event_status,
    first_seen_timestamp,
    last_seen_timestamp,
    observed_duration::TEXT AS observed_duration,
    ux_available,
    ux_timestamp,
    ux_last_queried_timestamp,
    asset_id,
    device_ip,
    location,
    ap_mac,
    ap_hostname,
    observed_ssids
FROM wifi_user_summary
"""

EMPLOYEE_PROFILE_QUERY = """
SELECT
    employee_id,
    COUNT(DISTINCT user_mac) AS total_devices,
    COALESCE(SUM(total_success_count), 0) AS total_success_count,
    COALESCE(SUM(total_failure_count), 0) AS total_failure_count,
    MIN(first_seen_timestamp) AS first_seen_timestamp,
    MAX(last_seen_timestamp) AS last_seen_timestamp
FROM wifi_user_summary
WHERE employee_id = $1
GROUP BY employee_id;
"""

# ============================================================
# ENTITY DETAIL QUERIES (LOCATION / SSID / AP)
# ============================================================

LOCATION_ENTITY_SUMMARY_QUERY = """
SELECT
    $1::TEXT AS location,
    COUNT(DISTINCT employee_id)
        FILTER (WHERE employee_id IS NOT NULL) AS users,
    COUNT(DISTINCT user_mac) AS devices,
    COALESCE(SUM(total_success_count), 0) AS success_count,
    COALESCE(SUM(total_failure_count), 0) AS failure_count,
    MIN(first_seen_timestamp) AS first_seen,
    MAX(last_seen_timestamp) AS last_seen
FROM wifi_user_summary
WHERE location = $1;
"""

LOCATION_TOP_SSIDS_QUERY = """
SELECT
    ssid,
    COUNT(DISTINCT employee_id)
        FILTER (WHERE employee_id IS NOT NULL) AS users,
    COUNT(DISTINCT user_mac) AS devices
FROM (
    SELECT
        employee_id,
        user_mac,
        UNNEST(observed_ssids) AS ssid
    FROM wifi_user_summary
    WHERE location = $1
      AND observed_ssids IS NOT NULL
) t
WHERE ssid IS NOT NULL AND ssid <> ''
GROUP BY ssid
ORDER BY users DESC, devices DESC
LIMIT 10;
"""

LOCATION_TOP_APS_QUERY = """
SELECT
    ap_hostname,
    COUNT(DISTINCT employee_id)
        FILTER (WHERE employee_id IS NOT NULL) AS users,
    COUNT(DISTINCT user_mac) AS devices,
    COALESCE(SUM(total_success_count), 0) AS success_count,
    COALESCE(SUM(total_failure_count), 0) AS failure_count
FROM wifi_user_summary
WHERE location = $1
  AND ap_hostname IS NOT NULL
  AND ap_hostname <> 'NA'
GROUP BY ap_hostname
ORDER BY users DESC, devices DESC
LIMIT 10;
"""

SSID_ENTITY_SUMMARY_QUERY = """
SELECT
    $1::TEXT AS ssid,
    COUNT(DISTINCT employee_id)
        FILTER (WHERE employee_id IS NOT NULL) AS users,
    COUNT(DISTINCT user_mac) AS devices,
    COALESCE(SUM(total_success_count), 0) AS success_count,
    COALESCE(SUM(total_failure_count), 0) AS failure_count,
    MIN(first_seen_timestamp) AS first_seen,
    MAX(last_seen_timestamp) AS last_seen
FROM wifi_user_summary
WHERE $1 = ANY(observed_ssids);
"""

SSID_LOCATIONS_QUERY = """
SELECT
    location,
    COUNT(DISTINCT employee_id)
        FILTER (WHERE employee_id IS NOT NULL) AS users,
    COUNT(DISTINCT user_mac) AS devices
FROM wifi_user_summary
WHERE $1 = ANY(observed_ssids)
  AND location IS NOT NULL
  AND location <> 'NA'
GROUP BY location
ORDER BY users DESC, devices DESC
LIMIT 20;
"""

SSID_APS_QUERY = """
SELECT
    ap_hostname,
    COUNT(DISTINCT employee_id)
        FILTER (WHERE employee_id IS NOT NULL) AS users,
    COUNT(DISTINCT user_mac) AS devices
FROM wifi_user_summary
WHERE $1 = ANY(observed_ssids)
  AND ap_hostname IS NOT NULL
  AND ap_hostname <> 'NA'
GROUP BY ap_hostname
ORDER BY users DESC, devices DESC
LIMIT 20;
"""

AP_ENTITY_SUMMARY_QUERY = """
SELECT
    $1::TEXT AS ap_hostname,
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
    ) AS failure_rate,
    COALESCE(
        ARRAY_AGG(DISTINCT location)
            FILTER (WHERE location IS NOT NULL AND location <> 'NA'),
        ARRAY[]::TEXT[]
    ) AS locations
FROM wifi_user_summary
WHERE ap_hostname = $1;
"""

AP_ENTITY_SSIDS_QUERY = """
SELECT DISTINCT ssid
FROM (
    SELECT UNNEST(observed_ssids) AS ssid
    FROM wifi_user_summary
    WHERE ap_hostname = $1
      AND observed_ssids IS NOT NULL
) t
WHERE ssid IS NOT NULL AND ssid <> ''
ORDER BY ssid;
"""

# ============================================================
# FILTER OPTIONS (INDEX SKIP-SCAN ON 7.4M EVENT COLUMNS + SUMMARY)
# ============================================================

FILTER_SSIDS_QUERY = """
SELECT DISTINCT ssid
FROM (
    SELECT UNNEST(observed_ssids) AS ssid
    FROM wifi_user_summary
    WHERE observed_ssids IS NOT NULL
) t
WHERE ssid IS NOT NULL AND ssid <> ''
ORDER BY ssid;
"""

FILTER_LOCATIONS_QUERY = """
SELECT DISTINCT location
FROM wifi_user_summary
WHERE location IS NOT NULL
  AND location <> 'NA'
ORDER BY location;
"""

FILTER_APS_QUERY = """
SELECT DISTINCT ap_hostname
FROM wifi_user_summary
WHERE ap_hostname IS NOT NULL
  AND ap_hostname <> 'NA'
ORDER BY ap_hostname;
"""

# Recursive B-tree index skip-scans avoid 7.4M-row full table scans
FILTER_STATUSES_SKIP_SCAN_QUERY = """
WITH RECURSIVE t AS (
    (
        SELECT status
        FROM wifi_event_history
        WHERE status IS NOT NULL
        ORDER BY status
        LIMIT 1
    )
    UNION ALL
    SELECT (
        SELECT h.status
        FROM wifi_event_history h
        WHERE h.status > t.status
        ORDER BY h.status
        LIMIT 1
    )
    FROM t
    WHERE t.status IS NOT NULL
)
SELECT status
FROM t
WHERE status IS NOT NULL
ORDER BY status;
"""

FILTER_FACILITIES_SKIP_SCAN_QUERY = """
WITH RECURSIVE t AS (
    (
        SELECT facility
        FROM wifi_event_history
        WHERE facility IS NOT NULL
        ORDER BY facility
        LIMIT 1
    )
    UNION ALL
    SELECT (
        SELECT h.facility
        FROM wifi_event_history h
        WHERE h.facility > t.facility
        ORDER BY h.facility
        LIMIT 1
    )
    FROM t
    WHERE t.facility IS NOT NULL
)
SELECT facility
FROM t
WHERE facility IS NOT NULL
ORDER BY facility;
"""

FILTER_MNEMONICS_SKIP_SCAN_QUERY = """
WITH RECURSIVE t AS (
    (
        SELECT mnemonic
        FROM wifi_event_history
        WHERE mnemonic IS NOT NULL
        ORDER BY mnemonic
        LIMIT 1
    )
    UNION ALL
    SELECT (
        SELECT h.mnemonic
        FROM wifi_event_history h
        WHERE h.mnemonic > t.mnemonic
        ORDER BY h.mnemonic
        LIMIT 1
    )
    FROM t
    WHERE t.mnemonic IS NOT NULL
)
SELECT mnemonic
FROM t
WHERE mnemonic IS NOT NULL
ORDER BY mnemonic;
"""

# ============================================================
# GLOBAL SEARCH (SQL UNION WITH TRUE LIMIT/OFFSET PAGINATION)
# Searches summary + distinct facility/mnemonic options without scanning 7.4M rows
# ============================================================

GLOBAL_SEARCH_QUERY = """
WITH combined AS (
    SELECT
        'Employee'::TEXT AS entity_type,
        employee_id::TEXT AS display_value,
        'employee_id'::TEXT AS matched_field,
        1 AS priority
    FROM (
        SELECT DISTINCT employee_id
        FROM wifi_user_summary
        WHERE employee_id IS NOT NULL
          AND employee_id::TEXT ILIKE $1
    ) emp

    UNION ALL

    SELECT
        'MAC'::TEXT AS entity_type,
        user_mac AS display_value,
        'user_mac'::TEXT AS matched_field,
        2 AS priority
    FROM wifi_user_summary
    WHERE user_mac ILIKE $1

    UNION ALL

    SELECT
        'SSID'::TEXT AS entity_type,
        ssid AS display_value,
        'ssid'::TEXT AS matched_field,
        3 AS priority
    FROM (
        SELECT DISTINCT UNNEST(observed_ssids) AS ssid
        FROM wifi_user_summary
        WHERE observed_ssids IS NOT NULL
    ) s
    WHERE ssid IS NOT NULL AND ssid <> '' AND ssid ILIKE $1

    UNION ALL

    SELECT
        'Location'::TEXT AS entity_type,
        location AS display_value,
        'location'::TEXT AS matched_field,
        4 AS priority
    FROM (
        SELECT DISTINCT location
        FROM wifi_user_summary
        WHERE location IS NOT NULL AND location <> 'NA'
    ) loc
    WHERE location ILIKE $1

    UNION ALL

    SELECT
        'AP'::TEXT AS entity_type,
        ap_hostname AS display_value,
        'ap_hostname'::TEXT AS matched_field,
        5 AS priority
    FROM (
        SELECT DISTINCT ap_hostname
        FROM wifi_user_summary
        WHERE ap_hostname IS NOT NULL AND ap_hostname <> 'NA'
    ) ap
    WHERE ap_hostname ILIKE $1

    UNION ALL

    SELECT
        'Facility'::TEXT AS entity_type,
        fac AS display_value,
        'facility'::TEXT AS matched_field,
        6 AS priority
    FROM UNNEST($2::TEXT[]) AS fac
    WHERE fac ILIKE $1

    UNION ALL

    SELECT
        'Mnemonic'::TEXT AS entity_type,
        mnem AS display_value,
        'mnemonic'::TEXT AS matched_field,
        7 AS priority
    FROM UNNEST($3::TEXT[]) AS mnem
    WHERE mnem ILIKE $1
)
SELECT
    entity_type,
    display_value,
    matched_field,
    COUNT(*) OVER() AS total_records
FROM combined
ORDER BY priority ASC, display_value ASC
LIMIT $4 OFFSET $5;
"""
