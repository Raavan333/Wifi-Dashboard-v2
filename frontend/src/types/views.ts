import type { FilterGroup } from "./filters";
import type { GroupByOption, GroupMode, TimelineBucket } from "./investigate";

export interface ChartPreferences {
  showRecoveryOverlay: boolean;
  chartStyle: "stacked_area" | "stacked_bar";
}

export interface SavedView {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  filterTree: FilterGroup;
  groupBy: GroupByOption | null;
  groupMode: GroupMode;
  bucket: TimelineBucket;
  visibleColumns: string[];
  chartPreferences: ChartPreferences;
}
