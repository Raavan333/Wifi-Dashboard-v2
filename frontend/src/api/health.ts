import type { HealthCheckResponse } from "@/types/common";
import { apiFetch } from "./client";

export function fetchHealth(signal?: AbortSignal): Promise<HealthCheckResponse> {
  return apiFetch<HealthCheckResponse>("/health", { signal });
}
