export type FilterField =
  | "employee_ids"
  | "user_macs"
  | "ssids"
  | "locations"
  | "ap_hostnames"
  | "ap_macs"
  | "statuses"
  | "mnemonics"
  | "facilities"
  | "asset_ids"
  | "device_ips"
  | "query"
  | "success_count"
  | "failure_count"
  | "appearance_count"
  | "exclusion_count"
  | "duration_days"
  | "event_time"
  | "first_seen"
  | "last_seen"
  | "ux_available"
  | "valid_users_only"
  | "unmapped_users_only"
  | "invalid_devices_only"
  | "recovered_only"
  | "multi_device_users_only";

export type FilterOperator =
  | "equals"
  | "in"
  | "contains"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "after"
  | "before"
  | "is";

export interface FilterCondition {
  kind: "condition";
  id: string;
  field: FilterField;
  operator: FilterOperator;
  value: string;
  enabled: boolean;
}

export interface FilterGroup {
  kind: "group";
  id: string;
  logic: "AND" | "OR";
  children: Array<FilterCondition | FilterGroup>;
}

export type FilterNode = FilterCondition | FilterGroup;

export interface FilterFieldDefinition {
  field: FilterField;
  label: string;
  category: "Entity" | "Telemetry" | "Numeric" | "Temporal" | "Cohort";
  operators: FilterOperator[];
  valueKind: "text" | "option" | "number" | "datetime" | "boolean";
  placeholder: string;
}
