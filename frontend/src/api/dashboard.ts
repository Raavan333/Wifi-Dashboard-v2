import type {
  APAnalyticsResponse,
  ConnectivityHealthResponse,
  DashboardResponse,
  DataQualityResponse,
  ExecutiveSummaryResponse,
  InactiveUsersResponse,
  LocationOverviewResponse,
  RareUsersResponse,
  SSIDIntelligenceResponse,
  UserActivityResponse,
  UserPopulationResponse,
} from "@/types/dashboard";
import { apiFetch } from "./client";

export function fetchFullDashboard(
  signal?: AbortSignal,
): Promise<DashboardResponse> {
  return apiFetch<DashboardResponse>("/dashboard", { signal });
}

export function fetchExecutiveSummary(
  signal?: AbortSignal,
): Promise<ExecutiveSummaryResponse> {
  return apiFetch<ExecutiveSummaryResponse>("/dashboard/summary", { signal });
}

export function fetchUserPopulation(
  signal?: AbortSignal,
): Promise<UserPopulationResponse> {
  return apiFetch<UserPopulationResponse>("/dashboard/population", { signal });
}

export function fetchConnectivityHealth(
  signal?: AbortSignal,
): Promise<ConnectivityHealthResponse> {
  return apiFetch<ConnectivityHealthResponse>("/dashboard/connectivity", {
    signal,
  });
}

export function fetchSsidIntelligence(
  signal?: AbortSignal,
): Promise<SSIDIntelligenceResponse> {
  return apiFetch<SSIDIntelligenceResponse>("/dashboard/ssid", { signal });
}

export function fetchLocationOverview(
  signal?: AbortSignal,
): Promise<LocationOverviewResponse> {
  return apiFetch<LocationOverviewResponse>("/dashboard/location", { signal });
}

export function fetchUserActivity(
  signal?: AbortSignal,
): Promise<UserActivityResponse> {
  return apiFetch<UserActivityResponse>("/dashboard/activity", { signal });
}

export function fetchDataQuality(
  signal?: AbortSignal,
): Promise<DataQualityResponse> {
  return apiFetch<DataQualityResponse>("/dashboard/data-quality", { signal });
}

export function fetchApAnalytics(
  signal?: AbortSignal,
): Promise<APAnalyticsResponse> {
  return apiFetch<APAnalyticsResponse>("/dashboard/ap", { signal });
}

export function fetchInactiveUsers(
  page = 1,
  pageSize = 25,
  signal?: AbortSignal,
): Promise<InactiveUsersResponse> {
  return apiFetch<InactiveUsersResponse>(
    `/dashboard/inactive-users?page=${page}&page_size=${pageSize}`,
    { signal },
  );
}

export function fetchRareUsers(
  page = 1,
  pageSize = 25,
  signal?: AbortSignal,
): Promise<RareUsersResponse> {
  return apiFetch<RareUsersResponse>(
    `/dashboard/rare-users?page=${page}&page_size=${pageSize}`,
    { signal },
  );
}
