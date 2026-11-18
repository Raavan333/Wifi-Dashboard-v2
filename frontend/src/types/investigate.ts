import type { EntityType, PaginationMeta } from "./common";

export type TimelineBucket = "hour" | "day" | "week" | "month";
export type GroupByOption =
  | "user"
  | "device"
  | "ssid"
  | "location"
  | "ap"
  | "ap_mac"
  | "event";
export type GroupMode = "raw" | "authentication_attempt";
export type SearchField = "raw_message" | "metadata";
export type SortOrder = "asc" | "desc";

export interface InvestigationRequest {
  employee_ids: number[];
  user_macs: string[];
  ssids: string[];
  locations: string[];
  ap_hostnames: string[];
  ap_macs: string[];
  statuses: string[];
  mnemonics: string[];
  facilities: string[];
  asset_ids: string[];
  device_ips: string[];
  query: string | null;
  search_fields: SearchField[];
  min_success_count: number | null;
  max_success_count: number | null;
  min_failure_count: number | null;
  max_failure_count: number | null;
  min_appearance_count: number | null;
  max_appearance_count: number | null;
  min_exclusion_count: number | null;
  max_exclusion_count: number | null;
  min_duration_days: number | null;
  max_duration_days: number | null;
  first_seen_after: string | null;
  first_seen_before: string | null;
  last_seen_after: string | null;
  last_seen_before: string | null;
  start_timestamp: string | null;
  end_timestamp: string | null;
  bucket: TimelineBucket;
  ux_available: boolean | null;
  valid_users_only: boolean;
  unmapped_users_only: boolean;
  invalid_devices_only: boolean;
  recovered_only: boolean;
  multi_device_users_only: boolean;
  group_by: GroupByOption | null;
  group_mode: GroupMode;
  page: number;
  page_size: number;
  sort_by: string | null;
  sort_order: SortOrder;
}

export interface InvestigationSummary {
  total_devices: number;
  total_users: number;
  valid_users: number;
  invalid_users: number;
  success_rate: number;
  failure_rate: number;
  recovery_rate: number;
}

export interface TimelinePoint {
  timestamp: string;
  success_count: number;
  failure_count: number;
  appearance_count: number;
  unknown_count: number;
}

export interface TimelineResponse {
  points: TimelinePoint[];
}

export interface RawEvent {
  id: number;
  user_mac: string;
  employee_id: number | null;
  facility: string;
  mnemonic: string;
  status: string;
  ssid: string | null;
  appeared_timestamp: string;
  elasticsearch_timestamp: string;
  ap_hostname: string | null;
  ap_mac?: string | null;
  location: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  attempt_count?: number | null;
}

export interface RawEventsResponse {
  records: RawEvent[];
  pagination: PaginationMeta;
}

export interface GroupedInvestigationItem {
  group_key: string;
  users: number;
  devices: number;
  total_events: number;
  success_count: number;
  failure_count: number;
  unknown_count: number;
  failure_rate: number;
  first_seen?: string | null;
  last_seen?: string | null;
}

export interface GroupedInvestigationResponse {
  group_by: string;
  records: GroupedInvestigationItem[];
  pagination: PaginationMeta;
}

export interface EmployeeProfile {
  employee_id: number;
  total_devices: number;
  total_success_count: number;
  total_failure_count: number;
  first_seen_timestamp: string | null;
  last_seen_timestamp: string | null;
}

export interface DeviceDetail {
  user_mac: string;
  employee_id: number | null;
  total_appearance_count: number;
  total_success_count: number;
  total_failure_count: number;
  total_exclusion_count: number;
  last_event_status?: string | null;
  first_seen_timestamp: string | null;
  last_seen_timestamp: string | null;
  observed_duration: string | null;
  ux_available: boolean;
  ux_timestamp?: string | null;
  ux_last_queried_timestamp?: string | null;
  asset_id?: string | null;
  device_ip?: string | null;
  location: string | null;
  ap_mac?: string | null;
  ap_hostname: string | null;
  observed_ssids: string[];
  recovered_after_failure?: boolean;
  first_fail_timestamp?: string | null;
  last_success_after_fail?: string | null;
  user?: EmployeeProfile | null;
  ssids: string[];
  locations: string[];
  aps: string[];
}

export interface EmployeeOverviewResponse {
  profile: EmployeeProfile | null;
  devices: Array<Record<string, unknown>>;
  locations: string[];
  ssids: string[];
  aps: string[];
}

export interface SearchResult {
  entity_type: string;
  display_value: string;
  matched_field: string;
  location?: string | null;
  users?: number | null;
  devices?: number | null;
  failure_rate?: number | null;
  related_to?: string | null;
}

export interface GlobalSearchResponse {
  results: SearchResult[];
  pagination: PaginationMeta;
}

export interface FilterOptionsResponse {
  ssids: string[];
  statuses: string[];
  mnemonics: string[];
  facilities: string[];
  locations: string[];
  ap_hostnames: string[];
}

export interface EntityMetrics {
  users: number;
  devices: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  failure_rate: number;
}

export interface EntitySsidRow {
  ssid: string;
  users: number;
  devices: number;
}

export interface EntityApRow {
  ap_hostname: string;
  users: number;
  devices: number;
  success_count?: number;
  failure_count?: number;
}

export interface EntityLocationRow {
  location: string;
  users: number;
  devices: number;
}

export interface LocationEntityResponse {
  location: string;
  users: number;
  devices: number;
  success_count: number;
  failure_count: number;
  failure_rate: number;
  ssids: EntitySsidRow[];
  aps: EntityApRow[];
  top_ssids: EntitySsidRow[];
  top_aps: EntityApRow[];
  first_seen?: string | null;
  last_seen?: string | null;
  metrics: EntityMetrics;
}

export interface SSIDEntityResponse {
  ssid: string;
  users: number;
  devices: number;
  success_count: number;
  failure_count: number;
  failure_rate: number;
  locations: EntityLocationRow[];
  aps: EntityApRow[];
  first_seen?: string | null;
  last_seen?: string | null;
  metrics: EntityMetrics;
}

export interface APEntityResponse {
  ap_hostname: string;
  ap_macs: string[];
  users: number;
  devices: number;
  success_count: number;
  failure_count: number;
  failure_rate: number;
  locations: string[];
  ssids: string[];
  first_seen?: string | null;
  last_seen?: string | null;
  metrics: EntityMetrics;
}

export interface APMacEntityResponse {
  ap_mac: string;
  ap_hostnames: string[];
  locations: string[];
  ssids: string[];
  users: number;
  devices: number;
  success_count: number;
  failure_count: number;
  failure_rate: number;
  first_seen?: string | null;
  last_seen?: string | null;
  metrics: EntityMetrics;
}

export type UniversalEntityData =
  | EmployeeOverviewResponse
  | DeviceDetail
  | APMacEntityResponse
  | APEntityResponse
  | LocationEntityResponse
  | SSIDEntityResponse;

export interface UniversalEntityResponse {
  query: string;
  resolved: boolean;
  entity_type?: EntityType | null;
  canonical_value?: string | null;
  data?: UniversalEntityData | null;
}
