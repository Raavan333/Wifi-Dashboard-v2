import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getConfiguredApiBaseUrl,
  setConfiguredApiBaseUrl,
} from "@/api/client";
import type { AppNotification, EntityRef, ThemeMode } from "@/types/common";

interface AppState {
  themeMode: ThemeMode;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  settingsOpen: boolean;
  savedViewsOpen: boolean;
  activeEntity: EntityRef | null;
  entityHistory: EntityRef[];
  notifications: AppNotification[];
  autoRefreshSeconds: number;
  defaultPageSize: number;
  apiBaseUrl: string;

  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setSavedViewsOpen: (open: boolean) => void;

  openEntityDrawer: (entity: EntityRef) => void;
  goBackEntityDrawer: () => void;
  jumpToEntityBreadcrumb: (index: number) => void;
  closeEntityDrawer: () => void;

  pushNotification: (
    notification: Omit<AppNotification, "id" | "timestamp" | "read">,
  ) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;

  setAutoRefreshSeconds: (seconds: number) => void;
  setDefaultPageSize: (size: number) => void;
  setApiBaseUrl: (url: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      themeMode: "dark",
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      settingsOpen: false,
      savedViewsOpen: false,
      activeEntity: null,
      entityHistory: [],
      notifications: [],
      autoRefreshSeconds: 0,
      defaultPageSize: 50,
      apiBaseUrl: getConfiguredApiBaseUrl(),

      setThemeMode: (themeMode) => set({ themeMode }),
      toggleThemeMode: () =>
        set((state) => ({
          themeMode: state.themeMode === "dark" ? "light" : "dark",
        })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      setSavedViewsOpen: (savedViewsOpen) => set({ savedViewsOpen }),

      openEntityDrawer: (entity) =>
        set((state) => {
          const sameAsActive =
            state.activeEntity &&
            state.activeEntity.type === entity.type &&
            state.activeEntity.value === entity.value;
          if (sameAsActive) {
            return { activeEntity: entity };
          }
          const filtered = state.entityHistory.filter(
            (e) => !(e.type === entity.type && e.value === entity.value),
          );
          const nextHistory = [...filtered, entity].slice(-8);
          return {
            activeEntity: entity,
            entityHistory: nextHistory,
          };
        }),

      goBackEntityDrawer: () =>
        set((state) => {
          if (state.entityHistory.length <= 1) {
            return { activeEntity: null, entityHistory: [] };
          }
          const nextHistory = state.entityHistory.slice(0, -1);
          return {
            activeEntity: nextHistory[nextHistory.length - 1],
            entityHistory: nextHistory,
          };
        }),

      jumpToEntityBreadcrumb: (index) =>
        set((state) => {
          const target = state.entityHistory[index];
          if (!target) return state;
          return {
            activeEntity: target,
            entityHistory: state.entityHistory.slice(0, index + 1),
          };
        }),

      closeEntityDrawer: () => set({ activeEntity: null }),

      pushNotification: (n) => {
        const existing = get().notifications;
        const duplicate =
          existing[0] &&
          existing[0].title === n.title &&
          existing[0].detail === n.detail;
        if (duplicate) return;

        const next: AppNotification = {
          ...n,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          read: false,
        };
        set({ notifications: [next, ...existing].slice(0, 25) });
      },

      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      clearNotifications: () => set({ notifications: [] }),

      setAutoRefreshSeconds: (autoRefreshSeconds) =>
        set({ autoRefreshSeconds }),
      setDefaultPageSize: (defaultPageSize) => set({ defaultPageSize }),
      setApiBaseUrl: (url) => {
        setConfiguredApiBaseUrl(url);
        set({ apiBaseUrl: getConfiguredApiBaseUrl() });
      },
    }),
    {
      name: "wifi-observability-app-shell",
      partialize: (state) => ({
        themeMode: state.themeMode,
        sidebarCollapsed: state.sidebarCollapsed,
        autoRefreshSeconds: state.autoRefreshSeconds,
        defaultPageSize: state.defaultPageSize,
      }),
    },
  ),
);
