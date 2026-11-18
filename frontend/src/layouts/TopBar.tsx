import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import {
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { BreadcrumbsBar } from "@/components/BreadcrumbsBar";
import { NotificationsPopover } from "@/components/NotificationsPopover";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { useAppStore } from "@/store/useAppStore";
import { useInvestigationStore } from "@/store/useInvestigationStore";

export function TopBar() {
  const navigate = useNavigate();
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const setSubView = useInvestigationStore((s) => s.setSubView);

  return (
    <Box
      component="header"
      sx={{
        height: 56,
        px: { xs: 1.5, sm: 2.5 },
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        position: "sticky",
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ minWidth: 0, flex: 1 }}
      >
        <IconButton
          size="small"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          sx={{ display: { xs: "inline-flex", md: "none" } }}
        >
          <MenuIcon fontSize="small" />
        </IconButton>

        <Box sx={{ minWidth: 0, overflow: "hidden" }}>
          <BreadcrumbsBar />
        </Box>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1} flexShrink={0}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setCommandPaletteOpen(true)}
          startIcon={<SearchIcon fontSize="small" />}
          sx={{
            color: "text.secondary",
            borderColor: "divider",
            bgcolor: "background.default",
            px: 1.5,
            minWidth: { xs: 40, sm: 240, md: 300 },
            justifyContent: "space-between",
            fontWeight: 400,
          }}
        >
          <Typography
            component="span"
            variant="body2"
            sx={{ display: { xs: "none", sm: "inline" }, fontSize: "0.8rem" }}
            noWrap
          >
            Search entities or syslog...
          </Typography>
          <Typography
            component="kbd"
            variant="caption"
            className="mono"
            sx={{
              display: { xs: "none", sm: "inline" },
              color: "text.disabled",
              fontSize: "0.7rem",
            }}
          >
            Ctrl K
          </Typography>
        </Button>

        <Stack
          direction="row"
          spacing={0.5}
          sx={{ display: { xs: "flex", md: "none" } }}
        >
          <Button size="small" onClick={() => navigate("/")}>
            Dashboard
          </Button>
          <Button
            size="small"
            onClick={() => {
              setSubView("results");
              navigate("/investigate");
            }}
          >
            Investigate
          </Button>
        </Stack>

        <ThemeSwitch />
        <NotificationsPopover />

        <Tooltip title="Settings">
          <IconButton
            size="small"
            aria-label="Open settings"
            onClick={() => setSettingsOpen(true)}
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 1.5,
              width: 34,
              height: 34,
            }}
          >
            <SettingsOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
