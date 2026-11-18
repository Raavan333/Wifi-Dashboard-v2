import { Box, Button, Skeleton, Stack, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import type { ReactNode } from "react";
import { useAppStore } from "@/store/useAppStore";

interface StateFrameProps {
  loading: boolean;
  error?: Error | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  skeletonHeight?: number;
  children: ReactNode;
}

export function StateFrame({
  loading,
  error,
  empty = false,
  emptyTitle = "No records found",
  emptyDescription = "Adjust filters or time range to inspect matching records.",
  onRetry,
  skeletonHeight = 220,
  children,
}: StateFrameProps) {
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rounded" height={skeletonHeight} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          p: 3,
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack spacing={1.5} alignItems="flex-start">
          <Typography variant="subtitle2" color="error.main" fontWeight={600}>
            Backend data unavailable
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error.message ||
              "Could not reach the FastAPI backend. Ensure the backend service and PostgreSQL are running."}
          </Typography>
          <Stack direction="row" spacing={1}>
            {onRetry ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon fontSize="small" />}
                onClick={onRetry}
              >
                Retry
              </Button>
            ) : null}
            <Button
              size="small"
              variant="text"
              startIcon={<SettingsOutlinedIcon fontSize="small" />}
              onClick={() => setSettingsOpen(true)}
            >
              Configure Backend URL
            </Button>
          </Stack>
        </Stack>
      </Box>
    );
  }

  if (empty) {
    return (
      <Box
        sx={{
          p: 3,
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          {emptyTitle}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {emptyDescription}
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
}
