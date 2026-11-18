import BookmarkBorderOutlinedIcon from "@mui/icons-material/BookmarkBorderOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import ManageSearchOutlinedIcon from "@mui/icons-material/ManageSearchOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import WifiTetheringIcon from "@mui/icons-material/WifiTethering";
import {
  Box,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { useInvestigationStore } from "@/store/useInvestigationStore";

export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 68;

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setSavedViewsOpen = useAppStore((s) => s.setSavedViewsOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  const subView = useInvestigationStore((s) => s.subView);
  const setSubView = useInvestigationStore((s) => s.setSubView);

  const isDashboard = location.pathname === "/";
  const isInvestigate = location.pathname.startsWith("/investigate");

  const items = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <DashboardOutlinedIcon fontSize="small" />,
      active: isDashboard,
      onClick: () => navigate("/"),
    },
    {
      id: "investigation",
      label: "Investigation",
      icon: <ManageSearchOutlinedIcon fontSize="small" />,
      active: isInvestigate && subView === "results",
      onClick: () => {
        setSubView("results");
        navigate("/investigate");
      },
    },
    {
      id: "entity-explorer",
      label: "Entity Explorer",
      icon: <HubOutlinedIcon fontSize="small" />,
      active: isInvestigate && subView === "graph",
      onClick: () => {
        setSubView("graph");
        navigate("/investigate");
      },
    },
    {
      id: "saved-views",
      label: "Saved Views",
      icon: <BookmarkBorderOutlinedIcon fontSize="small" />,
      active: false,
      onClick: () => setSavedViewsOpen(true),
    },
    {
      id: "settings",
      label: "Settings",
      icon: <SettingsOutlinedIcon fontSize="small" />,
      active: false,
      onClick: () => setSettingsOpen(true),
    },
  ];

  return (
    <Box
      component="aside"
      aria-label="Primary navigation"
      sx={{
        width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
        flexShrink: 0,
        borderRight: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        transition: "width 180ms cubic-bezier(0.16, 1, 0.3, 1)",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          height: 56,
          px: collapsed ? 1.5 : 2,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 1,
        }}
      >
        {!collapsed ? (
          <Box
            component="button"
            type="button"
            onClick={() => navigate("/")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              background: "none",
              border: 0,
              p: 0,
              cursor: "pointer",
              color: "text.primary",
              minWidth: 0,
            }}
          >
            <WifiTetheringIcon color="primary" fontSize="small" />
            <Typography
              variant="subtitle2"
              fontWeight={700}
              noWrap
              sx={{ letterSpacing: "-0.01em" }}
            >
              Wifi-dashboard
            </Typography>
          </Box>
        ) : (
          <WifiTetheringIcon color="primary" fontSize="small" />
        )}

        {!collapsed ? (
          <IconButton
            size="small"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Box>

      <Divider />

      <List sx={{ px: 1, py: 1.5, flex: 1 }}>
        {items.map((item) => {
          const btn = (
            <ListItemButton
              key={item.id}
              selected={item.active}
              onClick={item.onClick}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                minHeight: 40,
                px: collapsed ? 1.5 : 1.75,
                justifyContent: collapsed ? "center" : "flex-start",
                "&.Mui-selected": {
                  bgcolor: "action.selected",
                  color: "primary.main",
                  "& .MuiListItemIcon-root": {
                    color: "primary.main",
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 0 : 32,
                  color: item.active ? "primary.main" : "text.secondary",
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!collapsed ? (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    variant: "body2",
                    fontWeight: item.active ? 600 : 500,
                    noWrap: true,
                  }}
                />
              ) : null}
            </ListItemButton>
          );

          return collapsed ? (
            <Tooltip key={item.id} title={item.label} placement="right">
              {btn}
            </Tooltip>
          ) : (
            btn
          );
        })}
      </List>

      {collapsed ? (
        <Box sx={{ p: 1, display: "flex", justifyContent: "center" }}>
          <IconButton
            size="small"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      ) : null}
    </Box>
  );
}
