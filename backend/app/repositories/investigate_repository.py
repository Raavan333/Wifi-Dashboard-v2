from typing import Optional

from asyncpg import Record

from app.db.database import Database, db
from app.queries.investigate_queries import (
    AP_ENTITY_SSIDS_QUERY,
    AP_ENTITY_SUMMARY_QUERY,
    AP_MAC_ENTITY_SSIDS_QUERY,
    AP_MAC_ENTITY_SUMMARY_QUERY,
    AUTH_ATTEMPT_EVENTS_QUERY_TEMPLATE,
    BASE_EVENTS_COUNT_QUERY,
    BASE_EVENTS_QUERY,
    EMPLOYEE_ENTITY_RELATIONS_QUERY,
    EMPLOYEE_ENTITY_SSIDS_QUERY,
    EMPLOYEE_PROFILE_QUERY,
    EVENT_TIMELINE_QUERY_TEMPLATE,
    FILTER_APS_QUERY,
    FILTER_FACILITIES_SKIP_SCAN_QUERY,
    FILTER_LOCATIONS_QUERY,
    FILTER_MNEMONICS_SKIP_SCAN_QUERY,
    FILTER_SSIDS_QUERY,
    FILTER_STATUSES_SKIP_SCAN_QUERY,
    GLOBAL_SEARCH_QUERY,
    GROUPED_EVENTS_QUERY_TEMPLATE,
    GROUPED_SUMMARY_QUERY_TEMPLATE,
    INVESTIGATION_SUMMARY_FROM_EVENTS_TEMPLATE,
    INVESTIGATION_SUMMARY_FROM_SUMMARY_AGG_TEMPLATE,
    INVESTIGATION_SUMMARY_FROM_SUMMARY_FALLBACK_TEMPLATE,
    LOCATION_ENTITY_SUMMARY_QUERY,
    LOCATION_TOP_APS_QUERY,
    LOCATION_TOP_SSIDS_QUERY,
    RESOLVE_UNIVERSAL_ENTITY_QUERY,
    SSID_APS_QUERY,
    SSID_ENTITY_SUMMARY_QUERY,
    SSID_LOCATIONS_QUERY,
    USER_DEVICES_QUERY_BASE,
)
from app.schemas.investigate import InvestigationRequest
from app.utils.filters import QueryBuilder

EVENT_SORT_COLUMN_MAP = {
    "id": "e.id",
    "appeared_timestamp": "e.appeared_timestamp",
    "elasticsearch_timestamp": "e.elasticsearch_timestamp",
    "status": "e.status",
    "mnemonic": "e.mnemonic",
    "facility": "e.facility",
    "user_mac": "e.user_mac",
    "ssid": "e.ssid",
    "employee_id": "s.employee_id",
    "location": "s.location",
    "ap_hostname": "s.ap_hostname",
    "ap_mac": "s.ap_mac",
}

ATTEMPT_SORT_COLUMN_MAP = {
    "id": "id",
    "appeared_timestamp": "appeared_timestamp",
    "elasticsearch_timestamp": "elasticsearch_timestamp",
    "status": "status",
    "mnemonic": "mnemonic",
    "facility": "facility",
    "user_mac": "user_mac",
    "ssid": "ssid",
    "employee_id": "employee_id",
    "location": "location",
    "ap_hostname": "ap_hostname",
    "ap_mac": "ap_mac",
    "attempt_count": "attempt_count",
}

TIMELINE_BUCKET_EXPR_MAP = {
    "hour": "date_trunc('hour', e.appeared_timestamp)",
    "day": "DATE(e.appeared_timestamp)",
    "week": "date_trunc('week', e.appeared_timestamp)",
    "month": "date_trunc('month', e.appeared_timestamp)",
}


class InvestigateRepository:
    def __init__(self, database: Database = db) -> None:
        self._db = database

    @staticmethod
    def _has_event_only_filters(filters: InvestigationRequest) -> bool:
        return bool(
            filters.statuses
            or filters.mnemonics
            or filters.facilities
            or filters.ssids
            or filters.start_timestamp is not None
            or filters.end_timestamp is not None
            or (filters.query and filters.query.strip())
        )

    def _build_filters(
        self,
        filters: InvestigationRequest,
        summary_only: bool = False,
    ) -> QueryBuilder:
        builder = QueryBuilder()
        mac_col = "s.user_mac" if summary_only else "e.user_mac"

        # Entity filters
        builder.in_list("s.employee_id", filters.employee_ids)
        builder.in_list(mac_col, filters.user_macs)
        builder.in_list("s.location", filters.locations)
        builder.in_list("s.ap_hostname", filters.ap_hostnames)
        builder.in_list("s.ap_mac", filters.ap_macs)
        builder.in_list("s.asset_id", filters.asset_ids)
        builder.in_list("s.device_ip", filters.device_ips)

        if not summary_only:
            builder.in_list("e.ssid", filters.ssids)
            builder.in_list("e.status", filters.statuses)
            builder.in_list("e.mnemonic", filters.mnemonics)
            builder.in_list("e.facility", filters.facilities)
            builder.date_range(
                "e.appeared_timestamp",
                filters.start_timestamp,
                filters.end_timestamp,
            )
            if filters.query and filters.query.strip():
                pattern = f"%{filters.query.strip()}%"
                fields = filters.search_fields or ["raw_message"]
                idx = builder._add_param(pattern)
                clauses: list[str] = []
                if "raw_message" in fields:
                    clauses.append(f"e.raw_message ILIKE ${idx}")
                if "metadata" in fields:
                    clauses.append(f"e.metadata::TEXT ILIKE ${idx}")
                if clauses:
                    builder.raw(" OR ".join(clauses))
        elif filters.ssids:
            builder.array_overlaps("s.observed_ssids", filters.ssids)

        # Numeric filters
        builder.numeric_range(
            "s.total_success_count",
            filters.min_success_count,
            filters.max_success_count,
        )
        builder.numeric_range(
            "s.total_failure_count",
            filters.min_failure_count,
            filters.max_failure_count,
        )
        builder.numeric_range(
            "s.total_appearance_count",
            filters.min_appearance_count,
            filters.max_appearance_count,
        )
        builder.numeric_range(
            "s.total_exclusion_count",
            filters.min_exclusion_count,
            filters.max_exclusion_count,
        )
        builder.duration_days_range(
            "s.observed_duration",
            filters.min_duration_days,
            filters.max_duration_days,
        )

        # Summary temporal filters
        builder.date_range(
            "s.first_seen_timestamp",
            filters.first_seen_after,
            filters.first_seen_before,
        )
        builder.date_range(
            "s.last_seen_timestamp",
            filters.last_seen_after,
            filters.last_seen_before,
        )

        # Boolean filters
        builder.boolean("s.ux_available", filters.ux_available)
        if filters.valid_users_only:
            builder.valid_users_only("s")
        if filters.unmapped_users_only:
            builder.unmapped_users_only("s")
        if filters.invalid_devices_only:
            builder.invalid_devices_only("s")
        if filters.recovered_only:
            builder.recovered_only(
                "s",
                has_recovery_columns=self._db.has_recovery_columns,
            )
        if filters.multi_device_users_only:
            builder.multi_device_users_only("s")

        return builder

    async def search_events(
        self, filters: InvestigationRequest
    ) -> list[Record]:
        builder = self._build_filters(filters, summary_only=False)

        if filters.group_mode == "authentication_attempt":
            order_clause = builder.build_order_by(
                sort_by=filters.sort_by,
                sort_order=filters.sort_order,
                column_map=ATTEMPT_SORT_COLUMN_MAP,
                default_order="appeared_timestamp DESC",
            )
            offset = (max(filters.page, 1) - 1) * filters.page_size
            limit_idx = builder._add_param(filters.page_size)
            offset_idx = builder._add_param(offset)
            query = AUTH_ATTEMPT_EVENTS_QUERY_TEMPLATE.format(
                where_clause=builder.build_where(),
                order_clause=order_clause,
                limit_idx=limit_idx,
                offset_idx=offset_idx,
            )
            return await self._db.fetch(query, *builder.params)

        query = (
            BASE_EVENTS_QUERY
            + builder.build_where()
            + builder.build_order_by(
                sort_by=filters.sort_by,
                sort_order=filters.sort_order,
                column_map=EVENT_SORT_COLUMN_MAP,
                default_order="e.appeared_timestamp DESC",
            )
            + builder.build_pagination(filters.page, filters.page_size)
        )
        return await self._db.fetch(query, *builder.params)

    async def count_events(self, filters: InvestigationRequest) -> int:
        builder = self._build_filters(filters, summary_only=False)
        query = BASE_EVENTS_COUNT_QUERY + builder.build_where()
        count = await self._db.fetchval(query, *builder.params)
        return int(count or 0)

    async def search_grouped(
        self, filters: InvestigationRequest
    ) -> list[Record]:
        group_by = filters.group_by or "device"
        use_summary = not self._has_event_only_filters(filters)

        if use_summary:
            builder = self._build_filters(filters, summary_only=True)
            extra_join = ""
            if group_by == "user":
                group_expr = "s.employee_id::TEXT"
                builder.raw("s.employee_id IS NOT NULL")
            elif group_by == "ssid":
                group_expr = "u.ssid"
                extra_join = "CROSS JOIN LATERAL UNNEST(s.observed_ssids) AS u(ssid)"
                builder.raw("u.ssid IS NOT NULL AND u.ssid <> ''")
            elif group_by == "location":
                group_expr = "s.location"
                builder.raw(
                    "s.location IS NOT NULL AND s.location <> '' AND s.location <> 'NA'"
                )
            elif group_by == "ap":
                group_expr = "s.ap_hostname"
                builder.raw(
                    "s.ap_hostname IS NOT NULL AND s.ap_hostname <> '' AND s.ap_hostname <> 'NA'"
                )
            elif group_by == "ap_mac":
                group_expr = "s.ap_mac"
                builder.raw(
                    "s.ap_mac IS NOT NULL AND s.ap_mac <> '' AND s.ap_mac <> 'NA'"
                )
            else:
                group_expr = "s.user_mac"

            offset = (max(filters.page, 1) - 1) * filters.page_size
            limit_idx = builder._add_param(filters.page_size)
            offset_idx = builder._add_param(offset)
            query = GROUPED_SUMMARY_QUERY_TEMPLATE.format(
                group_expr=group_expr,
                extra_join=extra_join,
                where_clause=builder.build_where(),
                limit_idx=limit_idx,
                offset_idx=offset_idx,
            )
            return await self._db.fetch(query, *builder.params)

        builder = self._build_filters(filters, summary_only=False)
        if group_by == "user":
            group_expr = "s.employee_id::TEXT"
            builder.raw("s.employee_id IS NOT NULL")
        elif group_by == "ssid":
            group_expr = "COALESCE(NULLIF(e.ssid, ''), 'UNKNOWN')"
        elif group_by == "location":
            group_expr = "s.location"
            builder.raw(
                "s.location IS NOT NULL AND s.location <> '' AND s.location <> 'NA'"
            )
        elif group_by == "ap":
            group_expr = "s.ap_hostname"
            builder.raw(
                "s.ap_hostname IS NOT NULL AND s.ap_hostname <> '' AND s.ap_hostname <> 'NA'"
            )
        elif group_by == "ap_mac":
            group_expr = "s.ap_mac"
            builder.raw(
                "s.ap_mac IS NOT NULL AND s.ap_mac <> '' AND s.ap_mac <> 'NA'"
            )
        else:
            group_expr = "e.user_mac"

        offset = (max(filters.page, 1) - 1) * filters.page_size
        limit_idx = builder._add_param(filters.page_size)
        offset_idx = builder._add_param(offset)
        query = GROUPED_EVENTS_QUERY_TEMPLATE.format(
            group_expr=group_expr,
            where_clause=builder.build_where(),
            limit_idx=limit_idx,
            offset_idx=offset_idx,
        )
        return await self._db.fetch(query, *builder.params)

    async def get_event_timeline(
        self, filters: InvestigationRequest
    ) -> list[Record]:
        builder = self._build_filters(filters, summary_only=False)
        bucket_expr = TIMELINE_BUCKET_EXPR_MAP.get(
            filters.bucket, "DATE(e.appeared_timestamp)"
        )
        query = EVENT_TIMELINE_QUERY_TEMPLATE.format(
            bucket_expr=bucket_expr,
            where_clause=builder.build_where(),
        )
        return await self._db.fetch(query, *builder.params)

    async def get_investigation_summary(
        self, filters: InvestigationRequest
    ) -> Optional[Record]:
        if not self._has_event_only_filters(filters):
            builder = self._build_filters(filters, summary_only=True)
            template = (
                INVESTIGATION_SUMMARY_FROM_SUMMARY_AGG_TEMPLATE
                if self._db.has_recovery_columns
                else INVESTIGATION_SUMMARY_FROM_SUMMARY_FALLBACK_TEMPLATE
            )
        else:
            builder = self._build_filters(filters, summary_only=False)
            template = INVESTIGATION_SUMMARY_FROM_EVENTS_TEMPLATE

        query = template.format(where_clause=builder.build_where())
        return await self._db.fetchrow(query, *builder.params)

    async def get_employee_profile(
        self, employee_id: int
    ) -> Optional[Record]:
        return await self._db.fetchrow(EMPLOYEE_PROFILE_QUERY, employee_id)

    async def get_employee_devices(
        self, employee_id: int
    ) -> list[Record]:
        query = (
            USER_DEVICES_QUERY_BASE
            + """
            WHERE employee_id = $1
            ORDER BY last_seen_timestamp DESC NULLS LAST
            """
        )
        return await self._db.fetch(query, employee_id)

    async def get_employee_relations(
        self, employee_id: int
    ) -> Optional[Record]:
        return await self._db.fetchrow(
            EMPLOYEE_ENTITY_RELATIONS_QUERY, employee_id
        )

    async def get_employee_ssids(self, employee_id: int) -> list[Record]:
        return await self._db.fetch(EMPLOYEE_ENTITY_SSIDS_QUERY, employee_id)

    async def get_mac_details(self, user_mac: str) -> Optional[Record]:
        query = (
            USER_DEVICES_QUERY_BASE
            + " WHERE LOWER(BTRIM(user_mac)) = LOWER(BTRIM($1))"
        )
        return await self._db.fetchrow(query, user_mac)

    async def resolve_universal_entity(
        self, value: str, employee_id: Optional[int]
    ) -> Optional[Record]:
        return await self._db.fetchrow(
            RESOLVE_UNIVERSAL_ENTITY_QUERY, value, employee_id
        )

    async def get_location_summary(self, location: str) -> Optional[Record]:
        return await self._db.fetchrow(LOCATION_ENTITY_SUMMARY_QUERY, location)

    async def get_location_top_ssids(self, location: str) -> list[Record]:
        return await self._db.fetch(LOCATION_TOP_SSIDS_QUERY, location)

    async def get_location_top_aps(self, location: str) -> list[Record]:
        return await self._db.fetch(LOCATION_TOP_APS_QUERY, location)

    async def get_ssid_summary(self, ssid: str) -> Optional[Record]:
        return await self._db.fetchrow(SSID_ENTITY_SUMMARY_QUERY, ssid)

    async def get_ssid_locations(self, ssid: str) -> list[Record]:
        return await self._db.fetch(SSID_LOCATIONS_QUERY, ssid)

    async def get_ssid_aps(self, ssid: str) -> list[Record]:
        return await self._db.fetch(SSID_APS_QUERY, ssid)

    async def get_ap_summary(self, ap_hostname: str) -> Optional[Record]:
        return await self._db.fetchrow(AP_ENTITY_SUMMARY_QUERY, ap_hostname)

    async def get_ap_ssids(self, ap_hostname: str) -> list[Record]:
        return await self._db.fetch(AP_ENTITY_SSIDS_QUERY, ap_hostname)

    async def get_ap_mac_summary(self, ap_mac: str) -> Optional[Record]:
        return await self._db.fetchrow(AP_MAC_ENTITY_SUMMARY_QUERY, ap_mac)

    async def get_ap_mac_ssids(self, ap_mac: str) -> list[Record]:
        return await self._db.fetch(AP_MAC_ENTITY_SSIDS_QUERY, ap_mac)

    async def get_ssid_options(self) -> list[Record]:
        return await self._db.fetch(FILTER_SSIDS_QUERY)

    async def get_status_options(self) -> list[Record]:
        return await self._db.fetch(FILTER_STATUSES_SKIP_SCAN_QUERY)

    async def get_mnemonic_options(self) -> list[Record]:
        return await self._db.fetch(FILTER_MNEMONICS_SKIP_SCAN_QUERY)

    async def get_location_options(self) -> list[Record]:
        return await self._db.fetch(FILTER_LOCATIONS_QUERY)

    async def get_facility_options(self) -> list[Record]:
        return await self._db.fetch(FILTER_FACILITIES_SKIP_SCAN_QUERY)

    async def get_ap_options(self) -> list[Record]:
        return await self._db.fetch(FILTER_APS_QUERY)

    async def global_search(
        self,
        query: str,
        facilities: list[str],
        mnemonics: list[str],
        page: int,
        page_size: int,
    ) -> list[Record]:
        offset = (max(page, 1) - 1) * page_size
        return await self._db.fetch(
            GLOBAL_SEARCH_QUERY,
            f"%{query}%",
            facilities,
            mnemonics,
            page_size,
            offset,
        )


investigate_repository = InvestigateRepository()
