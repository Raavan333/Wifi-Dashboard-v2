import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  FilterCondition,
  FilterField,
  FilterGroup,
  FilterOperator,
} from "@/types/filters";
import type {
  GroupByOption,
  GroupMode,
  SearchField,
  SortOrder,
  TimelineBucket,
} from "@/types/investigate";
import type { ChartPreferences, SavedView } from "@/types/views";
import { createCondition, createEmptyGroup } from "@/utils/filterCompiler";

export const DEFAULT_VISIBLE_RAW_COLUMNS = [
  "appeared_timestamp",
  "employee_id",
  "user_mac",
  "status",
  "ssid",
  "location",
  "ap_hostname",
  "facility",
  "mnemonic",
  "message",
];

function updateGroupRecursive(
  group: FilterGroup,
  targetGroupId: string,
  updater: (g: FilterGroup) => FilterGroup,
): FilterGroup {
  if (group.id === targetGroupId) {
    return updater(group);
  }
  return {
    ...group,
    children: group.children.map((child) =>
      child.kind === "group"
        ? updateGroupRecursive(child, targetGroupId, updater)
        : child,
    ),
  };
}

function updateConditionRecursive(
  group: FilterGroup,
  conditionId: string,
  updater: (c: FilterCondition) => FilterCondition,
): FilterGroup {
  return {
    ...group,
    children: group.children.map((child) => {
      if (child.kind === "condition") {
        return child.id === conditionId ? updater(child) : child;
      }
      return updateConditionRecursive(child, conditionId, updater);
    }),
  };
}

function removeNodeRecursive(group: FilterGroup, nodeId: string): FilterGroup {
  return {
    ...group,
    children: group.children
      .filter((child) => child.id !== nodeId)
      .map((child) =>
        child.kind === "group" ? removeNodeRecursive(child, nodeId) : child,
      ),
  };
}

export type InvestigationSubView = "results" | "graph";

interface InvestigationState {
  filterTree: FilterGroup;
  subView: InvestigationSubView;
  bucket: TimelineBucket;
  groupBy: GroupByOption | null;
  groupMode: GroupMode;
  searchFields: SearchField[];
  page: number;
  pageSize: number;
  sortBy: string | null;
  sortOrder: SortOrder;
  visibleColumns: string[];
  chartPreferences: ChartPreferences;
  savedViews: SavedView[];
  graphSeed: { type: string; value: string } | null;

  setSubView: (view: InvestigationSubView) => void;
  setGraphSeed: (seed: { type: string; value: string } | null) => void;
  setBucket: (bucket: TimelineBucket) => void;
  setGroupBy: (groupBy: GroupByOption | null) => void;
  setGroupMode: (groupMode: GroupMode) => void;
  setSearchFields: (fields: SearchField[]) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSort: (sortBy: string | null, sortOrder: SortOrder) => void;
  toggleColumnVisibility: (columnId: string) => void;
  setVisibleColumns: (columns: string[]) => void;
  setChartPreferences: (prefs: Partial<ChartPreferences>) => void;

  addCondition: (
    field: FilterField,
    operator?: FilterOperator,
    value?: string,
    targetGroupId?: string,
  ) => void;
  updateCondition: (
    conditionId: string,
    patch: Partial<FilterCondition>,
  ) => void;
  removeNode: (nodeId: string) => void;
  addNestedGroup: (
    logic?: "AND" | "OR",
    targetGroupId?: string,
  ) => void;
  toggleGroupLogic: (groupId: string) => void;
  clearAllFilters: () => void;
  replaceFilterConditions: (
    conditions: Array<{
      field: FilterField;
      operator?: FilterOperator;
      value: string;
    }>,
    options?: {
      groupBy?: GroupByOption | null;
      groupMode?: GroupMode;
    },
  ) => void;
  setTimeRangeFilter: (startIso: string, endIso: string) => void;

  saveCurrentView: (name: string, description: string) => SavedView;
  loadSavedView: (viewId: string) => void;
  deleteSavedView: (viewId: string) => void;
}

export const useInvestigationStore = create<InvestigationState>()(
  persist(
    (set, get) => ({
      filterTree: createEmptyGroup("AND"),
      subView: "results",
      bucket: "day",
      groupBy: null,
      groupMode: "raw",
      searchFields: ["raw_message", "metadata"],
      page: 1,
      pageSize: 50,
      sortBy: null,
      sortOrder: "desc",
      visibleColumns: DEFAULT_VISIBLE_RAW_COLUMNS,
      chartPreferences: {
        showRecoveryOverlay: true,
        chartStyle: "stacked_area",
      },
      savedViews: [],
      graphSeed: null,

      setSubView: (subView) => set({ subView }),
      setGraphSeed: (graphSeed) => set({ graphSeed }),
      setBucket: (bucket) => set({ bucket }),
      setGroupBy: (groupBy) => set({ groupBy, page: 1 }),
      setGroupMode: (groupMode) => set({ groupMode, page: 1 }),
      setSearchFields: (searchFields) =>
        set({
          searchFields: searchFields.length ? searchFields : ["raw_message"],
          page: 1,
        }),
      setPage: (page) => set({ page }),
      setPageSize: (pageSize) => set({ pageSize, page: 1 }),
      setSort: (sortBy, sortOrder) => set({ sortBy, sortOrder, page: 1 }),
      toggleColumnVisibility: (columnId) =>
        set((state) => {
          const exists = state.visibleColumns.includes(columnId);
          if (exists && state.visibleColumns.length <= 2) {
            return state;
          }
          return {
            visibleColumns: exists
              ? state.visibleColumns.filter((c) => c !== columnId)
              : [...state.visibleColumns, columnId],
          };
        }),
      setVisibleColumns: (visibleColumns) => set({ visibleColumns }),
      setChartPreferences: (prefs) =>
        set((state) => ({
          chartPreferences: { ...state.chartPreferences, ...prefs },
        })),

      addCondition: (field, operator, value = "", targetGroupId) =>
        set((state) => {
          const cond = createCondition(field, operator, value);
          const groupId = targetGroupId ?? state.filterTree.id;
          return {
            filterTree: updateGroupRecursive(state.filterTree, groupId, (g) => ({
              ...g,
              children: [...g.children, cond],
            })),
            page: 1,
          };
        }),

      updateCondition: (conditionId, patch) =>
        set((state) => ({
          filterTree: updateConditionRecursive(
            state.filterTree,
            conditionId,
            (c) => ({ ...c, ...patch }),
          ),
          page: 1,
        })),

      removeNode: (nodeId) =>
        set((state) => ({
          filterTree: removeNodeRecursive(state.filterTree, nodeId),
          page: 1,
        })),

      addNestedGroup: (logic = "OR", targetGroupId) =>
        set((state) => {
          const newGroup = createEmptyGroup(logic);
          newGroup.children.push(createCondition("ssids", "equals", ""));
          const groupId = targetGroupId ?? state.filterTree.id;
          return {
            filterTree: updateGroupRecursive(state.filterTree, groupId, (g) => ({
              ...g,
              children: [...g.children, newGroup],
            })),
          };
        }),

      toggleGroupLogic: (groupId) =>
        set((state) => ({
          filterTree: updateGroupRecursive(state.filterTree, groupId, (g) => ({
            ...g,
            logic: g.logic === "AND" ? "OR" : "AND",
          })),
          page: 1,
        })),

      clearAllFilters: () =>
        set({
          filterTree: createEmptyGroup("AND"),
          page: 1,
        }),

      replaceFilterConditions: (conditions, options) =>
        set((state) => {
          const root = createEmptyGroup("AND");
          root.children = conditions.map((c) =>
            createCondition(c.field, c.operator, c.value),
          );
          return {
            filterTree: root,
            groupBy: options?.groupBy !== undefined ? options.groupBy : state.groupBy,
            groupMode:
              options?.groupMode !== undefined ? options.groupMode : state.groupMode,
            subView: "results",
            page: 1,
          };
        }),

      setTimeRangeFilter: (startIso, endIso) =>
        set((state) => {
          const strippedChildren = state.filterTree.children.filter(
            (c) => !(c.kind === "condition" && c.field === "event_time"),
          );
          const nextTree: FilterGroup = {
            ...state.filterTree,
            children: [
              ...strippedChildren,
              createCondition("event_time", "after", startIso),
              createCondition("event_time", "before", endIso),
            ],
          };
          return { filterTree: nextTree, page: 1 };
        }),

      saveCurrentView: (name, description) => {
        const state = get();
        const view: SavedView = {
          id: crypto.randomUUID(),
          name: name.trim() || "Untitled Investigation",
          description: description.trim(),
          createdAt: new Date().toISOString(),
          filterTree: structuredClone(state.filterTree),
          groupBy: state.groupBy,
          groupMode: state.groupMode,
          bucket: state.bucket,
          visibleColumns: [...state.visibleColumns],
          chartPreferences: { ...state.chartPreferences },
        };
        set({ savedViews: [view, ...state.savedViews] });
        return view;
      },

      loadSavedView: (viewId) => {
        const target = get().savedViews.find((v) => v.id === viewId);
        if (!target) return;
        set({
          filterTree: structuredClone(target.filterTree),
          groupBy: target.groupBy,
          groupMode: target.groupMode,
          bucket: target.bucket,
          visibleColumns: [...target.visibleColumns],
          chartPreferences: { ...target.chartPreferences },
          subView: "results",
          page: 1,
        });
      },

      deleteSavedView: (viewId) =>
        set((state) => ({
          savedViews: state.savedViews.filter((v) => v.id !== viewId),
        })),
    }),
    {
      name: "wifi-observability-investigation-state",
      partialize: (state) => ({
        visibleColumns: state.visibleColumns,
        chartPreferences: state.chartPreferences,
        savedViews: state.savedViews,
        bucket: state.bucket,
        groupMode: state.groupMode,
      }),
    },
  ),
);
