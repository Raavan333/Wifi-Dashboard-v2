from typing import Optional

from asyncpg import Record

from app.db.database import Database, db
from app.queries.investigate_queries import (
    AP_ENTITY_SSIDS_QUERY,
    AP_ENTITY_SUMMARY_QUERY,
    BASE_EVENTS_COUNT_QUERY,
    BASE_EVENTS_QUERY,
    EMPLOYEE_PROFILE_QUERY,
    EVENT_TIMELINE_QUERY,
    FILTER_APS_QUERY,
    FILTER_FACILITIES_SKIP_SCAN_QUERY,
    FILTER_LOCATIONS_QUERY,
    FILTER_MNEMONICS_SKIP_SCAN_QUERY,
    FILTER_SSIDS_QUERY,
    FILTER_STATUSES_SKIP_SCAN_QUERY,
    GLOBAL_SEARCH_QUERY,
    INVESTIGATION_SUMMARY_QUERY_TEMPLATE,
    LOCATION_ENTITY_SUMMARY_QUERY,
    LOCATION_TOP_APS_QUERY,
    LOCATION_TOP_SSIDS_QUERY,
    SSID_APS_QUERY,
    SSID_ENTITY_SUMMARY_QUERY,
    SSID_LOCATIONS_QUERY,
    USER_DEVICES_QUERY,
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
}


class InvestigateRepository:
    def __init__(self, database: Database = db) -> None:
        self._db = database

    @staticmethod
    def _build_filters(filters: InvestigationRequest) -> QueryBuilder:
        builder = QueryBuilder()
        builder.in_list("s.employee_id", filters.employee_ids)
        builder.in_list("e.user_mac", filters.user_macs)
        builder.in_list("e.ssid", filters.ssids)
        builder.in_list("e.status", filters.statuses)
        builder.in_list("e.mnemonic", filters.mnemonics)
        builder.in_list("e.facility", filters.facilities)
        builder.in_list("s.location", filters.locations)
        builder.in_list("s.ap_hostname", filters.ap_hostnames)
        builder.boolean("s.ux_available", filters.ux_available)
        builder.date_range(
            "e.appeared_timestamp",
            filters.start_timestamp,
            filters.end_timestamp,
        )

        if filters.valid_users_only:
            builder.valid_users_only("s")
        if filters.unmapped_users_only:
            builder.unmapped_users_only("s")
        if filters.invalid_devices_only:
            builder.invalid_devices_only("s")

        return builder

    async def search_events(
        self, filters: InvestigationRequest
    ) -> list[Record]:
        builder = self._build_filters(filters)
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
        builder = self._build_filters(filters)
        query = BASE_EVENTS_COUNT_QUERY + builder.build_where()
        count = await self._db.fetchval(query, *builder.params)
        return int(count or 0)

    async def get_event_timeline(
        self, filters: InvestigationRequest
    ) -> list[Record]:
        builder = self._build_filters(filters)
        query = (
            EVENT_TIMELINE_QUERY
            + builder.build_where()
            + """
            GROUP BY activity_date
            ORDER BY activity_date ASC
            """
        )
        return await self._db.fetch(query, *builder.params)

    async def get_investigation_summary(
        self, filters: InvestigationRequest
    ) -> Optional[Record]:
        builder = self._build_filters(filters)
        query = INVESTIGATION_SUMMARY_QUERY_TEMPLATE.format(
            where_clause=builder.build_where()
        )
        return await self._db.fetchrow(query, *builder.params)

    async def get_employee_profile(
        self, employee_id: int
    ) -> Optional[Record]:
        return await self._db.fetchrow(EMPLOYEE_PROFILE_QUERY, employee_id)

    async def get_employee_devices(
        self, employee_id: int
    ) -> list[Record]:
        query = (
            USER_DEVICES_QUERY
            + """
            WHERE employee_id = $1
            ORDER BY last_seen_timestamp DESC NULLS LAST
            """
        )
        return await self._db.fetch(query, employee_id)

    async def get_mac_details(self, user_mac: str) -> Optional[Record]:
        query = USER_DEVICES_QUERY + " WHERE user_mac = $1"
        return await self._db.fetchrow(query, user_mac)

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
