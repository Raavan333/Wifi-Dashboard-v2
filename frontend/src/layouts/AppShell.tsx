import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { SavedViewsPopover } from "@/components/SavedViewsPopover";
import { SettingsDialog } from "@/components/SettingsDialog";
import { EntityDrawer } from "@/features/entity-drawer/EntityDrawer";
import { GlobalCommandPalette } from "@/features/search/GlobalCommandPalette";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        bgcolor: "background.default",
      }}
    >
      <Sidebar />

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TopBar />

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            p: { xs: 2, md: 3 },
            maxWidth: 1680,
            width: "100%",
            mx: "auto",
          }}
        >
          {children}
        </Box>
      </Box>

      <GlobalCommandPalette />
      <EntityDrawer />
      <SavedViewsPopover />
      <SettingsDialog />
    </Box>
  );
}
