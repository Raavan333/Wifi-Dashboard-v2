import type {
  BarChartResponse,
  LineChartResponse,
  MetricCard,
  PaginationMeta,
  PieChartResponse,
} from "./common";

export interface ExecutiveSummaryResponse {
  metrics: MetricCard[];
  success_failure_chart: PieChartResponse;
  recovery_chart: PieChartResponse;
}

export interface UserPopulationResponse {
  metrics: MetricCard[];
  device_distribution: BarChartResponse;
}

export interface ConnectivityHealthResponse {
  metrics: MetricCard[];
  success_failure_chart: PieChartResponse;
  recovery_chart: PieChartResponse;
  outcome_distribution: BarChartResponse;
}

export interface SSIDFailureItem {
  ssid: string;
  failure_count: number;
  failure_rate: number;
}

export interface SSIDFailureDistributionResponse {
  title: string;
  available: boolean;
  status: string;
  message?: string | null;
  items: SSIDFailureItem[];
}

export interface SSIDIntelligenceResponse {
  metrics: MetricCard[];
  user_distribution: BarChartResponse;
  ssid_combinations: BarChartResponse;
  failure_distribution: SSIDFailureDistributionResponse;
}

export interface LocationOverviewResponse {
  metrics: MetricCard[];
  user_distribution: BarChartResponse;
  device_distribution: BarChartResponse;
  location_coverage: number;
}

export interface UserActivityResponse {
  metrics: MetricCard[];
  duration_distribution: BarChartResponse;
  new_user_trend: LineChartResponse;
  active_user_trend: LineChartResponse;
}

export interface APCoverageStats {
  ap_coverage: number;
  mapped_devices: number;
  unmapped_devices: number;
}

export interface DataQualityResponse {
  metrics: MetricCard[];
  classification_chart: PieChartResponse;
  completeness_chart: BarChartResponse;
  ap_coverage?: APCoverageStats | null;
  location_coverage: number;
}

export interface DashboardResponse {
  executive_summary: ExecutiveSummaryResponse;
  user_population: UserPopulationResponse;
  connectivity_health: ConnectivityHealthResponse;
  ssid_intelligence: SSIDIntelligenceResponse;
  location_overview: LocationOverviewResponse;
  user_activity: UserActivityResponse;
  data_quality: DataQualityResponse;
}

export interface APMetricItem {
  ap_hostname: string;
  users: number;
  devices: number;
  success_count: number;
  failure_count: number;
  failure_rate: number;
}

export interface APAnalyticsResponse {
  top_aps: APMetricItem[];
  worst_aps: APMetricItem[];
  ap_coverage?: APCoverageStats | null;
}

export interface InactiveUserItem {
  employee_id: number;
  device_count: number;
  last_seen_timestamp?: string | null;
}

export interface InactiveUsersResponse {
  inactive_7d: InactiveUserItem[];
  inactive_30d: InactiveUserItem[];
  inactive_90d: InactiveUserItem[];
  pagination: Record<string, PaginationMeta>;
}

export interface RareUserItem {
  employee_id: number;
  device_count: number;
  appearance_count: number;
  last_seen_timestamp?: string | null;
}

export interface RareUsersResponse {
  records: RareUserItem[];
  pagination: PaginationMeta;
}
