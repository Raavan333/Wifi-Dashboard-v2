import asyncio
from typing import Optional, Union

from app.cache.cache_keys import INVESTIGATE_OPTIONS
from app.cache.memory_cache import get_or_set_cached
from app.repositories.investigate_repository import (
    InvestigateRepository,
    investigate_repository,
)
from app.schemas.investigate import (
    APEntityResponse,
    APMacEntityResponse,
    DeviceDetail,
    EmployeeOverviewResponse,
    EmployeeProfile,
    EntityMetrics,
    FilterOptionsResponse,
    GlobalSearchResponse,
    GroupedInvestigationItem,
    GroupedInvestigationResponse,
    InvestigationRequest,
    InvestigationSummary,
    LocationEntityResponse,
    RawEvent,
    RawEventsResponse,
    SearchResult,
    SSIDEntityResponse,
    TimelinePoint,
    TimelineResponse,
    UniversalEntityResponse,
)
from app.utils.normalization import (
    normalize_ap_identifier,
    normalize_ap_list,
    normalize_entity_display,
    normalize_entity_identifier,
)
from app.utils.pagination import build_pagination_meta


def _build_entity_metrics(
    users: int,
    devices: int,
    success_count: int,
    failure_count: int,
) -> EntityMetrics:
    total = success_count + failure_count
    success_rate = round(success_count * 100.0 / total, 2) if total else 0.0
    failure_rate = round(failure_count * 100.0 / total, 2) if total else 0.0
    return EntityMetrics(
        users=users,
        devices=devices,
        success_count=success_count,
        failure_count=failure_count,
        success_rate=success_rate,
        failure_rate=failure_rate,
    )


def _to_employee_profile(profile_row) -> Optional[EmployeeProfile]:
    if not profile_row:
        return None
    return EmployeeProfile(
        employee_id=int(profile_row["employee_id"]),
        total_devices=int(profile_row["total_devices"] or 0),
        total_success_count=int(profile_row["total_success_count"] or 0),
        total_failure_count=int(profile_row["total_failure_count"] or 0),
        first_seen_timestamp=profile_row["first_seen_timestamp"],
        last_seen_timestamp=profile_row["last_seen_timestamp"],
    )


class InvestigateService:
    def __init__(
        self, repo: InvestigateRepository = investigate_repository
    ) -> None:
        self._repo = repo

    async def search_events(
        self, filters: InvestigationRequest
    ) -> Union[RawEventsResponse, GroupedInvestigationResponse]:
        if filters.group_by and filters.group_by != "event":
            rows = await self._repo.search_grouped(filters)
            total_records = int(rows[0]["total_records"]) if rows else 0
            grouped_records: list[GroupedInvestigationItem] = []
            for row in rows:
                raw_key = row["group_key"]
                if filters.group_by in ("ap", "ap_mac", "location"):
                    clean_key = normalize_ap_identifier(
                        str(raw_key) if raw_key is not None else None
                    )
                    if clean_key is None:
                        continue
                    group_key = clean_key
                else:
                    group_key = str(raw_key)

                grouped_records.append(
                    GroupedInvestigationItem(
                        group_key=group_key,
                        users=int(row["users"] or 0),
                        devices=int(row["devices"] or 0),
                        total_events=int(row["total_events"] or 0),
                        success_count=int(row["success_count"] or 0),
                        failure_count=int(row["failure_count"] or 0),
                        unknown_count=int(row["unknown_count"] or 0),
                        failure_rate=float(row["failure_rate"] or 0.0),
                        first_seen=row["first_seen"],
                        last_seen=row["last_seen"],
                    )
                )
            return GroupedInvestigationResponse(
                group_by=filters.group_by,
                records=grouped_records,
                pagination=build_pagination_meta(
                    filters.page, filters.page_size, total_records
                ),
            )

        if filters.group_mode == "authentication_attempt":
            rows = await self._repo.search_events(filters)
            total_records = int(rows[0]["total_records"]) if rows else 0
        else:
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
                ap_hostname=normalize_ap_identifier(row["ap_hostname"]),
                ap_mac=normalize_ap_identifier(row["ap_mac"]),
                location=normalize_ap_identifier(row["location"]),
                message=row["message"],
                metadata=row["metadata"],
                attempt_count=row["attempt_count"],
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
        profile_row, devices, relations_row, ssid_rows = await asyncio.gather(
            self._repo.get_employee_profile(employee_id),
            self._repo.get_employee_devices(employee_id),
            self._repo.get_employee_relations(employee_id),
            self._repo.get_employee_ssids(employee_id),
        )

        locations = normalize_ap_list(
            relations_row["locations"] if relations_row else []
        )
        aps = normalize_ap_list(relations_row["aps"] if relations_row else [])
        ssids = [row["ssid"] for row in ssid_rows if row["ssid"]]

        sanitized_devices = []
        for device in devices:
            item = dict(device)
            item["location"] = normalize_ap_identifier(item.get("location"))
            item["ap_mac"] = normalize_ap_identifier(item.get("ap_mac"))
            item["ap_hostname"] = normalize_ap_identifier(
                item.get("ap_hostname")
            )
            sanitized_devices.append(item)

        return EmployeeOverviewResponse(
            profile=_to_employee_profile(profile_row),
            devices=sanitized_devices,
            locations=locations,
            ssids=ssids,
            aps=aps,
        )

    async def get_mac_details(
        self, user_mac: str
    ) -> Optional[DeviceDetail]:
        lookup_key = normalize_entity_identifier(user_mac)
        if not lookup_key:
            return None

        row = await self._repo.get_mac_details(lookup_key)
        if not row:
            return None

        employee_id = row["employee_id"]
        user_profile: Optional[EmployeeProfile] = None
        ssids = [s for s in (row["observed_ssids"] or []) if s]
        clean_location = normalize_ap_identifier(row["location"])
        clean_ap_mac = normalize_ap_identifier(row["ap_mac"])
        clean_ap_hostname = normalize_ap_identifier(row["ap_hostname"])
        locations = [clean_location] if clean_location else []
        aps = [clean_ap_hostname] if clean_ap_hostname else []

        if employee_id is not None:
            profile_row, relations_row, ssid_rows = await asyncio.gather(
                self._repo.get_employee_profile(int(employee_id)),
                self._repo.get_employee_relations(int(employee_id)),
                self._repo.get_employee_ssids(int(employee_id)),
            )
            user_profile = _to_employee_profile(profile_row)
            if relations_row:
                rel_locations = normalize_ap_list(relations_row["locations"])
                rel_aps = normalize_ap_list(relations_row["aps"])
                if rel_locations:
                    locations = rel_locations
                if rel_aps:
                    aps = rel_aps
            if ssid_rows:
                ssids = [r["ssid"] for r in ssid_rows if r["ssid"]]

        return DeviceDetail(
            user_mac=row["user_mac"],
            employee_id=employee_id,
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
            location=clean_location,
            ap_mac=clean_ap_mac,
            ap_hostname=clean_ap_hostname,
            observed_ssids=list(row["observed_ssids"] or []),
            user=user_profile,
            ssids=ssids,
            locations=locations,
            aps=aps,
        )

    async def get_location_details(
        self, location: str
    ) -> LocationEntityResponse:
        display_value = normalize_entity_display(location)
        lookup_key = normalize_entity_identifier(location)
        if not lookup_key or lookup_key == "na":
            return LocationEntityResponse(
                location=display_value,
                users=0,
                devices=0,
                success_count=0,
                failure_count=0,
            )

        summary_row, top_ssids, top_aps = await asyncio.gather(
            self._repo.get_location_summary(lookup_key),
            self._repo.get_location_top_ssids(lookup_key),
            self._repo.get_location_top_aps(lookup_key),
        )
        canonical_location = (
            normalize_entity_display(summary_row["location"])
            if summary_row and summary_row["location"]
            else display_value
        )
        users = int(summary_row["users"] or 0) if summary_row else 0
        devices = int(summary_row["devices"] or 0) if summary_row else 0
        success_count = (
            int(summary_row["success_count"] or 0) if summary_row else 0
        )
        failure_count = (
            int(summary_row["failure_count"] or 0) if summary_row else 0
        )
        failure_rate = (
            float(summary_row["failure_rate"] or 0.0) if summary_row else 0.0
        )
        ssid_list = [dict(row) for row in top_ssids]
        ap_list = []
        for row in top_aps:
            ap_name = normalize_ap_identifier(row["ap_hostname"])
            if ap_name is None:
                continue
            item = dict(row)
            item["ap_hostname"] = ap_name
            ap_list.append(item)

        return LocationEntityResponse(
            location=canonical_location,
            users=users,
            devices=devices,
            success_count=success_count,
            failure_count=failure_count,
            failure_rate=failure_rate,
            ssids=ssid_list,
            aps=ap_list,
            top_ssids=ssid_list,
            top_aps=ap_list,
            first_seen=summary_row["first_seen"] if summary_row else None,
            last_seen=summary_row["last_seen"] if summary_row else None,
            metrics=_build_entity_metrics(
                users=users,
                devices=devices,
                success_count=success_count,
                failure_count=failure_count,
            ),
        )

    async def get_ssid_details(self, ssid: str) -> SSIDEntityResponse:
        display_value = normalize_entity_display(ssid)
        lookup_key = normalize_entity_identifier(ssid)
        if not lookup_key:
            return SSIDEntityResponse(
                ssid=display_value,
                users=0,
                devices=0,
                success_count=0,
                failure_count=0,
            )

        summary_row, locations, aps = await asyncio.gather(
            self._repo.get_ssid_summary(lookup_key),
            self._repo.get_ssid_locations(lookup_key),
            self._repo.get_ssid_aps(lookup_key),
        )
        canonical_ssid = (
            normalize_entity_display(summary_row["ssid"])
            if summary_row and summary_row["ssid"]
            else display_value
        )
        users = int(summary_row["users"] or 0) if summary_row else 0
        devices = int(summary_row["devices"] or 0) if summary_row else 0
        success_count = (
            int(summary_row["success_count"] or 0) if summary_row else 0
        )
        failure_count = (
            int(summary_row["failure_count"] or 0) if summary_row else 0
        )
        failure_rate = (
            float(summary_row["failure_rate"] or 0.0) if summary_row else 0.0
        )

        location_list = []
        for row in locations:
            loc_name = normalize_ap_identifier(row["location"])
            if loc_name is None:
                continue
            item = dict(row)
            item["location"] = loc_name
            location_list.append(item)

        ap_list = []
        for row in aps:
            ap_name = normalize_ap_identifier(row["ap_hostname"])
            if ap_name is None:
                continue
            item = dict(row)
            item["ap_hostname"] = ap_name
            ap_list.append(item)

        return SSIDEntityResponse(
            ssid=canonical_ssid,
            users=users,
            devices=devices,
            success_count=success_count,
            failure_count=failure_count,
            failure_rate=failure_rate,
            locations=location_list,
            aps=ap_list,
            first_seen=summary_row["first_seen"] if summary_row else None,
            last_seen=summary_row["last_seen"] if summary_row else None,
            metrics=_build_entity_metrics(
                users=users,
                devices=devices,
                success_count=success_count,
                failure_count=failure_count,
            ),
        )

    async def get_ap_details(self, ap_hostname: str) -> APEntityResponse:
        cleaned_ap = normalize_ap_identifier(ap_hostname)
        if cleaned_ap is None:
            return APEntityResponse(
                ap_hostname="",
                users=0,
                devices=0,
                success_count=0,
                failure_count=0,
                failure_rate=0.0,
            )

        lookup_key = normalize_entity_identifier(cleaned_ap)
        summary_row, ssids = await asyncio.gather(
            self._repo.get_ap_summary(lookup_key),
            self._repo.get_ap_ssids(lookup_key),
        )
        canonical_ap = (
            normalize_ap_identifier(summary_row["ap_hostname"])
            if summary_row and summary_row["ap_hostname"]
            else None
        ) or cleaned_ap
        users = int(summary_row["users"] or 0) if summary_row else 0
        devices = int(summary_row["devices"] or 0) if summary_row else 0
        success_count = (
            int(summary_row["success_count"] or 0) if summary_row else 0
        )
        failure_count = (
            int(summary_row["failure_count"] or 0) if summary_row else 0
        )
        failure_rate = (
            float(summary_row["failure_rate"] or 0.0) if summary_row else 0.0
        )

        return APEntityResponse(
            ap_hostname=canonical_ap,
            ap_macs=normalize_ap_list(summary_row["ap_macs"])
            if summary_row
            else [],
            users=users,
            devices=devices,
            success_count=success_count,
            failure_count=failure_count,
            failure_rate=failure_rate,
            locations=normalize_ap_list(summary_row["locations"])
            if summary_row
            else [],
            ssids=[row["ssid"] for row in ssids if row["ssid"]],
            first_seen=summary_row["first_seen"] if summary_row else None,
            last_seen=summary_row["last_seen"] if summary_row else None,
            metrics=_build_entity_metrics(
                users=users,
                devices=devices,
                success_count=success_count,
                failure_count=failure_count,
            ),
        )

    async def get_ap_mac_details(self, ap_mac: str) -> APMacEntityResponse:
        cleaned_mac = normalize_ap_identifier(ap_mac)
        if cleaned_mac is None:
            return APMacEntityResponse(
                ap_mac="",
                users=0,
                devices=0,
                success_count=0,
                failure_count=0,
                failure_rate=0.0,
            )

        lookup_key = normalize_entity_identifier(cleaned_mac)
        summary_row, ssids = await asyncio.gather(
            self._repo.get_ap_mac_summary(lookup_key),
            self._repo.get_ap_mac_ssids(lookup_key),
        )
        canonical_mac = (
            normalize_ap_identifier(summary_row["ap_mac"])
            if summary_row and summary_row["ap_mac"]
            else None
        ) or cleaned_mac
        users = int(summary_row["users"] or 0) if summary_row else 0
        devices = int(summary_row["devices"] or 0) if summary_row else 0
        success_count = (
            int(summary_row["success_count"] or 0) if summary_row else 0
        )
        failure_count = (
            int(summary_row["failure_count"] or 0) if summary_row else 0
        )
        failure_rate = (
            float(summary_row["failure_rate"] or 0.0) if summary_row else 0.0
        )

        return APMacEntityResponse(
            ap_mac=canonical_mac,
            ap_hostnames=normalize_ap_list(summary_row["ap_hostnames"])
            if summary_row
            else [],
            locations=normalize_ap_list(summary_row["locations"])
            if summary_row
            else [],
            ssids=[row["ssid"] for row in ssids if row["ssid"]],
            users=users,
            devices=devices,
            success_count=success_count,
            failure_count=failure_count,
            failure_rate=failure_rate,
            first_seen=summary_row["first_seen"] if summary_row else None,
            last_seen=summary_row["last_seen"] if summary_row else None,
            metrics=_build_entity_metrics(
                users=users,
                devices=devices,
                success_count=success_count,
                failure_count=failure_count,
            ),
        )

    async def resolve_universal_entity(
        self, value: str
    ) -> UniversalEntityResponse:
        display_value = normalize_entity_display(value)
        lookup_key = normalize_entity_identifier(value)
        if not lookup_key or lookup_key == "na":
            return UniversalEntityResponse(
                query=display_value,
                resolved=False,
                entity_type=None,
                canonical_value=None,
                data=None,
            )

        employee_id = int(lookup_key) if lookup_key.isdigit() else None
        match = await self._repo.resolve_universal_entity(
            lookup_key, employee_id
        )
        if not match:
            return UniversalEntityResponse(
                query=display_value,
                resolved=False,
                entity_type=None,
                canonical_value=None,
                data=None,
            )

        entity_type = match["entity_type"]
        canonical_value = normalize_entity_display(match["canonical_value"])

        if entity_type == "Employee":
            data = await self.get_employee_overview(int(canonical_value))
        elif entity_type == "Device":
            data = await self.get_mac_details(canonical_value)
            if data:
                canonical_value = data.user_mac
        elif entity_type == "AP MAC":
            data = await self.get_ap_mac_details(canonical_value)
            if data:
                canonical_value = data.ap_mac
        elif entity_type == "AP":
            data = await self.get_ap_details(canonical_value)
            if data:
                canonical_value = data.ap_hostname
        elif entity_type == "Location":
            data = await self.get_location_details(canonical_value)
            if data:
                canonical_value = data.location
        else:
            data = await self.get_ssid_details(canonical_value)
            if data:
                canonical_value = data.ssid

        return UniversalEntityResponse(
            query=display_value,
            resolved=True,
            entity_type=entity_type,
            canonical_value=canonical_value,
            data=data,
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
                locations=normalize_ap_list(
                    row["location"] for row in locations
                ),
                facilities=[
                    row["facility"] for row in facilities if row["facility"]
                ],
                ap_hostnames=normalize_ap_list(
                    row["ap_hostname"] for row in aps
                ),
            )

        return await get_or_set_cached(INVESTIGATE_OPTIONS, _load)

    async def global_search(
        self,
        query: str,
        page: int = 1,
        page_size: int = 20,
    ) -> GlobalSearchResponse:
        normalized_query = normalize_entity_display(query) or query.strip()
        options = await self.get_filter_options()
        rows = await self._repo.global_search(
            query=normalized_query,
            facilities=options.facilities,
            mnemonics=options.mnemonics,
            page=page,
            page_size=page_size,
        )

        total_records = int(rows[0]["total_records"]) if rows else 0
        results: list[SearchResult] = []
        for row in rows:
            entity_type = row["entity_type"]
            display_value = row["display_value"]
            if entity_type in ("AP", "AP MAC", "Location"):
                cleaned_display = normalize_ap_identifier(display_value)
                if cleaned_display is None:
                    continue
                display_value = cleaned_display

            results.append(
                SearchResult(
                    entity_type=entity_type,
                    display_value=display_value,
                    matched_field=row["matched_field"],
                    location=normalize_ap_identifier(row["location"]),
                    users=row["users"],
                    devices=row["devices"],
                    failure_rate=row["failure_rate"],
                    related_to=normalize_ap_identifier(row["related_to"]),
                )
            )

        return GlobalSearchResponse(
            results=results,
            pagination=build_pagination_meta(page, page_size, total_records),
        )


investigate_service = InvestigateService()
