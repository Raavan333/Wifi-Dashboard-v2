export interface PaginationMeta {
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}

export interface HealthCheckResponse {
  service: string;
  version: string;
  status: string;
  database: string;
  pool_size?: number | null;
  pool_free?: number | null;
}

export interface MetricCard {
  title: string;
  value: number | string;
  subtitle?: string | null;
  trend?: number | null;
  trend_direction?: string | null;
}

export interface PieChartItem {
  label: string;
  value: number;
  percentage: number;
}

export interface PieChartResponse {
  title: string;
  items: PieChartItem[];
}

export interface BarChartItem {
  label: string;
  value: number;
}

export interface BarChartResponse {
  title: string;
  items: BarChartItem[];
}

export interface LineChartItem {
  timestamp: string;
  value: number;
}

export interface LineChartResponse {
  title: string;
  items: LineChartItem[];
}

export type ThemeMode = "dark" | "light";

export type EntityType =
  | "Employee"
  | "Device"
  | "AP MAC"
  | "AP"
  | "Location"
  | "SSID";

export interface EntityRef {
  type: EntityType;
  value: string;
}

export interface AppNotification {
  id: string;
  severity: "info" | "success" | "warning" | "error";
  title: string;
  detail?: string;
  timestamp: string;
  read: boolean;
}
