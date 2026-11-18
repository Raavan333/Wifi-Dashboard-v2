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
    s.ap_mac,
    e.raw_message AS message,
    NULL::INTEGER AS attempt_count
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

# Collapses duplicate MAB / SESSION_MGR noise within 1-minute authentication attempt windows
AUTH_ATTEMPT_EVENTS_QUERY_TEMPLATE = """
WITH attempt_grouped AS (
    SELECT
        MAX(e.id) AS id,
        e.user_mac,
        MAX(s.employee_id) AS employee_id,
        e.facility,
        e.mnemonic,
        e.status,
        e.ssid,
        MAX(e.appeared_timestamp) AS appeared_timestamp,
        MAX(e.elasticsearch_timestamp) AS elasticsearch_timestamp,
        MAX(s.location) AS location,
        MAX(s.ap_hostname) AS ap_hostname,
        MAX(s.ap_mac) AS ap_mac,
        MAX(e.raw_message) AS message,
        COUNT(*)::INTEGER AS attempt_count
    FROM wifi_event_history e
    LEFT JOIN wifi_user_summary s
        ON e.user_mac = s.user_mac
    {where_clause}
    GROUP BY
        e.user_mac,
        e.facility,
        e.mnemonic,
        e.status,
        e.ssid,
        date_trunc('minute', e.appeared_timestamp)
)
SELECT
    *,
    COUNT(*) OVER() AS total_records
FROM attempt_grouped
{order_clause}
LIMIT ${limit_idx} OFFSET ${offset_idx};
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
# SUMMARY QUERIES (METRIC CONSISTENCY WITH DASHBOARD)
# ============================================================

# Fast summary path when no event-only filters are specified:
# Uses wifi_user_summary directly so unfiltered totals match Dashboard 100% (e.g. 15,869 devices, 18.32% success).
INVESTIGATION_SUMMARY_FROM_SUMMARY_AGG_TEMPLATE = """
SELECT
    COUNT(DISTINCT s.user_mac) AS total_devices,
    COUNT(DISTINCT s.employee_id)
        FILTER (WHERE s.employee_id IS NOT NULL) AS total_users,
    COUNT(DISTINCT s.employee_id)
        FILTER (
            WHERE s.employee_id IS NOT NULL
              AND s.total_success_count >= 1
        ) AS valid_users,
    COUNT(DISTINCT s.user_mac)
        FILTER (
            WHERE s.employee_id IS NULL
              AND s.total_success_count = 0
        ) AS invalid_users,
    COALESCE(
        ROUND(
            100.0 * SUM(s.total_success_count)
            / NULLIF(SUM(s.total_success_count) + SUM(s.total_failure_count), 0),
            2
        ),
        0
    ) AS success_rate,
    COALESCE(
        ROUND(
            100.0 * SUM(s.total_failure_count)
            / NULLIF(SUM(s.total_success_count) + SUM(s.total_failure_count), 0),
            2
        ),
        0
    ) AS failure_rate,
    COALESCE(
        ROUND(
            100.0 * COUNT(DISTINCT s.user_mac)
                FILTER (WHERE s.recovered_after_failure = TRUE)
            / NULLIF(
                COUNT(DISTINCT s.user_mac)
                    FILTER (WHERE s.first_fail_timestamp IS NOT NULL OR s.total_failure_count > 0),
                0
            ),
            2
        ),
        0
    ) AS recovery_rate
FROM wifi_user_summary s
{where_clause};
"""

INVESTIGATION_SUMMARY_FROM_SUMMARY_FALLBACK_TEMPLATE = """
WITH filtered_macs AS (
    SELECT
        s.user_mac,
        s.employee_id,
        s.total_success_count,
        s.total_failure_count
    FROM wifi_user_summary s
    {where_clause}
),
mac_recovery AS (
    SELECT
        e.user_mac,
        MIN(e.appeared_timestamp) FILTER (WHERE e.status = 'FAIL') AS first_fail_ts,
        MAX(e.appeared_timestamp) FILTER (WHERE e.status = 'SUCCESS') AS last_success_ts
    FROM wifi_event_history e
    JOIN filtered_macs fm ON e.user_mac = fm.user_mac
    WHERE e.status IN ('FAIL', 'SUCCESS')
    GROUP BY e.user_mac
),
rec_agg AS (
    SELECT
        COUNT(*) FILTER (WHERE first_fail_ts IS NOT NULL) AS failed_devices,
        COUNT(*) FILTER (
            WHERE first_fail_ts IS NOT NULL
              AND last_success_ts IS NOT NULL
              AND last_success_ts > first_fail_ts
        ) AS recovered_devices
    FROM mac_recovery
)
SELECT
    COUNT(DISTINCT fm.user_mac) AS total_devices,
    COUNT(DISTINCT fm.employee_id)
        FILTER (WHERE fm.employee_id IS NOT NULL) AS total_users,
    COUNT(DISTINCT fm.employee_id)
        FILTER (
            WHERE fm.employee_id IS NOT NULL
              AND fm.total_success_count >= 1
        ) AS valid_users,
    COUNT(DISTINCT fm.user_mac)
        FILTER (
            WHERE fm.employee_id IS NULL
              AND fm.total_success_count = 0
        ) AS invalid_users,
    COALESCE(
        ROUND(
            100.0 * SUM(fm.total_success_count)
            / NULLIF(SUM(fm.total_success_count) + SUM(fm.total_failure_count), 0),
            2
        ),
        0
    ) AS success_rate,
    COALESCE(
        ROUND(
            100.0 * SUM(fm.total_failure_count)
            / NULLIF(SUM(fm.total_success_count) + SUM(fm.total_failure_count), 0),
            2
        ),
        0
    ) AS failure_rate,
    COALESCE(
        ROUND(
            100.0 * (SELECT recovered_devices FROM rec_agg)
            / NULLIF((SELECT failed_devices FROM rec_agg), 0),
            2
        ),
        0
    ) AS recovery_rate
FROM filtered_macs fm;
"""

# Event-level summary path when event-only filters (status/mnemonic/facility/ssid/time) are applied
INVESTIGATION_SUMMARY_FROM_EVENTS_TEMPLATE = """
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
# GROUPED INVESTIGATION QUERIES (group_by ENGINE)
# ============================================================

GROUPED_SUMMARY_QUERY_TEMPLATE = """
WITH grouped AS (
    SELECT
        {group_expr} AS group_key,
        COUNT(DISTINCT s.employee_id)
            FILTER (WHERE s.employee_id IS NOT NULL) AS users,
        COUNT(DISTINCT s.user_mac) AS devices,
        COALESCE(SUM(s.total_appearance_count), 0) AS total_events,
        COALESCE(SUM(s.total_success_count), 0) AS success_count,
        COALESCE(SUM(s.total_failure_count), 0) AS failure_count,
        GREATEST(
            0,
            COALESCE(SUM(s.total_appearance_count), 0)
            - COALESCE(SUM(s.total_success_count), 0)
            - COALESCE(SUM(s.total_failure_count), 0)
        ) AS unknown_count,
        COALESCE(
            ROUND(
                100.0 * SUM(s.total_failure_count)
                / NULLIF(SUM(s.total_success_count) + SUM(s.total_failure_count), 0),
                2
            ),
            0
        ) AS failure_rate,
        MIN(s.first_seen_timestamp) AS first_seen,
        MAX(s.last_seen_timestamp) AS last_seen
    FROM wifi_user_summary s
    {extra_join}
    {where_clause}
    GROUP BY {group_expr}
)
SELECT
    *,
    COUNT(*) OVER() AS total_records
FROM grouped
ORDER BY total_events DESC, devices DESC
LIMIT ${limit_idx} OFFSET ${offset_idx};
"""

GROUPED_EVENTS_QUERY_TEMPLATE = """
WITH grouped AS (
    SELECT
        {group_expr} AS group_key,
        COUNT(DISTINCT s.employee_id)
            FILTER (WHERE s.employee_id IS NOT NULL) AS users,
        COUNT(DISTINCT e.user_mac) AS devices,
        COUNT(*) AS total_events,
        COUNT(*) FILTER (WHERE e.status = 'SUCCESS') AS success_count,
        COUNT(*) FILTER (WHERE e.status = 'FAIL') AS failure_count,
        COUNT(*) FILTER (WHERE e.status = 'UNKNOWN') AS unknown_count,
        COALESCE(
            ROUND(
                100.0 * COUNT(*) FILTER (WHERE e.status = 'FAIL')
                / NULLIF(COUNT(*) FILTER (WHERE e.status IN ('FAIL', 'SUCCESS')), 0),
                2
            ),
            0
        ) AS failure_rate,
        MIN(e.appeared_timestamp) AS first_seen,
        MAX(e.appeared_timestamp) AS last_seen
    FROM wifi_event_history e
    LEFT JOIN wifi_user_summary s
        ON e.user_mac = s.user_mac
    {where_clause}
    GROUP BY {group_expr}
)
SELECT
    *,
    COUNT(*) OVER() AS total_records
FROM grouped
ORDER BY total_events DESC, devices DESC
LIMIT ${limit_idx} OFFSET ${offset_idx};
"""

# ============================================================
# ENTITY GRAPH DETAILS (EMPLOYEE / MAC / LOCATION / SSID / AP / AP MAC)
# ============================================================

USER_DEVICES_QUERY_BASE = """
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

EMPLOYEE_ENTITY_RELATIONS_QUERY = """
SELECT
    COALESCE(
        ARRAY_AGG(DISTINCT location)
            FILTER (WHERE location IS NOT NULL AND location <> '' AND location <> 'NA'),
        ARRAY[]::TEXT[]
    ) AS locations,
    COALESCE(
        ARRAY_AGG(DISTINCT ap_hostname)
            FILTER (WHERE ap_hostname IS NOT NULL AND ap_hostname <> '' AND ap_hostname <> 'NA'),
        ARRAY[]::TEXT[]
    ) AS aps
FROM wifi_user_summary
WHERE employee_id = $1;
"""

EMPLOYEE_ENTITY_SSIDS_QUERY = """
SELECT DISTINCT ssid
FROM (
    SELECT UNNEST(observed_ssids) AS ssid
    FROM wifi_user_summary
    WHERE employee_id = $1
      AND observed_ssids IS NOT NULL
) t
WHERE ssid IS NOT NULL AND ssid <> ''
ORDER BY ssid;
"""

LOCATION_ENTITY_SUMMARY_QUERY = """
SELECT
    $1::TEXT AS location,
    COUNT(DISTINCT employee_id)
        FILTER (WHERE employee_id IS NOT NULL) AS users,
    COUNT(DISTINCT user_mac) AS devices,
    COALESCE(SUM(total_success_count), 0) AS success_count,
    COALESCE(SUM(total_failure_count), 0) AS failure_count,
    COALESCE(
        ROUND(
            100.0 * SUM(total_failure_count)
            / NULLIF(SUM(total_success_count) + SUM(total_failure_count), 0),
            2
        ),
        0
    ) AS failure_rate,
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
LIMIT 20;
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
  AND ap_hostname <> ''
  AND ap_hostname <> 'NA'
GROUP BY ap_hostname
ORDER BY users DESC, devices DESC
LIMIT 20;
"""

SSID_ENTITY_SUMMARY_QUERY = """
SELECT
    $1::TEXT AS ssid,
    COUNT(DISTINCT employee_id)
        FILTER (WHERE employee_id IS NOT NULL) AS users,
    COUNT(DISTINCT user_mac) AS devices,
    COALESCE(SUM(total_success_count), 0) AS success_count,
    COALESCE(SUM(total_failure_count), 0) AS failure_count,
    COALESCE(
        ROUND(
            100.0 * SUM(total_failure_count)
            / NULLIF(SUM(total_success_count) + SUM(total_failure_count), 0),
            2
        ),
        0
    ) AS failure_rate,
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
  AND location <> ''
  AND location <> 'NA'
GROUP BY location
ORDER BY users DESC, devices DESC
LIMIT 25;
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
  AND ap_hostname <> ''
  AND ap_hostname <> 'NA'
GROUP BY ap_hostname
ORDER BY users DESC, devices DESC
LIMIT 25;
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
            / NULLIF(SUM(total_success_count) + SUM(total_failure_count), 0),
            2
        ),
        0
    ) AS failure_rate,
    COALESCE(
        ARRAY_AGG(DISTINCT ap_mac)
            FILTER (WHERE ap_mac IS NOT NULL AND ap_mac <> '' AND ap_mac <> 'NA'),
        ARRAY[]::TEXT[]
    ) AS ap_macs,
    COALESCE(
        ARRAY_AGG(DISTINCT location)
            FILTER (WHERE location IS NOT NULL AND location <> '' AND location <> 'NA'),
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

AP_MAC_ENTITY_SUMMARY_QUERY = """
SELECT
    $1::TEXT AS ap_mac,
    COUNT(DISTINCT employee_id)
        FILTER (WHERE employee_id IS NOT NULL) AS users,
    COUNT(DISTINCT user_mac) AS devices,
    COALESCE(SUM(total_success_count), 0) AS success_count,
    COALESCE(SUM(total_failure_count), 0) AS failure_count,
    COALESCE(
        ROUND(
            100.0 * SUM(total_failure_count)
            / NULLIF(SUM(total_success_count) + SUM(total_failure_count), 0),
            2
        ),
        0
    ) AS failure_rate,
    COALESCE(
        ARRAY_AGG(DISTINCT ap_hostname)
            FILTER (WHERE ap_hostname IS NOT NULL AND ap_hostname <> '' AND ap_hostname <> 'NA'),
        ARRAY[]::TEXT[]
    ) AS ap_hostnames,
    COALESCE(
        ARRAY_AGG(DISTINCT location)
            FILTER (WHERE location IS NOT NULL AND location <> '' AND location <> 'NA'),
        ARRAY[]::TEXT[]
    ) AS locations
FROM wifi_user_summary
WHERE ap_mac = $1;
"""

AP_MAC_ENTITY_SSIDS_QUERY = """
SELECT DISTINCT ssid
FROM (
    SELECT UNNEST(observed_ssids) AS ssid
    FROM wifi_user_summary
    WHERE ap_mac = $1
      AND observed_ssids IS NOT NULL
) t
WHERE ssid IS NOT NULL AND ssid <> ''
ORDER BY ssid;
"""

# ============================================================
# FILTER OPTIONS (B-TREE INDEX SKIP-SCANS ON 7.4M EVENT COLUMNS + SUMMARY)
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
  AND location <> ''
  AND location <> 'NA'
ORDER BY location;
"""

FILTER_APS_QUERY = """
SELECT DISTINCT ap_hostname
FROM wifi_user_summary
WHERE ap_hostname IS NOT NULL
  AND ap_hostname <> ''
  AND ap_hostname <> 'NA'
ORDER BY ap_hostname;
"""

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
# ENRICHED CROSS-ENTITY GLOBAL SEARCH (TRUE SQL PAGINATION)
# ============================================================

GLOBAL_SEARCH_QUERY = """
WITH location_hits AS (
    SELECT
        location,
        COUNT(DISTINCT employee_id) FILTER (WHERE employee_id IS NOT NULL) AS users,
        COUNT(DISTINCT user_mac) AS devices,
        COALESCE(
            ROUND(
                100.0 * SUM(total_failure_count)
                / NULLIF(SUM(total_success_count) + SUM(total_failure_count), 0),
                2
            ),
            0
        )::DOUBLE PRECISION AS failure_rate
    FROM wifi_user_summary
    WHERE location IS NOT NULL
      AND location <> ''
      AND location <> 'NA'
      AND location ILIKE $1
    GROUP BY location
),
combined AS (
    -- Direct Location matches
    SELECT
        'Location'::TEXT AS entity_type,
        location AS display_value,
        'location'::TEXT AS matched_field,
        location AS location,
        users::INTEGER AS users,
        devices::INTEGER AS devices,
        failure_rate,
        NULL::TEXT AS related_to,
        1 AS priority
    FROM location_hits

    UNION ALL

    -- Direct Employee matches
    SELECT
        'Employee'::TEXT AS entity_type,
        employee_id::TEXT AS display_value,
        'employee_id'::TEXT AS matched_field,
        MAX(location) FILTER (WHERE location IS NOT NULL AND location <> 'NA') AS location,
        1::INTEGER AS users,
        COUNT(DISTINCT user_mac)::INTEGER AS devices,
        COALESCE(
            ROUND(
                100.0 * SUM(total_failure_count)
                / NULLIF(SUM(total_success_count) + SUM(total_failure_count), 0),
                2
            ),
            0
        )::DOUBLE PRECISION AS failure_rate,
        NULL::TEXT AS related_to,
        2 AS priority
    FROM wifi_user_summary
    WHERE employee_id IS NOT NULL
      AND employee_id::TEXT ILIKE $1
    GROUP BY employee_id

    UNION ALL

    -- Direct MAC matches
    SELECT
        'MAC'::TEXT AS entity_type,
        user_mac AS display_value,
        'user_mac'::TEXT AS matched_field,
        NULLIF(location, 'NA') AS location,
        (CASE WHEN employee_id IS NOT NULL THEN 1 ELSE 0 END)::INTEGER AS users,
        1::INTEGER AS devices,
        COALESCE(
            ROUND(
                100.0 * total_failure_count
                / NULLIF(total_success_count + total_failure_count, 0),
                2
            ),
            0
        )::DOUBLE PRECISION AS failure_rate,
        NULL::TEXT AS related_to,
        3 AS priority
    FROM wifi_user_summary
    WHERE user_mac ILIKE $1

    UNION ALL

    -- Direct SSID matches + Cross-entity SSIDs observed at matching Locations
    SELECT
        'SSID'::TEXT AS entity_type,
        ssid AS display_value,
        CASE WHEN ssid ILIKE $1 THEN 'ssid' ELSE 'location_relation' END AS matched_field,
        CASE
            WHEN COUNT(DISTINCT location) FILTER (WHERE location IS NOT NULL AND location <> 'NA') = 1
            THEN MAX(location) FILTER (WHERE location IS NOT NULL AND location <> 'NA')
            ELSE NULL
        END AS location,
        COUNT(DISTINCT employee_id) FILTER (WHERE employee_id IS NOT NULL)::INTEGER AS users,
        COUNT(DISTINCT user_mac)::INTEGER AS devices,
        COALESCE(
            ROUND(
                100.0 * SUM(total_failure_count)
                / NULLIF(SUM(total_success_count) + SUM(total_failure_count), 0),
                2
            ),
            0
        )::DOUBLE PRECISION AS failure_rate,
        CASE
            WHEN ssid ILIKE $1 THEN NULL
            ELSE MAX(location) FILTER (WHERE location IN (SELECT location FROM location_hits))
        END AS related_to,
        CASE WHEN ssid ILIKE $1 THEN 4 ELSE 7 END AS priority
    FROM (
        SELECT
            employee_id,
            user_mac,
            location,
            total_success_count,
            total_failure_count,
            UNNEST(observed_ssids) AS ssid
        FROM wifi_user_summary
        WHERE observed_ssids IS NOT NULL
    ) s_ssid
    WHERE ssid IS NOT NULL
      AND ssid <> ''
      AND (
          ssid ILIKE $1
          OR location IN (SELECT location FROM location_hits)
      )
    GROUP BY ssid

    UNION ALL

    -- Direct AP matches + Cross-entity APs observed at matching Locations
    SELECT
        'AP'::TEXT AS entity_type,
        ap_hostname AS display_value,
        CASE WHEN ap_hostname ILIKE $1 THEN 'ap_hostname' ELSE 'location_relation' END AS matched_field,
        MAX(location) FILTER (WHERE location IS NOT NULL AND location <> 'NA') AS location,
        COUNT(DISTINCT employee_id) FILTER (WHERE employee_id IS NOT NULL)::INTEGER AS users,
        COUNT(DISTINCT user_mac)::INTEGER AS devices,
        COALESCE(
            ROUND(
                100.0 * SUM(total_failure_count)
                / NULLIF(SUM(total_success_count) + SUM(total_failure_count), 0),
                2
            ),
            0
        )::DOUBLE PRECISION AS failure_rate,
        CASE
            WHEN ap_hostname ILIKE $1 THEN NULL
            ELSE MAX(location) FILTER (WHERE location IN (SELECT location FROM location_hits))
        END AS related_to,
        CASE WHEN ap_hostname ILIKE $1 THEN 5 ELSE 8 END AS priority
    FROM wifi_user_summary
    WHERE ap_hostname IS NOT NULL
      AND ap_hostname <> ''
      AND ap_hostname <> 'NA'
      AND (
          ap_hostname ILIKE $1
          OR location IN (SELECT location FROM location_hits)
      )
    GROUP BY ap_hostname

    UNION ALL

    -- Direct AP MAC matches
    SELECT
        'AP MAC'::TEXT AS entity_type,
        ap_mac AS display_value,
        'ap_mac'::TEXT AS matched_field,
        MAX(location) FILTER (WHERE location IS NOT NULL AND location <> 'NA') AS location,
        COUNT(DISTINCT employee_id) FILTER (WHERE employee_id IS NOT NULL)::INTEGER AS users,
        COUNT(DISTINCT user_mac)::INTEGER AS devices,
        COALESCE(
            ROUND(
                100.0 * SUM(total_failure_count)
                / NULLIF(SUM(total_success_count) + SUM(total_failure_count), 0),
                2
            ),
            0
        )::DOUBLE PRECISION AS failure_rate,
        NULL::TEXT AS related_to,
        6 AS priority
    FROM wifi_user_summary
    WHERE ap_mac IS NOT NULL
      AND ap_mac <> ''
      AND ap_mac <> 'NA'
      AND ap_mac ILIKE $1
    GROUP BY ap_mac

    UNION ALL

    -- Cached Facility matches
    SELECT
        'Facility'::TEXT AS entity_type,
        fac AS display_value,
        'facility'::TEXT AS matched_field,
        NULL::TEXT AS location,
        NULL::INTEGER AS users,
        NULL::INTEGER AS devices,
        NULL::DOUBLE PRECISION AS failure_rate,
        NULL::TEXT AS related_to,
        9 AS priority
    FROM UNNEST($2::TEXT[]) AS fac
    WHERE fac ILIKE $1

    UNION ALL

    -- Cached Mnemonic matches
    SELECT
        'Mnemonic'::TEXT AS entity_type,
        mnem AS display_value,
        'mnemonic'::TEXT AS matched_field,
        NULL::TEXT AS location,
        NULL::INTEGER AS users,
        NULL::INTEGER AS devices,
        NULL::DOUBLE PRECISION AS failure_rate,
        NULL::TEXT AS related_to,
        10 AS priority
    FROM UNNEST($3::TEXT[]) AS mnem
    WHERE mnem ILIKE $1
)
SELECT
    entity_type,
    display_value,
    matched_field,
    location,
    users,
    devices,
    failure_rate,
    related_to,
    COUNT(*) OVER() AS total_records
FROM combined
ORDER BY priority ASC, devices DESC NULLS LAST, display_value ASC
LIMIT $4 OFFSET $5;
"""
