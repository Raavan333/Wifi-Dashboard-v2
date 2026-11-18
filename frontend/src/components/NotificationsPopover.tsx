import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { formatTimestamp } from "@/utils/formatters";

export function NotificationsPopover() {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const notifications = useAppStore((s) => s.notifications);
  const markAllNotificationsRead = useAppStore(
    (s) => s.markAllNotificationsRead,
  );
  const clearNotifications = useAppStore((s) => s.clearNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const open = Boolean(anchorEl);

  const severityColor: Record<string, string> = {
    info: "primary.main",
    success: "success.main",
    warning: "warning.main",
    error: "error.main",
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          size="small"
          aria-label="Open notifications"
          onClick={(e) => {
            setAnchorEl(e.currentTarget);
            markAllNotificationsRead();
          }}
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 1.5,
            width: 34,
            height: 34,
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="primary"
            max={9}
            invisible={unreadCount === 0}
          >
            <NotificationsNoneOutlinedIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: { width: 360, maxHeight: 420, mt: 1, p: 0 },
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, py: 1.5 }}
        >
          <Typography variant="subtitle2" fontWeight={600}>
            Activity & Alerts
          </Typography>
          {notifications.length > 0 ? (
            <Button size="small" onClick={clearNotifications}>
              Clear all
            </Button>
          ) : null}
        </Stack>
        <Divider />

        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No notifications yet. Backend diagnostics and saved view updates
              appear here.
            </Typography>
          </Box>
        ) : (
          <Stack divider={<Divider />} sx={{ maxHeight: 340, overflowY: "auto" }}>
            {notifications.map((item) => (
              <Box key={item.id} sx={{ px: 2, py: 1.5 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="baseline"
                  spacing={1}
                >
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    sx={{ color: severityColor[item.severity] ?? "text.primary" }}
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    className="tabular-nums"
                    sx={{ color: "text.disabled", fontSize: "0.7rem" }}
                  >
                    {formatTimestamp(item.timestamp).slice(11, 19)}
                  </Typography>
                </Stack>
                {item.detail ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.4 }}
                  >
                    {item.detail}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Stack>
        )}
      </Popover>
    </>
  );
}
