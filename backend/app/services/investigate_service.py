import asyncio
from typing import Optional

from app.cache.cache_keys import INVESTIGATE_OPTIONS
from app.cache.memory_cache import get_or_set_cached
from app.repositories.investigate_repository import (
    InvestigateRepository,
    investigate_repository,
)
from app.schemas.investigate import (
    APEntityResponse,
    DeviceDetail,
    EmployeeOverviewResponse,
    EmployeeProfile,
    FilterOptionsResponse,
    GlobalSearchResponse,
    InvestigationRequest,
    InvestigationSummary,
    LocationEntityResponse,
    RawEvent,
    RawEventsResponse,
    SearchResult,
    SSIDEntityResponse,
    TimelinePoint,
    TimelineResponse,
)
from app.utils.pagination import build_pagination_meta


class InvestigateService:
    def __init__(
        self, repo: InvestigateRepository = investigate_repository
    ) -> None:
        self._repo = repo

    async def search_events(
        self, filters: InvestigationRequest
    ) -> RawEventsResponse:
        rows, total_records = await asyncio.gather(
            self._repo.search_events(filters),
            self._repo.count_events(filters),
        )

        records = [
            RawEvent(
                id=int(row["id"]),
                user_mac=row["user_mac"],
                employee_id=row["employee_id"],
                facility=row["facility"],
                mnemonic=row["mnemonic"],
                status=row["status"],
                ssid=row["ssid"],
                appeared_timestamp=row["appeared_timestamp"],
                elasticsearch_timestamp=row["elasticsearch_timestamp"],
                ap_hostname=row["ap_hostname"],
                location=row["location"],
                message=row["message"],
            )
            for row in rows
        ]

        return RawEventsResponse(
            records=records,
            pagination=build_pagination_meta(
                filters.page, filters.page_size, total_records
            ),
        )

    async def get_timeline(
        self, filters: InvestigationRequest
    ) -> TimelineResponse:
        rows = await self._repo.get_event_timeline(filters)
        return TimelineResponse(
            points=[
                TimelinePoint(
                    timestamp=row["activity_date"],
                    success_count=int(row["success_count"] or 0),
                    failure_count=int(row["failure_count"] or 0),
                    appearance_count=int(row["total_events"] or 0),
                    unknown_count=int(row["unknown_count"] or 0),
                )
                for row in rows
            ]
        )

    async def get_summary(
        self, filters: InvestigationRequest
    ) -> InvestigationSummary:
        row = await self._repo.get_investigation_summary(filters)
        if not row:
            return InvestigationSummary(
                total_devices=0,
                total_users=0,
                valid_users=0,
                invalid_users=0,
                success_rate=0.0,
                failure_rate=0.0,
                recovery_rate=0.0,
            )

        return InvestigationSummary(
            total_devices=int(row["total_devices"] or 0),
            total_users=int(row["total_users"] or 0),
            valid_users=int(row["valid_users"] or 0),
            invalid_users=int(row["invalid_users"] or 0),
            success_rate=float(row["success_rate"] or 0.0),
            failure_rate=float(row["failure_rate"] or 0.0),
            recovery_rate=float(row["recovery_rate"] or 0.0),
        )

    async def get_employee_overview(
        self, employee_id: int
    ) -> EmployeeOverviewResponse:
        profile_row, devices = await asyncio.gather(
            self._repo.get_employee_profile(employee_id),
            self._repo.get_employee_devices(employee_id),
        )

        profile = (
            EmployeeProfile(
                employee_id=int(profile_row["employee_id"]),
                total_devices=int(profile_row["total_devices"] or 0),
                total_success_count=int(
                    profile_row["total_success_count"] or 0
                ),
                total_failure_count=int(
                    profile_row["total_failure_count"] or 0
                ),
                first_seen_timestamp=profile_row["first_seen_timestamp"],
                last_seen_timestamp=profile_row["last_seen_timestamp"],
            )
            if profile_row
            else None
        )

        return EmployeeOverviewResponse(
            profile=profile,
            devices=[dict(device) for device in devices],
        )

    async def get_mac_details(
        self, user_mac: str
    ) -> Optional[DeviceDetail]:
        row = await self._repo.get_mac_details(user_mac)
        if not row:
            return None

        return DeviceDetail(
            user_mac=row["user_mac"],
            employee_id=row["employee_id"],
            total_appearance_count=int(row["total_appearance_count"] or 0),
            total_success_count=int(row["total_success_count"] or 0),
            total_failure_count=int(row["total_failure_count"] or 0),
            total_exclusion_count=int(row["total_exclusion_count"] or 0),
            last_event_status=row["last_event_status"],
            first_seen_timestamp=row["first_seen_timestamp"],
            last_seen_timestamp=row["last_seen_timestamp"],
            observed_duration=row["observed_duration"],
            ux_available=bool(row["ux_available"]),
            ux_timestamp=row["ux_timestamp"],
            ux_last_queried_timestamp=row["ux_last_queried_timestamp"],
            asset_id=row["asset_id"],
            device_ip=row["device_ip"],
            location=row["location"],
            ap_mac=row["ap_mac"],
            ap_hostname=row["ap_hostname"],
            observed_ssids=list(row["observed_ssids"] or []),
        )

    async def get_location_details(
        self, location: str
    ) -> LocationEntityResponse:
        summary_row, top_ssids, top_aps = await asyncio.gather(
            self._repo.get_location_summary(location),
            self._repo.get_location_top_ssids(location),
            self._repo.get_location_top_aps(location),
        )
        return LocationEntityResponse(
            location=location,
            users=int(summary_row["users"] or 0) if summary_row else 0,
            devices=int(summary_row["devices"] or 0) if summary_row else 0,
            success_count=int(summary_row["success_count"] or 0)
            if summary_row
            else 0,
            failure_count=int(summary_row["failure_count"] or 0)
            if summary_row
            else 0,
            top_ssids=[dict(row) for row in top_ssids],
            top_aps=[dict(row) for row in top_aps],
            first_seen=summary_row["first_seen"] if summary_row else None,
            last_seen=summary_row["last_seen"] if summary_row else None,
        )

    async def get_ssid_details(self, ssid: str) -> SSIDEntityResponse:
        summary_row, locations, aps = await asyncio.gather(
            self._repo.get_ssid_summary(ssid),
            self._repo.get_ssid_locations(ssid),
            self._repo.get_ssid_aps(ssid),
        )
        return SSIDEntityResponse(
            ssid=ssid,
            users=int(summary_row["users"] or 0) if summary_row else 0,
            devices=int(summary_row["devices"] or 0) if summary_row else 0,
            success_count=int(summary_row["success_count"] or 0)
            if summary_row
            else 0,
            failure_count=int(summary_row["failure_count"] or 0)
            if summary_row
            else 0,
            locations=[dict(row) for row in locations],
            aps=[dict(row) for row in aps],
            first_seen=summary_row["first_seen"] if summary_row else None,
            last_seen=summary_row["last_seen"] if summary_row else None,
        )

    async def get_ap_details(self, ap_hostname: str) -> APEntityResponse:
        summary_row, ssids = await asyncio.gather(
            self._repo.get_ap_summary(ap_hostname),
            self._repo.get_ap_ssids(ap_hostname),
        )
        return APEntityResponse(
            ap_hostname=ap_hostname,
            users=int(summary_row["users"] or 0) if summary_row else 0,
            devices=int(summary_row["devices"] or 0) if summary_row else 0,
            success_count=int(summary_row["success_count"] or 0)
            if summary_row
            else 0,
            failure_count=int(summary_row["failure_count"] or 0)
            if summary_row
            else 0,
            failure_rate=float(summary_row["failure_rate"] or 0.0)
            if summary_row
            else 0.0,
            locations=list(summary_row["locations"] or [])
            if summary_row
            else [],
            ssids=[row["ssid"] for row in ssids if row["ssid"]],
        )

    async def get_filter_options(self) -> FilterOptionsResponse:
        async def _load() -> FilterOptionsResponse:
            (
                ssids,
                statuses,
                mnemonics,
                locations,
                facilities,
                aps,
            ) = await asyncio.gather(
                self._repo.get_ssid_options(),
                self._repo.get_status_options(),
                self._repo.get_mnemonic_options(),
                self._repo.get_location_options(),
                self._repo.get_facility_options(),
                self._repo.get_ap_options(),
            )

            return FilterOptionsResponse(
                ssids=[row["ssid"] for row in ssids if row["ssid"]],
                statuses=[row["status"] for row in statuses if row["status"]],
                mnemonics=[
                    row["mnemonic"] for row in mnemonics if row["mnemonic"]
                ],
                locations=[
                    row["location"] for row in locations if row["location"]
                ],
                facilities=[
                    row["facility"] for row in facilities if row["facility"]
                ],
                ap_hostnames=[
                    row["ap_hostname"] for row in aps if row["ap_hostname"]
                ],
            )

        return await get_or_set_cached(INVESTIGATE_OPTIONS, _load)

    async def global_search(
        self,
        query: str,
        page: int = 1,
        page_size: int = 20,
    ) -> GlobalSearchResponse:
        options = await self.get_filter_options()
        rows = await self._repo.global_search(
            query=query,
            facilities=options.facilities,
            mnemonics=options.mnemonics,
            page=page,
            page_size=page_size,
        )

        total_records = int(rows[0]["total_records"]) if rows else 0
        results = [
            SearchResult(
                entity_type=row["entity_type"],
                display_value=row["display_value"],
                matched_field=row["matched_field"],
            )
            for row in rows
        ]

        return GlobalSearchResponse(
            results=results,
            pagination=build_pagination_meta(page, page_size, total_records),
        )


investigate_service = InvestigateService()
