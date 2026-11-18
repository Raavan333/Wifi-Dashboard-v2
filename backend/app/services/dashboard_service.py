import asyncio
from typing import Optional

from app.cache.cache_keys import (
    DASHBOARD_ACTIVITY,
    DASHBOARD_AP,
    DASHBOARD_CONNECTIVITY,
    DASHBOARD_DATA_QUALITY,
    DASHBOARD_FULL,
    DASHBOARD_LOCATION,
    DASHBOARD_POPULATION,
    DASHBOARD_SSID,
    DASHBOARD_SUMMARY,
    dashboard_inactive_users_key,
    dashboard_rare_users_key,
)
from app.cache.memory_cache import get_or_set_cached
from app.repositories.dashboard_repository import (
    DashboardRepository,
    dashboard_repository,
)
from app.schemas.common import (
    BarChartItem,
    BarChartResponse,
    LineChartItem,
    LineChartResponse,
    MetricCard,
    PieChartItem,
    PieChartResponse,
)
from app.schemas.dashboard import (
    APAnalyticsResponse,
    APCoverageStats,
    APMetricItem,
    ConnectivityHealthResponse,
    DashboardResponse,
    DataQualityResponse,
    ExecutiveSummaryResponse,
    InactiveUserItem,
    InactiveUsersResponse,
    LocationOverviewResponse,
    RareUserItem,
    RareUsersResponse,
    SSIDFailureDistributionResponse,
    SSIDFailureItem,
    SSIDIntelligenceResponse,
    UserActivityResponse,
    UserPopulationResponse,
)
from app.utils.normalization import normalize_ap_identifier
from app.utils.pagination import build_pagination_meta


def _build_recovery_chart(recovery_row) -> PieChartResponse:
    failed_devices = int(recovery_row["failed_devices"] or 0) if recovery_row else 0
    recovered_devices = (
        int(recovery_row["recovered_devices"] or 0) if recovery_row else 0
    )
    unrecovered_devices = (
        int(recovery_row["unrecovered_devices"] or 0) if recovery_row else 0
    )

    recovered_pct = (
        round(recovered_devices * 100.0 / failed_devices, 2)
        if failed_devices
        else 0.0
    )
    unrecovered_pct = (
        round(unrecovered_devices * 100.0 / failed_devices, 2)
        if failed_devices
        else 0.0
    )

    return PieChartResponse(
        title="Recovery Analysis",
        items=[
            PieChartItem(
                label="Recovered",
                value=recovered_devices,
                percentage=recovered_pct,
            ),
            PieChartItem(
                label="Not Recovered",
                value=unrecovered_devices,
                percentage=unrecovered_pct,
            ),
        ],
    )


class DashboardService:
    def __init__(self, repo: DashboardRepository = dashboard_repository) -> None:
        self._repo = repo

    async def get_full_dashboard(self) -> DashboardResponse:
        async def _load() -> DashboardResponse:
            (
                summary,
                population,
                connectivity,
                ssid,
                location,
                activity,
                quality,
            ) = await asyncio.gather(
                self.get_executive_summary(),
                self.get_user_population(),
                self.get_connectivity_health(),
                self.get_ssid_intelligence(),
                self.get_location_overview(),
                self.get_user_activity(),
                self.get_data_quality(),
            )
            return DashboardResponse(
                executive_summary=summary,
                user_population=population,
                connectivity_health=connectivity,
                ssid_intelligence=ssid,
                location_overview=location,
                user_activity=activity,
                data_quality=quality,
            )

        return await get_or_set_cached(DASHBOARD_FULL, _load)

    async def get_executive_summary(self) -> ExecutiveSummaryResponse:
        async def _load() -> ExecutiveSummaryResponse:
            summary, success_failure, recovery = await asyncio.gather(
                self._repo.get_executive_summary(),
                self._repo.get_success_failure(),
                self._repo.get_recovery_analysis(),
            )

            success_count = int(success_failure["success_count"] or 0)
            failure_count = int(success_failure["failure_count"] or 0)
            total = success_count + failure_count

            return ExecutiveSummaryResponse(
                metrics=[
                    MetricCard(
                        title="Total Devices",
                        value=int(summary["total_devices"] or 0),
                    ),
                    MetricCard(
                        title="Total Users",
                        value=int(summary["total_users"] or 0),
                    ),
                    MetricCard(
                        title="Valid Users",
                        value=int(summary["valid_users"] or 0),
                    ),
                    MetricCard(
                        title="Invalid Devices",
                        value=int(summary["invalid_devices"] or 0),
                    ),
                    MetricCard(
                        title="UX Missing",
                        value=int(summary["ux_missing"] or 0),
                    ),
                ],
                success_failure_chart=PieChartResponse(
                    title="Success vs Failure",
                    items=[
                        PieChartItem(
                            label="Success",
                            value=success_count,
                            percentage=round(success_count * 100.0 / total, 2)
                            if total
                            else 0.0,
                        ),
                        PieChartItem(
                            label="Failure",
                            value=failure_count,
                            percentage=round(failure_count * 100.0 / total, 2)
                            if total
                            else 0.0,
                        ),
                    ],
                ),
                recovery_chart=_build_recovery_chart(recovery),
            )

        return await get_or_set_cached(DASHBOARD_SUMMARY, _load)

    async def get_user_population(self) -> UserPopulationResponse:
        async def _load() -> UserPopulationResponse:
            population, activity, distribution = await asyncio.gather(
                self._repo.get_user_population(),
                self._repo.get_recent_activity(),
                self._repo.get_device_distribution(),
            )

            return UserPopulationResponse(
                metrics=[
                    MetricCard(
                        title="Valid Users",
                        value=int(population["valid_users"] or 0),
                    ),
                    MetricCard(
                        title="Multi Device Users",
                        value=int(population["multi_device_users"] or 0),
                    ),
                    MetricCard(
                        title="MACs Last 7 Days",
                        value=int(activity["macs_last_7_days"] or 0),
                    ),
                    MetricCard(
                        title="MACs Last 30 Days",
                        value=int(activity["macs_last_30_days"] or 0),
                    ),
                    MetricCard(
                        title="MACs Last 90 Days",
                        value=int(activity["macs_last_90_days"] or 0),
                    ),
                ],
                device_distribution=BarChartResponse(
                    title="Devices Per User",
                    items=[
                        BarChartItem(
                            label=row["bucket"],
                            value=int(row["user_count"] or 0),
                        )
                        for row in distribution
                    ],
                ),
            )

        return await get_or_set_cached(DASHBOARD_POPULATION, _load)

    async def get_connectivity_health(self) -> ConnectivityHealthResponse:
        async def _load() -> ConnectivityHealthResponse:
            health, recovery, outcome = await asyncio.gather(
                self._repo.get_connectivity_health(),
                self._repo.get_recovery_analysis(),
                self._repo.get_outcome_distribution(),
            )

            success_rate = float(health["success_rate"] or 0.0)
            failure_rate = float(health["failure_rate"] or 0.0)
            failed_devices = int(recovery["failed_devices"] or 0) if recovery else 0
            recovered_devices = (
                int(recovery["recovered_devices"] or 0) if recovery else 0
            )
            recovery_rate = (
                round(recovered_devices * 100.0 / failed_devices, 2)
                if failed_devices
                else 0.0
            )

            return ConnectivityHealthResponse(
                metrics=[
                    MetricCard(title="Success Rate", value=success_rate),
                    MetricCard(title="Failure Rate", value=failure_rate),
                    MetricCard(title="Recovery Rate", value=recovery_rate),
                ],
                success_failure_chart=PieChartResponse(
                    title="Success vs Failure",
                    items=[
                        PieChartItem(
                            label="Success",
                            value=int(health["total_success"] or 0),
                            percentage=success_rate,
                        ),
                        PieChartItem(
                            label="Failure",
                            value=int(health["total_failure"] or 0),
                            percentage=failure_rate,
                        ),
                    ],
                ),
                recovery_chart=_build_recovery_chart(recovery),
                outcome_distribution=BarChartResponse(
                    title="Outcome Distribution",
                    items=[
                        BarChartItem(
                            label="Success Only",
                            value=int(outcome["success_only"] or 0),
                        ),
                        BarChartItem(
                            label="Success & Failure",
                            value=int(outcome["success_and_failure"] or 0),
                        ),
                        BarChartItem(
                            label="Failure Only",
                            value=int(outcome["failure_only"] or 0),
                        ),
                        BarChartItem(
                            label="Unknown Only",
                            value=int(outcome["unknown_only"] or 0),
                        ),
                    ],
                ),
            )

        return await get_or_set_cached(DASHBOARD_CONNECTIVITY, _load)

    async def get_ssid_intelligence(self) -> SSIDIntelligenceResponse:
        async def _load() -> SSIDIntelligenceResponse:
            distribution, combinations, has_ssid_failures = await asyncio.gather(
                self._repo.get_ssid_distribution(),
                self._repo.get_ssid_combinations(),
                self._repo.has_ssid_failure_data(),
            )

            if has_ssid_failures:
                failures = await self._repo.get_ssid_failure_distribution()
                failure_distribution = SSIDFailureDistributionResponse(
                    title="SSID Failures",
                    available=True,
                    status="available",
                    message=None,
                    items=[
                        SSIDFailureItem(
                            ssid=row["ssid"],
                            failure_count=int(row["failure_count"] or 0),
                            failure_rate=float(row["failure_rate"] or 0.0),
                        )
                        for row in failures
                    ],
                )
            else:
                failure_distribution = SSIDFailureDistributionResponse(
                    title="SSID Failures",
                    available=False,
                    status="unavailable",
                    message=(
                        "SSID failure distribution cannot be computed because FAIL events "
                        "in wifi_event_history do not contain SSID values."
                    ),
                    items=[],
                )

            return SSIDIntelligenceResponse(
                metrics=[],
                user_distribution=BarChartResponse(
                    title="Users Per SSID",
                    items=[
                        BarChartItem(
                            label=row["ssid"],
                            value=int(row["user_count"] or 0),
                        )
                        for row in distribution
                    ],
                ),
                ssid_combinations=BarChartResponse(
                    title="SSID Combinations",
                    items=[
                        BarChartItem(
                            label=row["ssid_combination"],
                            value=int(row["user_count"] or 0),
                        )
                        for row in combinations
                    ],
                ),
                failure_distribution=failure_distribution,
            )

        return await get_or_set_cached(DASHBOARD_SSID, _load)

    async def get_location_overview(self) -> LocationOverviewResponse:
        async def _load() -> LocationOverviewResponse:
            user_locations, device_locations, coverage = await asyncio.gather(
                self._repo.get_location_user_distribution(),
                self._repo.get_location_device_distribution(),
                self._repo.get_coverage_metrics(),
            )
            total_devices = (
                int(coverage["total_devices"] or 0) if coverage else 0
            )
            location_mapped = (
                int(coverage["location_mapped_devices"] or 0) if coverage else 0
            )
            location_coverage = (
                round(location_mapped * 100.0 / total_devices, 2)
                if total_devices
                else 0.0
            )

            return LocationOverviewResponse(
                metrics=[
                    MetricCard(
                        title="Location Coverage %",
                        value=location_coverage,
                    )
                ],
                user_distribution=BarChartResponse(
                    title="Users By Location",
                    items=[
                        BarChartItem(
                            label=row["location"],
                            value=int(row["user_count"] or 0),
                        )
                        for row in user_locations
                    ],
                ),
                device_distribution=BarChartResponse(
                    title="Devices By Location",
                    items=[
                        BarChartItem(
                            label=row["location"],
                            value=int(row["device_count"] or 0),
                        )
                        for row in device_locations
                    ],
                ),
                location_coverage=location_coverage,
            )

        return await get_or_set_cached(DASHBOARD_LOCATION, _load)

    async def get_user_activity(self) -> UserActivityResponse:
        async def _load() -> UserActivityResponse:
            duration, new_users, active_users = await asyncio.gather(
                self._repo.get_duration_distribution(),
                self._repo.get_new_users_trend(),
                self._repo.get_active_users_trend(),
            )

            return UserActivityResponse(
                metrics=[],
                duration_distribution=BarChartResponse(
                    title="Observed Duration",
                    items=[
                        BarChartItem(
                            label=row["duration_bucket"],
                            value=int(row["user_count"] or 0),
                        )
                        for row in duration
                    ],
                ),
                new_user_trend=LineChartResponse(
                    title="New Users",
                    items=[
                        LineChartItem(
                            timestamp=row["observation_date"],
                            value=int(row["users"] or 0),
                        )
                        for row in new_users
                    ],
                ),
                active_user_trend=LineChartResponse(
                    title="Active Users",
                    items=[
                        LineChartItem(
                            timestamp=row["observation_date"],
                            value=int(row["users"] or 0),
                        )
                        for row in active_users
                    ],
                ),
            )

        return await get_or_set_cached(DASHBOARD_ACTIVITY, _load)

    async def get_data_quality(self) -> DataQualityResponse:
        async def _load() -> DataQualityResponse:
            data = await self._repo.get_data_quality()

            total_devices = int(data["total_devices"] or 0)
            valid_users = int(data["valid_users"] or 0)
            unmapped_users = int(data["unmapped_users"] or 0)
            ux_missing = int(data["ux_missing"] or 0)
            invalid_devices = int(data["invalid_devices"] or 0)
            employee_mapped = int(data["employee_mapped_devices"] or 0)
            ux_enriched = int(data["ux_enriched_devices"] or 0)
            location_mapped = int(data["location_mapped_devices"] or 0)
            ap_mapped = int(data["ap_mapped_devices"] or 0)
            ssid_covered = int(data["ssid_covered_devices"] or 0)

            def pct(count: int) -> float:
                return (
                    round(count * 100.0 / total_devices, 2)
                    if total_devices
                    else 0.0
                )

            location_cov = pct(location_mapped)
            ap_cov = pct(ap_mapped)

            return DataQualityResponse(
                metrics=[
                    MetricCard(title="Valid Users", value=valid_users),
                    MetricCard(title="Unmapped Users", value=unmapped_users),
                    MetricCard(title="UX Missing", value=ux_missing),
                    MetricCard(title="Invalid Devices", value=invalid_devices),
                    MetricCard(
                        title="Location Coverage %",
                        value=location_cov,
                    ),
                    MetricCard(title="AP Coverage %", value=ap_cov),
                    MetricCard(
                        title="Employee Mapping %",
                        value=pct(employee_mapped),
                    ),
                    MetricCard(
                        title="UX Enrichment %",
                        value=pct(ux_enriched),
                    ),
                    MetricCard(
                        title="SSID Coverage",
                        value=pct(ssid_covered),
                    ),
                ],
                classification_chart=PieChartResponse(
                    title="User Classification",
                    items=[
                        PieChartItem(
                            label="Valid",
                            value=valid_users,
                            percentage=pct(valid_users),
                        ),
                        PieChartItem(
                            label="Unmapped",
                            value=unmapped_users,
                            percentage=pct(unmapped_users),
                        ),
                        PieChartItem(
                            label="UX Missing",
                            value=ux_missing,
                            percentage=pct(ux_missing),
                        ),
                        PieChartItem(
                            label="Invalid",
                            value=invalid_devices,
                            percentage=pct(invalid_devices),
                        ),
                    ],
                ),
                completeness_chart=BarChartResponse(
                    title="Data Completeness",
                    items=[
                        BarChartItem(
                            label="Employee Mapped",
                            value=employee_mapped,
                        ),
                        BarChartItem(
                            label="UX Enriched",
                            value=ux_enriched,
                        ),
                        BarChartItem(
                            label="Location Mapped",
                            value=location_mapped,
                        ),
                        BarChartItem(
                            label="AP Mapped",
                            value=ap_mapped,
                        ),
                        BarChartItem(
                            label="SSID Covered",
                            value=ssid_covered,
                        ),
                    ],
                ),
                ap_coverage=APCoverageStats(
                    ap_coverage=ap_cov,
                    mapped_devices=ap_mapped,
                    unmapped_devices=max(0, total_devices - ap_mapped),
                ),
                location_coverage=location_cov,
            )

        return await get_or_set_cached(DASHBOARD_DATA_QUALITY, _load)

    async def get_ap_analytics(self) -> APAnalyticsResponse:
        async def _load() -> APAnalyticsResponse:
            top_rows, worst_rows, coverage = await asyncio.gather(
                self._repo.get_top_aps(),
                self._repo.get_worst_aps(),
                self._repo.get_coverage_metrics(),
            )

            total_devices = (
                int(coverage["total_devices"] or 0) if coverage else 0
            )
            ap_mapped = (
                int(coverage["ap_mapped_devices"] or 0) if coverage else 0
            )
            ap_cov = (
                round(ap_mapped * 100.0 / total_devices, 2)
                if total_devices
                else 0.0
            )

            def to_item(row) -> Optional[APMetricItem]:
                ap_hostname = normalize_ap_identifier(row["ap_hostname"])
                if ap_hostname is None:
                    return None
                return APMetricItem(
                    ap_hostname=ap_hostname,
                    users=int(row["users"] or 0),
                    devices=int(row["devices"] or 0),
                    success_count=int(row["success_count"] or 0),
                    failure_count=int(row["failure_count"] or 0),
                    failure_rate=float(row["failure_rate"] or 0.0),
                )

            top_aps = [item for r in top_rows if (item := to_item(r)) is not None]
            worst_aps = [item for r in worst_rows if (item := to_item(r)) is not None]

            return APAnalyticsResponse(
                top_aps=top_aps,
                worst_aps=worst_aps,
                ap_coverage=APCoverageStats(
                    ap_coverage=ap_cov,
                    mapped_devices=ap_mapped,
                    unmapped_devices=max(0, total_devices - ap_mapped),
                ),
            )

        return await get_or_set_cached(DASHBOARD_AP, _load)

    async def get_inactive_users(
        self, page: int, page_size: int
    ) -> InactiveUsersResponse:
        key = dashboard_inactive_users_key(page, page_size)

        async def _load() -> InactiveUsersResponse:
            rows_7, rows_30, rows_90 = await asyncio.gather(
                self._repo.get_inactive_users_bucket(7, page, page_size),
                self._repo.get_inactive_users_bucket(30, page, page_size),
                self._repo.get_inactive_users_bucket(90, page, page_size),
            )

            def parse_bucket(rows) -> tuple[list[InactiveUserItem], int]:
                total = int(rows[0]["total_records"]) if rows else 0
                items = [
                    InactiveUserItem(
                        employee_id=int(r["employee_id"]),
                        device_count=int(r["device_count"] or 0),
                        last_seen_timestamp=r["last_seen_timestamp"],
                    )
                    for r in rows
                ]
                return items, total

            items_7, total_7 = parse_bucket(rows_7)
            items_30, total_30 = parse_bucket(rows_30)
            items_90, total_90 = parse_bucket(rows_90)

            return InactiveUsersResponse(
                inactive_7d=items_7,
                inactive_30d=items_30,
                inactive_90d=items_90,
                pagination={
                    "inactive_7d": build_pagination_meta(page, page_size, total_7),
                    "inactive_30d": build_pagination_meta(page, page_size, total_30),
                    "inactive_90d": build_pagination_meta(page, page_size, total_90),
                },
            )

        return await get_or_set_cached(key, _load)

    async def get_rare_users(
        self, page: int, page_size: int
    ) -> RareUsersResponse:
        key = dashboard_rare_users_key(page, page_size)

        async def _load() -> RareUsersResponse:
            rows = await self._repo.get_rare_users(page, page_size)
            total = int(rows[0]["total_records"]) if rows else 0
            records = [
                RareUserItem(
                    employee_id=int(r["employee_id"]),
                    device_count=int(r["device_count"] or 0),
                    appearance_count=int(r["appearance_count"] or 0),
                    last_seen_timestamp=r["last_seen_timestamp"],
                )
                for r in rows
            ]
            return RareUsersResponse(
                records=records,
                pagination=build_pagination_meta(page, page_size, total),
            )

        return await get_or_set_cached(key, _load)


dashboard_service = DashboardService()
