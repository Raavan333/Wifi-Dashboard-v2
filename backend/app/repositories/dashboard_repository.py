from typing import Optional

from asyncpg import Record

from app.constants.dashboard import (
    RARE_USER_MAX_APPEARANCES,
    TOP_APS_LIMIT,
    TOP_FAILURE_SSIDS,
    TOP_LOCATIONS,
    TOP_SSID_COMBINATIONS,
    WORST_AP_MIN_EVENTS,
)
from app.db.database import Database, db
from app.queries.dashboard_queries import (
    ACTIVE_USERS_TREND_QUERY,
    CONNECTIVITY_HEALTH_QUERY,
    DATA_QUALITY_QUERY,
    DEVICE_DISTRIBUTION_QUERY,
    DURATION_DISTRIBUTION_QUERY,
    EXECUTIVE_SUMMARY_QUERY,
    INACTIVE_USERS_QUERY,
    LOCATION_DEVICES_DISTRIBUTION_QUERY,
    LOCATION_USERS_DISTRIBUTION_QUERY,
    NEW_USERS_TREND_QUERY,
    OUTCOME_DISTRIBUTION_QUERY,
    RARE_USERS_QUERY,
    RECENT_ACTIVITY_QUERY,
    RECOVERY_ANALYSIS_QUERY,
    SSID_COMBINATIONS_QUERY,
    SSID_DISTRIBUTION_QUERY,
    SSID_FAILURE_DISTRIBUTION_QUERY,
    SUCCESS_FAILURE_QUERY,
    TOP_APS_QUERY,
    USER_POPULATION_QUERY,
    WORST_APS_QUERY,
)


class DashboardRepository:
    def __init__(self, database: Database = db) -> None:
        self._db = database

    async def get_executive_summary(self) -> Optional[Record]:
        return await self._db.fetchrow(EXECUTIVE_SUMMARY_QUERY)

    async def get_success_failure(self) -> Optional[Record]:
        return await self._db.fetchrow(SUCCESS_FAILURE_QUERY)

    async def get_recovery_analysis(self) -> Optional[Record]:
        return await self._db.fetchrow(RECOVERY_ANALYSIS_QUERY)

    async def get_user_population(self) -> Optional[Record]:
        return await self._db.fetchrow(USER_POPULATION_QUERY)

    async def get_recent_activity(self) -> Optional[Record]:
        return await self._db.fetchrow(RECENT_ACTIVITY_QUERY)

    async def get_device_distribution(self) -> list[Record]:
        return await self._db.fetch(DEVICE_DISTRIBUTION_QUERY)

    async def get_connectivity_health(self) -> Optional[Record]:
        return await self._db.fetchrow(CONNECTIVITY_HEALTH_QUERY)

    async def get_outcome_distribution(self) -> Optional[Record]:
        return await self._db.fetchrow(OUTCOME_DISTRIBUTION_QUERY)

    async def get_ssid_distribution(
        self, limit: int = TOP_FAILURE_SSIDS
    ) -> list[Record]:
        return await self._db.fetch(SSID_DISTRIBUTION_QUERY, limit)

    async def get_ssid_combinations(
        self, limit: int = TOP_SSID_COMBINATIONS
    ) -> list[Record]:
        return await self._db.fetch(SSID_COMBINATIONS_QUERY, limit)

    async def get_ssid_failure_distribution(
        self, limit: int = TOP_FAILURE_SSIDS
    ) -> list[Record]:
        return await self._db.fetch(SSID_FAILURE_DISTRIBUTION_QUERY, limit)

    async def get_location_user_distribution(
        self, limit: int = TOP_LOCATIONS
    ) -> list[Record]:
        return await self._db.fetch(LOCATION_USERS_DISTRIBUTION_QUERY, limit)

    async def get_location_device_distribution(
        self, limit: int = TOP_LOCATIONS
    ) -> list[Record]:
        return await self._db.fetch(LOCATION_DEVICES_DISTRIBUTION_QUERY, limit)

    async def get_duration_distribution(self) -> list[Record]:
        return await self._db.fetch(DURATION_DISTRIBUTION_QUERY)

    async def get_new_users_trend(self) -> list[Record]:
        return await self._db.fetch(NEW_USERS_TREND_QUERY)

    async def get_active_users_trend(self) -> list[Record]:
        return await self._db.fetch(ACTIVE_USERS_TREND_QUERY)

    async def get_data_quality(self) -> Optional[Record]:
        return await self._db.fetchrow(DATA_QUALITY_QUERY)

    async def get_top_aps(self, limit: int = TOP_APS_LIMIT) -> list[Record]:
        return await self._db.fetch(TOP_APS_QUERY, limit)

    async def get_worst_aps(
        self,
        min_events: int = WORST_AP_MIN_EVENTS,
        limit: int = TOP_APS_LIMIT,
    ) -> list[Record]:
        return await self._db.fetch(WORST_APS_QUERY, min_events, limit)

    async def get_inactive_users_bucket(
        self,
        days: int,
        page: int,
        page_size: int,
    ) -> list[Record]:
        offset = (max(page, 1) - 1) * page_size
        return await self._db.fetch(INACTIVE_USERS_QUERY, days, page_size, offset)

    async def get_rare_users(
        self,
        page: int,
        page_size: int,
        max_appearances: int = RARE_USER_MAX_APPEARANCES,
    ) -> list[Record]:
        offset = (max(page, 1) - 1) * page_size
        return await self._db.fetch(
            RARE_USERS_QUERY,
            max_appearances,
            page_size,
            offset,
        )


dashboard_repository = DashboardRepository()
