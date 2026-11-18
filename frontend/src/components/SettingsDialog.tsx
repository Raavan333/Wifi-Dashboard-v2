import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchHealth } from "@/api/health";
import { useAppStore } from "@/store/useAppStore";
import { useInvestigationStore } from "@/store/useInvestigationStore";

export function SettingsDialog() {
  const queryClient = useQueryClient();
  const open = useAppStore((s) => s.settingsOpen);
  const setOpen = useAppStore((s) => s.setSettingsOpen);
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);
  const autoRefreshSeconds = useAppStore((s) => s.autoRefreshSeconds);
  const setAutoRefreshSeconds = useAppStore((s) => s.setAutoRefreshSeconds);
  const defaultPageSize = useAppStore((s) => s.defaultPageSize);
  const setDefaultPageSize = useAppStore((s) => s.setDefaultPageSize);
  const apiBaseUrl = useAppStore((s) => s.apiBaseUrl);
  const setApiBaseUrl = useAppStore((s) => s.setApiBaseUrl);
  const pushNotification = useAppStore((s) => s.pushNotification);
  const setPageSize = useInvestigationStore((s) => s.setPageSize);

  const [urlDraft, setUrlDraft] = useState(apiBaseUrl);
  const [healthResult, setHealthResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (open) {
      setUrlDraft(apiBaseUrl);
      setHealthResult(null);
    }
  }, [open, apiBaseUrl]);

  const handleSave = () => {
    setApiBaseUrl(urlDraft);
    setPageSize(defaultPageSize);
    queryClient.invalidateQueries();
    pushNotification({
      severity: "info",
      title: "Workspace settings updated",
      detail: urlDraft.trim()
        ? `Backend target set to ${urlDraft.trim()}`
        : "Using same-origin Vite / gateway proxy",
    });
    setOpen(false);
  };

  const handleTestConnection = async () => {
    setApiBaseUrl(urlDraft);
    setTesting(true);
    setHealthResult(null);
    try {
      const res = await fetchHealth();
      setHealthResult(
        `Connected: ${res.service} v${res.version} (${res.status}, DB: ${res.database})`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setHealthResult(`Failed: ${message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="sm"
      fullWidth
      aria-labelledby="settings-dialog-title"
    >
      <DialogTitle id="settings-dialog-title" sx={{ fontWeight: 600 }}>
        Platform Settings
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Appearance
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={themeMode}
              onChange={(_e, val) => {
                if (val) setThemeMode(val);
              }}
            >
              <ToggleButton value="dark">Dark (Default)</ToggleButton>
              <ToggleButton value="light">Light</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel id="auto-refresh-label">Auto-Refresh</InputLabel>
              <Select
                labelId="auto-refresh-label"
                label="Auto-Refresh"
                value={autoRefreshSeconds}
                onChange={(e) => setAutoRefreshSeconds(Number(e.target.value))}
              >
                <MenuItem value={0}>Manual only</MenuItem>
                <MenuItem value={60}>Every 1 minute</MenuItem>
                <MenuItem value={300}>Every 5 minutes</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="page-size-label">Default Page Size</InputLabel>
              <Select
                labelId="page-size-label"
                label="Default Page Size"
                value={defaultPageSize}
                onChange={(e) => setDefaultPageSize(Number(e.target.value))}
              >
                <MenuItem value={50}>50 rows</MenuItem>
                <MenuItem value={100}>100 rows</MenuItem>
                <MenuItem value={250}>250 rows</MenuItem>
                <MenuItem value={500}>500 rows (max)</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              FastAPI Backend Endpoint
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1 }}
            >
              Leave blank to use the built-in proxy (`/dashboard`, `/investigate`).
              Specify an explicit URL (e.g. `http://localhost:8000`) to connect
              directly to an external FastAPI server.
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="http://localhost:8000"
                inputProps={{ className: "mono" }}
              />
              <Button
                variant="outlined"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? "Testing..." : "Test"}
              </Button>
            </Stack>
            {healthResult ? (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 1,
                  color: healthResult.startsWith("Connected")
                    ? "success.main"
                    : "error.main",
                }}
                className="mono"
              >
                {healthResult}
              </Typography>
            ) : null}
          </Box>
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
}
