import type {
  APEntityResponse,
  APMacEntityResponse,
  DeviceDetail,
  EmployeeOverviewResponse,
  FilterOptionsResponse,
  GlobalSearchResponse,
  GroupedInvestigationItem,
  GroupedInvestigationResponse,
  InvestigationRequest,
  InvestigationSummary,
  LocationEntityResponse,
  RawEvent,
  RawEventsResponse,
  SSIDEntityResponse,
  TimelinePoint,
  TimelineResponse,
  UniversalEntityResponse,
} from "@/types/investigate";
import { apiFetch } from "./client";

export function fetchFilterOptions(
  signal?: AbortSignal,
): Promise<FilterOptionsResponse> {
  return apiFetch<FilterOptionsResponse>("/investigate/options", { signal });
}

export function fetchGlobalSearch(
  query: string,
  page = 1,
  pageSize = 20,
  signal?: AbortSignal,
): Promise<GlobalSearchResponse> {
  const params = new URLSearchParams({
    query,
    page: String(page),
    page_size: String(pageSize),
  });
  return apiFetch<GlobalSearchResponse>(
    `/investigate/search?${params.toString()}`,
    { signal },
  );
}

export function postInvestigationEvents(
  body: InvestigationRequest,
  signal?: AbortSignal,
): Promise<RawEventsResponse | GroupedInvestigationResponse> {
  return apiFetch<RawEventsResponse | GroupedInvestigationResponse>(
    "/investigate/events",
    {
      method: "POST",
      body: JSON.stringify(body),
      signal,
    },
  );
}

export function postInvestigationTimeline(
  body: InvestigationRequest,
  signal?: AbortSignal,
): Promise<TimelineResponse> {
  return apiFetch<TimelineResponse>("/investigate/timeline", {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
}

export function postInvestigationSummary(
  body: InvestigationRequest,
  signal?: AbortSignal,
): Promise<InvestigationSummary> {
  return apiFetch<InvestigationSummary>("/investigate/summary", {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
}

export async function executeMultiBranchEvents(
  requests: InvestigationRequest[],
  signal?: AbortSignal,
): Promise<RawEventsResponse | GroupedInvestigationResponse> {
  if (requests.length <= 1) {
    return postInvestigationEvents(requests[0], signal);
  }

  const responses = await Promise.all(
    requests.map((r) => postInvestigationEvents(r, signal)),
  );

  const first = responses[0];
  if ("group_by" in first) {
    const merged = new Map<string, GroupedInvestigationItem>();
    for (const res of responses as GroupedInvestigationResponse[]) {
      for (const item of res.records) {
        const existing = merged.get(item.group_key);
        if (!existing) {
          merged.set(item.group_key, { ...item });
        } else {
          const success = existing.success_count + item.success_count;
          const failure = existing.failure_count + item.failure_count;
          const totalOutcome = success + failure;
          merged.set(item.group_key, {
            ...existing,
            users: Math.max(existing.users, item.users),
            devices: Math.max(existing.devices, item.devices),
            total_events: existing.total_events + item.total_events,
            success_count: success,
            failure_count: failure,
            unknown_count: existing.unknown_count + item.unknown_count,
            failure_rate:
              totalOutcome > 0
                ? Number(((failure * 100) / totalOutcome).toFixed(2))
                : 0,
          });
        }
      }
    }
    const records = Array.from(merged.values()).sort(
      (a, b) => b.total_events - a.total_events,
    );
    return {
      group_by: first.group_by,
      records,
      pagination: {
        page: 1,
        page_size: records.length || first.pagination.page_size,
        total_records: records.length,
        total_pages: 1,
      },
    };
  }

  const seenIds = new Set<number>();
  const combinedRows: RawEvent[] = [];
  let totalApprox = 0;
  for (const res of responses as RawEventsResponse[]) {
    totalApprox += res.pagination.total_records;
    for (const row of res.records) {
      if (!seenIds.has(row.id)) {
        seenIds.add(row.id);
        combinedRows.push(row);
      }
    }
  }
  combinedRows.sort(
    (a, b) =>
      new Date(b.appeared_timestamp).getTime() -
      new Date(a.appeared_timestamp).getTime(),
  );

  return {
    records: combinedRows,
    pagination: {
      page: requests[0].page,
      page_size: requests[0].page_size,
      total_records: Math.max(combinedRows.length, totalApprox),
      total_pages: Math.max(
        1,
        Math.ceil(Math.max(combinedRows.length, totalApprox) / requests[0].page_size),
      ),
    },
  };
}

export async function executeMultiBranchTimeline(
  requests: InvestigationRequest[],
  signal?: AbortSignal,
): Promise<TimelineResponse> {
  if (requests.length <= 1) {
    return postInvestigationTimeline(requests[0], signal);
  }
  const responses = await Promise.all(
    requests.map((r) => postInvestigationTimeline(r, signal)),
  );
  const byTs = new Map<string, TimelinePoint>();
  for (const res of responses) {
    for (const pt of res.points) {
      const existing = byTs.get(pt.timestamp);
      if (!existing) {
        byTs.set(pt.timestamp, { ...pt });
      } else {
        existing.success_count += pt.success_count;
        existing.failure_count += pt.failure_count;
        existing.appearance_count += pt.appearance_count;
        existing.unknown_count += pt.unknown_count;
      }
    }
  }
  return {
    points: Array.from(byTs.values()).sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    ),
  };
}

export async function executeMultiBranchSummary(
  requests: InvestigationRequest[],
  signal?: AbortSignal,
): Promise<InvestigationSummary> {
  if (requests.length <= 1) {
    return postInvestigationSummary(requests[0], signal);
  }
  const summaries = await Promise.all(
    requests.map((r) => postInvestigationSummary(r, signal)),
  );
  const count = summaries.length || 1;
  return {
    total_devices: summaries.reduce((s, x) => s + x.total_devices, 0),
    total_users: summaries.reduce((s, x) => s + x.total_users, 0),
    valid_users: summaries.reduce((s, x) => s + x.valid_users, 0),
    invalid_users: summaries.reduce((s, x) => s + x.invalid_users, 0),
    success_rate: Number(
      (summaries.reduce((s, x) => s + x.success_rate, 0) / count).toFixed(2),
    ),
    failure_rate: Number(
      (summaries.reduce((s, x) => s + x.failure_rate, 0) / count).toFixed(2),
    ),
    recovery_rate: Number(
      (summaries.reduce((s, x) => s + x.recovery_rate, 0) / count).toFixed(2),
    ),
  };
}

export function fetchEmployeeDetails(
  employeeId: number | string,
  signal?: AbortSignal,
): Promise<EmployeeOverviewResponse> {
  return apiFetch<EmployeeOverviewResponse>(
    `/investigate/user/${encodeURIComponent(String(employeeId))}`,
    { signal },
  );
}

export function fetchMacDetails(
  userMac: string,
  signal?: AbortSignal,
): Promise<DeviceDetail | null> {
  return apiFetch<DeviceDetail | null>(
    `/investigate/mac/${encodeURIComponent(userMac)}`,
    { signal },
  );
}

export function fetchLocationDetails(
  location: string,
  signal?: AbortSignal,
): Promise<LocationEntityResponse> {
  return apiFetch<LocationEntityResponse>(
    `/investigate/location/${encodeURIComponent(location)}`,
    { signal },
  );
}

export function fetchSsidDetails(
  ssid: string,
  signal?: AbortSignal,
): Promise<SSIDEntityResponse> {
  return apiFetch<SSIDEntityResponse>(
    `/investigate/ssid/${encodeURIComponent(ssid)}`,
    { signal },
  );
}

export function fetchApDetails(
  apHostname: string,
  signal?: AbortSignal,
): Promise<APEntityResponse> {
  return apiFetch<APEntityResponse>(
    `/investigate/ap/${encodeURIComponent(apHostname)}`,
    { signal },
  );
}

export function fetchApMacDetails(
  apMac: string,
  signal?: AbortSignal,
): Promise<APMacEntityResponse> {
  return apiFetch<APMacEntityResponse>(
    `/investigate/ap-mac/${encodeURIComponent(apMac)}`,
    { signal },
  );
}

export function fetchUniversalEntity(
  value: string,
  signal?: AbortSignal,
): Promise<UniversalEntityResponse> {
  return apiFetch<UniversalEntityResponse>(
    `/investigate/entity/${encodeURIComponent(value)}`,
    { signal },
  );
}
