const INVALID_AP_MARKERS = new Set(["", "NA"]);

export function normalizeEntityDisplay(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  let current = String(value);
  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }
  return current.trim().replace(/\s+/g, " ");
}

export function normalizeApDisplay(value: string | null | undefined): string | null {
  const cleaned = normalizeEntityDisplay(value);
  if (INVALID_AP_MARKERS.has(cleaned.toUpperCase())) return null;
  return cleaned;
}

export function isUnknownLocation(value: string | null | undefined): boolean {
  return normalizeEntityDisplay(value).toLowerCase() === "unknown";
}
