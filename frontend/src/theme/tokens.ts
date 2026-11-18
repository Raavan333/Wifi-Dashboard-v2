import type { ThemeMode } from "@/types/common";

export const SEMANTIC_COLORS = {
  dark: {
    success: "#22C55E",
    successMuted: "rgba(34, 197, 94, 0.14)",
    fail: "#EF4444",
    failMuted: "rgba(239, 68, 68, 0.14)",
    warning: "#F59E0B",
    warningMuted: "rgba(245, 158, 11, 0.14)",
    unknown: "#A855F7",
    unknownMuted: "rgba(168, 85, 247, 0.14)",
    accent: "#3B82F6",
    accentMuted: "rgba(59, 130, 246, 0.14)",
    canvas: "#0B0F17",
    surface: "#111622",
    surfaceElevated: "#171E2E",
    border: "rgba(148, 163, 184, 0.14)",
    borderStrong: "rgba(148, 163, 184, 0.24)",
    textPrimary: "#F1F5F9",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",
    gridLine: "rgba(148, 163, 184, 0.1)",
  },
  light: {
    success: "#16A34A",
    successMuted: "rgba(22, 163, 74, 0.1)",
    fail: "#DC2626",
    failMuted: "rgba(220, 38, 38, 0.1)",
    warning: "#D97706",
    warningMuted: "rgba(217, 119, 6, 0.1)",
    unknown: "#9333EA",
    unknownMuted: "rgba(147, 51, 234, 0.1)",
    accent: "#2563EB",
    accentMuted: "rgba(37, 99, 235, 0.1)",
    canvas: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceElevated: "#F1F5F9",
    border: "rgba(15, 23, 42, 0.09)",
    borderStrong: "rgba(15, 23, 42, 0.18)",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    textMuted: "#64748B",
    gridLine: "rgba(15, 23, 42, 0.07)",
  },
} as const;

export function getTokens(mode: ThemeMode) {
  return SEMANTIC_COLORS[mode];
}
