import { alpha, createTheme } from "@mui/material/styles";
import type { ThemeMode } from "@/types/common";
import { getTokens } from "./tokens";

export function createAppTheme(mode: ThemeMode) {
  const t = getTokens(mode);

  return createTheme({
    palette: {
      mode,
      primary: { main: t.accent },
      success: { main: t.success },
      error: { main: t.fail },
      warning: { main: t.warning },
      secondary: { main: t.unknown },
      background: {
        default: t.canvas,
        paper: t.surface,
      },
      divider: t.border,
      text: {
        primary: t.textPrimary,
        secondary: t.textSecondary,
      },
    },
    shape: {
      borderRadius: 8,
    },
    typography: {
      fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      h1: { fontWeight: 700, letterSpacing: "-0.02em" },
      h2: { fontWeight: 700, letterSpacing: "-0.015em" },
      h3: { fontWeight: 600, letterSpacing: "-0.01em" },
      h4: { fontWeight: 600, letterSpacing: "-0.01em" },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: {
        textTransform: "none",
        fontWeight: 600,
        letterSpacing: "0.005em",
      },
      body2: {
        fontSize: "0.84rem",
      },
      caption: {
        fontSize: "0.75rem",
        color: t.textSecondary,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: t.canvas,
            color: t.textPrimary,
            fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
            margin: 0,
          },
          ".tabular-nums": {
            fontVariantNumeric: "tabular-nums",
            fontFamily: '"JetBrains Mono", monospace',
          },
          ".mono": {
            fontFamily: '"JetBrains Mono", monospace',
          },
          "*:focus-visible": {
            outline: `2px solid ${t.accent}`,
            outlineOffset: "2px",
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: t.surface,
            border: `1px solid ${t.border}`,
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 6,
            whiteSpace: "nowrap",
            minHeight: 36,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${t.border}`,
            padding: "8px 12px",
            fontSize: "0.8125rem",
          },
          head: {
            fontWeight: 600,
            color: t.textSecondary,
            backgroundColor: t.surfaceElevated,
            whiteSpace: "nowrap",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: t.surface,
            borderLeft: `1px solid ${t.borderStrong}`,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: mode === "dark" ? "#1E293B" : "#0F172A",
            color: "#F8FAFC",
            border: `1px solid ${alpha("#94A3B8", 0.2)}`,
            fontSize: "0.75rem",
          },
        },
      },
    },
  });
}
