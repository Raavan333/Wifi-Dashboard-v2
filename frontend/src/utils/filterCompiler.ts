import type {
  FilterCondition,
  FilterField,
  FilterFieldDefinition,
  FilterGroup,
  FilterOperator,
} from "@/types/filters";
import type {
  GroupByOption,
  GroupMode,
  InvestigationRequest,
  SortOrder,
  TimelineBucket,
} from "@/types/investigate";

export const FILTER_FIELD_DEFINITIONS: FilterFieldDefinition[] = [
  {
    field: "ssids",
    label: "SSID",
    category: "Entity",
    operators: ["equals", "in", "contains"],
    valueKind: "option",
    placeholder: "e.g. CorpWiFi",
  },
  {
    field: "locations",
    label: "Location",
    category: "Entity",
    operators: ["equals", "in"],
    valueKind: "option",
    placeholder: "e.g. Unknown",
  },
  {
    field: "ap_hostnames",
    label: "AP Hostname",
    category: "Entity",
    operators: ["equals", "in"],
    valueKind: "option",
    placeholder: "e.g. AP-BLDG1-01",
  },
  {
    field: "ap_macs",
    label: "AP MAC",
    category: "Entity",
    operators: ["equals", "in"],
    valueKind: "text",
    placeholder: "e.g. aa:bb:cc:dd:ee:ff",
  },
  {
    field: "employee_ids",
    label: "Employee ID",
    category: "Entity",
    operators: ["equals", "in"],
    valueKind: "number",
    placeholder: "e.g. 104281",
  },
  {
    field: "user_macs",
    label: "Device MAC",
    category: "Entity",
    operators: ["equals", "in"],
    valueKind: "text",
    placeholder: "e.g. 00:11:22:33:44:55",
  },
  {
    field: "asset_ids",
    label: "Asset ID",
    category: "Entity",
    operators: ["equals", "in"],
    valueKind: "text",
    placeholder: "e.g. ASSET-9921",
  },
  {
    field: "device_ips",
    label: "Device IP",
    category: "Entity",
    operators: ["equals", "in"],
    valueKind: "text",
    placeholder: "e.g. 10.24.18.92",
  },
  {
    field: "statuses",
    label: "Status",
    category: "Telemetry",
    operators: ["equals", "in"],
    valueKind: "option",
    placeholder: "SUCCESS | FAIL | UNKNOWN",
  },
  {
    field: "mnemonics",
    label: "Mnemonic",
    category: "Telemetry",
    operators: ["equals", "in"],
    valueKind: "option",
    placeholder: "e.g. AUTH_FAIL",
  },
  {
    field: "facilities",
    label: "Facility",
    category: "Telemetry",
    operators: ["equals", "in"],
    valueKind: "option",
    placeholder: "e.g. DOT1X",
  },
  {
    field: "query",
    label: "Raw Message / Metadata",
    category: "Telemetry",
    operators: ["contains"],
    valueKind: "text",
    placeholder: "Search syslog text or metadata JSON",
  },
  {
    field: "failure_count",
    label: "Failure Count",
    category: "Numeric",
    operators: ["gte", "gt", "lte", "lt"],
    valueKind: "number",
    placeholder: "e.g. 5",
  },
  {
    field: "success_count",
    label: "Success Count",
    category: "Numeric",
    operators: ["gte", "gt", "lte", "lt"],
    valueKind: "number",
    placeholder: "e.g. 1",
  },
  {
    field: "appearance_count",
    label: "Appearance Count",
    category: "Numeric",
    operators: ["gte", "gt", "lte", "lt"],
    valueKind: "number",
    placeholder: "e.g. 10",
  },
  {
    field: "exclusion_count",
    label: "Exclusion Count",
    category: "Numeric",
    operators: ["gte", "gt", "lte", "lt"],
    valueKind: "number",
    placeholder: "e.g. 1",
  },
  {
    field: "duration_days",
    label: "Duration (Days)",
    category: "Numeric",
    operators: ["gte", "gt", "lte", "lt"],
    valueKind: "number",
    placeholder: "e.g. 7",
  },
  {
    field: "event_time",
    label: "Event Timestamp",
    category: "Temporal",
    operators: ["after", "before"],
    valueKind: "datetime",
    placeholder: "YYYY-MM-DDTHH:mm",
  },
  {
    field: "first_seen",
    label: "First Seen",
    category: "Temporal",
    operators: ["after", "before"],
    valueKind: "datetime",
    placeholder: "YYYY-MM-DDTHH:mm",
  },
  {
    field: "last_seen",
    label: "Last Seen",
    category: "Temporal",
    operators: ["after", "before"],
    valueKind: "datetime",
    placeholder: "YYYY-MM-DDTHH:mm",
  },
  {
    field: "ux_available",
    label: "UX Telemetry Available",
    category: "Cohort",
    operators: ["is"],
    valueKind: "boolean",
    placeholder: "true | false",
  },
  {
    field: "valid_users_only",
    label: "Valid Users Only",
    category: "Cohort",
    operators: ["is"],
    valueKind: "boolean",
    placeholder: "true",
  },
  {
    field: "unmapped_users_only",
    label: "Unmapped Users Only",
    category: "Cohort",
    operators: ["is"],
    valueKind: "boolean",
    placeholder: "true",
  },
  {
    field: "invalid_devices_only",
    label: "Invalid Devices Only",
    category: "Cohort",
    operators: ["is"],
    valueKind: "boolean",
    placeholder: "true",
  },
  {
    field: "recovered_only",
    label: "Recovered After Failure",
    category: "Cohort",
    operators: ["is"],
    valueKind: "boolean",
    placeholder: "true",
  },
  {
    field: "multi_device_users_only",
    label: "Multi-Device Users Only",
    category: "Cohort",
    operators: ["is"],
    valueKind: "boolean",
    placeholder: "true",
  },
];

export function getFieldDef(field: FilterField): FilterFieldDefinition {
  return (
    FILTER_FIELD_DEFINITIONS.find((d) => d.field === field) ??
    FILTER_FIELD_DEFINITIONS[0]
  );
}

export function createEmptyGroup(logic: "AND" | "OR" = "AND"): FilterGroup {
  return {
    kind: "group",
    id: crypto.randomUUID(),
    logic,
    children: [],
  };
}

export function createCondition(
  field: FilterField,
  operator?: FilterOperator,
  value = "",
): FilterCondition {
  const def = getFieldDef(field);
  return {
    kind: "condition",
    id: crypto.randomUUID(),
    field,
    operator: operator ?? def.operators[0],
    value,
    enabled: true,
  };
}

export function createDefaultInvestigationRequest(
  overrides: Partial<InvestigationRequest> = {},
): InvestigationRequest {
  return {
    employee_ids: [],
    user_macs: [],
    ssids: [],
    locations: [],
    ap_hostnames: [],
    ap_macs: [],
    statuses: [],
    mnemonics: [],
    facilities: [],
    asset_ids: [],
    device_ips: [],
    query: null,
    search_fields: ["raw_message", "metadata"],
    min_success_count: null,
    max_success_count: null,
    min_failure_count: null,
    max_failure_count: null,
    min_appearance_count: null,
    max_appearance_count: null,
    min_exclusion_count: null,
    max_exclusion_count: null,
    min_duration_days: null,
    max_duration_days: null,
    first_seen_after: null,
    first_seen_before: null,
    last_seen_after: null,
    last_seen_before: null,
    start_timestamp: null,
    end_timestamp: null,
    bucket: "day",
    ux_available: null,
    valid_users_only: false,
    unmapped_users_only: false,
    invalid_devices_only: false,
    recovered_only: false,
    multi_device_users_only: false,
    group_by: null,
    group_mode: "raw",
    page: 1,
    page_size: 50,
    sort_by: null,
    sort_order: "desc",
    ...overrides,
  };
}

export interface RequestExecutionContext {
  bucket: TimelineBucket;
  group_by: GroupByOption | null;
  group_mode: GroupMode;
  page: number;
  page_size: number;
  sort_by: string | null;
  sort_order: SortOrder;
  search_fields: Array<"raw_message" | "metadata">;
}

function splitValues(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseIntList(raw: string): number[] {
  return splitValues(raw)
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n >= 0);
}

function toIsoOrNull(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return parsed.toISOString();
}

function applyCondition(
  req: InvestigationRequest,
  cond: FilterCondition,
): void {
  const val = cond.value.trim();
  if (!val) return;

  switch (cond.field) {
    case "employee_ids":
      req.employee_ids = Array.from(
        new Set([...req.employee_ids, ...parseIntList(val)]),
      );
      break;
    case "user_macs":
      req.user_macs = Array.from(
        new Set([...req.user_macs, ...splitValues(val)]),
      );
      break;
    case "ssids":
      if (cond.operator === "contains" && !req.query) {
        req.query = val;
      } else {
        req.ssids = Array.from(new Set([...req.ssids, ...splitValues(val)]));
      }
      break;
    case "locations":
      req.locations = Array.from(
        new Set([...req.locations, ...splitValues(val)]),
      );
      break;
    case "ap_hostnames":
      req.ap_hostnames = Array.from(
        new Set([...req.ap_hostnames, ...splitValues(val)]),
      );
      break;
    case "ap_macs":
      req.ap_macs = Array.from(new Set([...req.ap_macs, ...splitValues(val)]));
      break;
    case "statuses":
      req.statuses = Array.from(
        new Set([...req.statuses, ...splitValues(val.toUpperCase())]),
      );
      break;
    case "mnemonics":
      req.mnemonics = Array.from(
        new Set([...req.mnemonics, ...splitValues(val)]),
      );
      break;
    case "facilities":
      req.facilities = Array.from(
        new Set([...req.facilities, ...splitValues(val)]),
      );
      break;
    case "asset_ids":
      req.asset_ids = Array.from(
        new Set([...req.asset_ids, ...splitValues(val)]),
      );
      break;
    case "device_ips":
      req.device_ips = Array.from(
        new Set([...req.device_ips, ...splitValues(val)]),
      );
      break;
    case "query":
      req.query = req.query ? `${req.query} ${val}` : val;
      break;
    case "success_count":
    case "failure_count":
    case "appearance_count":
    case "exclusion_count": {
      const n = Number(val);
      if (!Number.isFinite(n) || n < 0) break;
      const intVal = Math.floor(n);
      const adjMin = cond.operator === "gt" ? intVal + 1 : intVal;
      const adjMax = cond.operator === "lt" ? Math.max(0, intVal - 1) : intVal;
      if (cond.field === "success_count") {
        if (cond.operator === "gte" || cond.operator === "gt") {
          req.min_success_count = Math.max(req.min_success_count ?? 0, adjMin);
        } else {
          req.max_success_count =
            req.max_success_count === null
              ? adjMax
              : Math.min(req.max_success_count, adjMax);
        }
      } else if (cond.field === "failure_count") {
        if (cond.operator === "gte" || cond.operator === "gt") {
          req.min_failure_count = Math.max(req.min_failure_count ?? 0, adjMin);
        } else {
          req.max_failure_count =
            req.max_failure_count === null
              ? adjMax
              : Math.min(req.max_failure_count, adjMax);
        }
      } else if (cond.field === "appearance_count") {
        if (cond.operator === "gte" || cond.operator === "gt") {
          req.min_appearance_count = Math.max(
            req.min_appearance_count ?? 0,
            adjMin,
          );
        } else {
          req.max_appearance_count =
            req.max_appearance_count === null
              ? adjMax
              : Math.min(req.max_appearance_count, adjMax);
        }
      } else {
        if (cond.operator === "gte" || cond.operator === "gt") {
          req.min_exclusion_count = Math.max(
            req.min_exclusion_count ?? 0,
            adjMin,
          );
        } else {
          req.max_exclusion_count =
            req.max_exclusion_count === null
              ? adjMax
              : Math.min(req.max_exclusion_count, adjMax);
        }
      }
      break;
    }
    case "duration_days": {
      const num = Number(val);
      if (!Number.isFinite(num) || num < 0) break;
      if (cond.operator === "gte" || cond.operator === "gt") {
        const minVal = cond.operator === "gt" ? num + 0.01 : num;
        req.min_duration_days = Math.max(req.min_duration_days ?? 0, minVal);
      } else {
        const maxVal = cond.operator === "lt" ? Math.max(0, num - 0.01) : num;
        req.max_duration_days =
          req.max_duration_days === null
            ? maxVal
            : Math.min(req.max_duration_days, maxVal);
      }
      break;
    }
    case "event_time":
      if (cond.operator === "after") {
        req.start_timestamp = toIsoOrNull(val);
      } else {
        req.end_timestamp = toIsoOrNull(val);
      }
      break;
    case "first_seen":
      if (cond.operator === "after") {
        req.first_seen_after = toIsoOrNull(val);
      } else {
        req.first_seen_before = toIsoOrNull(val);
      }
      break;
    case "last_seen":
      if (cond.operator === "after") {
        req.last_seen_after = toIsoOrNull(val);
      } else {
        req.last_seen_before = toIsoOrNull(val);
      }
      break;
    case "ux_available":
      req.ux_available = val.toLowerCase() === "true";
      break;
    case "valid_users_only":
      req.valid_users_only = val.toLowerCase() === "true";
      break;
    case "unmapped_users_only":
      req.unmapped_users_only = val.toLowerCase() === "true";
      break;
    case "invalid_devices_only":
      req.invalid_devices_only = val.toLowerCase() === "true";
      break;
    case "recovered_only":
      req.recovered_only = val.toLowerCase() === "true";
      break;
    case "multi_device_users_only":
      req.multi_device_users_only = val.toLowerCase() === "true";
      break;
  }
}

const ARRAY_OR_MERGEABLE_FIELDS = new Set<FilterField>([
  "employee_ids",
  "user_macs",
  "ssids",
  "locations",
  "ap_hostnames",
  "ap_macs",
  "statuses",
  "mnemonics",
  "facilities",
  "asset_ids",
  "device_ips",
]);

/**
 * Expand nested AND/OR FilterGroup AST into Disjunctive Normal Form branches
 * (capped safely at 8 branches), coalescing same-field OR conditions into native
 * backend `IN` lists whenever possible.
 */
function expandToBranches(group: FilterGroup): FilterCondition[][] {
  const activeChildren = group.children.filter((child) =>
    child.kind === "condition" ? child.enabled && child.value.trim() !== "" : true,
  );
  if (activeChildren.length === 0) return [[]];

  // Fast path: if OR group only contains array-mergeable conditions on the same field,
  // combine them into a single branch (handled natively via PostgreSQL `= ANY(...)`).
  if (
    group.logic === "OR" &&
    activeChildren.every((c) => c.kind === "condition")
  ) {
    const conds = activeChildren as FilterCondition[];
    const uniqueFields = new Set(conds.map((c) => c.field));
    if (
      uniqueFields.size === 1 &&
      ARRAY_OR_MERGEABLE_FIELDS.has(conds[0].field)
    ) {
      return [conds];
    }
  }

  const childBranchSets = activeChildren.map((child) =>
    child.kind === "condition" ? [[child]] : expandToBranches(child),
  );

  if (group.logic === "OR") {
    const flattened = childBranchSets.flat().filter((b) => b.length > 0);
    return flattened.length > 0 ? flattened.slice(0, 8) : [[]];
  }

  // AND logic: Cartesian product of child branch sets
  let combined: FilterCondition[][] = [[]];
  for (const branchSet of childBranchSets) {
    const validBranches = branchSet.filter((b) => b.length > 0);
    if (validBranches.length === 0) continue;
    const next: FilterCondition[][] = [];
    for (const left of combined) {
      for (const right of validBranches) {
        next.push([...left, ...right]);
        if (next.length >= 8) break;
      }
      if (next.length >= 8) break;
    }
    combined = next;
  }
  return combined;
}

export function compileFilterTreeToRequests(
  root: FilterGroup,
  ctx: RequestExecutionContext,
): InvestigationRequest[] {
  const branches = expandToBranches(root);
  return branches.map((branch) => {
    const req = createDefaultInvestigationRequest({
      bucket: ctx.bucket,
      group_by: ctx.group_by,
      group_mode: ctx.group_mode,
      page: ctx.page,
      page_size: ctx.page_size,
      sort_by: ctx.sort_by,
      sort_order: ctx.sort_order,
      search_fields: ctx.search_fields,
    });
    for (const cond of branch) {
      applyCondition(req, cond);
    }
    return req;
  });
}

export function flattenActiveConditions(group: FilterGroup): FilterCondition[] {
  const out: FilterCondition[] = [];
  for (const child of group.children) {
    if (child.kind === "condition") {
      if (child.enabled && child.value.trim() !== "") {
        out.push(child);
      }
    } else {
      out.push(...flattenActiveConditions(child));
    }
  }
  return out;
}

export function describeOperator(op: FilterOperator): string {
  switch (op) {
    case "equals":
      return "=";
    case "in":
      return "in";
    case "contains":
      return "contains";
    case "gt":
      return ">";
    case "gte":
      return ">=";
    case "lt":
      return "<";
    case "lte":
      return "<=";
    case "after":
      return ">=";
    case "before":
      return "<=";
    case "is":
      return "is";
  }
}
