import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchGlobalSearch, fetchUniversalEntity } from "@/api/investigate";
import { useAppStore } from "@/store/useAppStore";
import { useInvestigationStore } from "@/store/useInvestigationStore";
import type { EntityType } from "@/types/common";
import type { FilterField } from "@/types/filters";
import type { SearchResult } from "@/types/investigate";
import { formatNumber, formatPercent } from "@/utils/formatters";

function mapSearchTypeToEntity(rawType: string): EntityType | null {
  switch (rawType) {
    case "Employee":
      return "Employee";
    case "MAC":
    case "Device":
      return "Device";
    case "SSID":
      return "SSID";
    case "Location":
      return "Location";
    case "AP":
      return "AP";
    case "AP MAC":
      return "AP MAC";
    default:
      return null;
  }
}

function mapSearchTypeToFilterField(rawType: string): FilterField | null {
  switch (rawType) {
    case "Employee":
      return "employee_ids";
    case "MAC":
    case "Device":
      return "user_macs";
    case "SSID":
      return "ssids";
    case "Location":
      return "locations";
    case "AP":
      return "ap_hostnames";
    case "AP MAC":
      return "ap_macs";
    case "Facility":
      return "facilities";
    case "Mnemonic":
      return "mnemonics";
    default:
      return null;
  }
}

export function GlobalCommandPalette() {
  const navigate = useNavigate();
  const open = useAppStore((s) => s.commandPaletteOpen);
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const openEntityDrawer = useAppStore((s) => s.openEntityDrawer);
  const pushNotification = useAppStore((s) => s.pushNotification);

  const addCondition = useInvestigationStore((s) => s.addCondition);
  const setSubView = useInvestigationStore((s) => s.setSubView);
  const setGraphSeed = useInvestigationStore((s) => s.setGraphSeed);

  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [resolvingUniversal, setResolvingUniversal] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
    }, 220);
    return () => window.clearTimeout(timer);
  }, [inputValue]);

  const { data, isFetching, error } = useQuery({
    queryKey: ["global-search", debouncedQuery],
    queryFn: ({ signal }) => fetchGlobalSearch(debouncedQuery, 1, 20, signal),
    enabled: open && debouncedQuery.length >= 1,
    retry: false,
  });

  const handleInspectResult = (item: SearchResult) => {
    const entityType = mapSearchTypeToEntity(item.entity_type);
    if (entityType) {
      openEntityDrawer({ type: entityType, value: item.display_value });
      setOpen(false);
      return;
    }
    handleAddFilterResult(item);
  };

  const handleAddFilterResult = (item: SearchResult) => {
    const field = mapSearchTypeToFilterField(item.entity_type);
    if (field) {
      addCondition(field, "equals", item.display_value);
      setSubView("results");
      setOpen(false);
      navigate("/investigate");
    }
  };

  const handleSearchRawMessage = () => {
    const q = inputValue.trim();
    if (!q) return;
    addCondition("query", "contains", q);
    setSubView("results");
    setOpen(false);
    navigate("/investigate");
  };

  const handleUniversalResolve = async () => {
    const q = inputValue.trim();
    if (!q) return;
    setResolvingUniversal(true);
    try {
      const res = await fetchUniversalEntity(q);
      if (res.resolved && res.entity_type && res.canonical_value) {
        openEntityDrawer({
          type: res.entity_type,
          value: res.canonical_value,
        });
        setOpen(false);
      } else {
        pushNotification({
          severity: "warning",
          title: "Entity not matched directly",
          detail: `No exact Employee, MAC, AP, Location, or SSID matched "${q}". Try Raw Message search instead.`,
        });
      }
    } catch (err) {
      pushNotification({
        severity: "error",
        title: "Universal resolver failed",
        detail: err instanceof Error ? err.message : "Backend unavailable",
      });
    } finally {
      setResolvingUniversal(false);
    }
  };

  const results = data?.results ?? [];

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="md"
      fullWidth
      aria-label="Global entity and log search"
      slotProps={{
        paper: {
          sx: {
            overflow: "hidden",
            alignSelf: "flex-start",
            mt: { xs: 4, sm: 8 },
          },
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <TextField
          autoFocus
          fullWidth
          size="medium"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && inputValue.trim()) {
              if (results.length > 0) {
                handleInspectResult(results[0]);
              } else {
                void handleUniversalResolve();
              }
            }
          }}
          placeholder="Search Employee ID, Device MAC, SSID, Location, AP, AP MAC, or syslog text..."
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="primary" />
                </InputAdornment>
              ),
              endAdornment: isFetching ? (
                <InputAdornment position="end">
                  <CircularProgress size={18} />
                </InputAdornment>
              ) : (
                <InputAdornment position="end">
                  <Typography
                    variant="caption"
                    className="mono"
                    color="text.disabled"
                  >
                    ESC
                  </Typography>
                </InputAdornment>
              ),
            },
          }}
        />

        {inputValue.trim() ? (
          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 1.25, flexWrap: "wrap", rowGap: 1 }}
          >
            <Button
              size="small"
              variant="outlined"
              startIcon={<ManageSearchIcon />}
              onClick={handleSearchRawMessage}
            >
              Search Raw Message &amp; Metadata for &ldquo;{inputValue.trim()}&rdquo;
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={resolvingUniversal}
              startIcon={<OpenInNewIcon />}
              onClick={() => void handleUniversalResolve()}
            >
              {resolvingUniversal ? "Resolving..." : "Resolve Exact Entity"}
            </Button>
            <Button
              size="small"
              variant="text"
              startIcon={<HubOutlinedIcon />}
              onClick={() => {
                setGraphSeed({ type: "Universal", value: inputValue.trim() });
                setSubView("graph");
                setOpen(false);
                navigate("/investigate");
              }}
            >
              Explore in Graph
            </Button>
          </Stack>
        ) : null}
      </Box>

      <Divider />

      <Box sx={{ maxHeight: 440, overflowY: "auto" }}>
        {!debouncedQuery ? (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Type an Employee ID, MAC address, SSID, Location (such as{" "}
              <span className="mono">Unknown</span>), AP hostname, AP MAC,
              Facility, or Mnemonic. Results query{" "}
              <span className="mono">/investigate/search</span> in real time.
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="error.main">
              Search error: {error instanceof Error ? error.message : "Failed"}
            </Typography>
          </Box>
        ) : results.length === 0 && !isFetching ? (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No entity matches found for &ldquo;{debouncedQuery}&rdquo;. Use{" "}
              <strong>Search Raw Message &amp; Metadata</strong> above to query
              full event logs.
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {results.map((item, idx) => {
              const canFilter = mapSearchTypeToFilterField(item.entity_type) !== null;
              return (
                <ListItemButton
                  key={`${item.entity_type}-${item.display_value}-${idx}`}
                  onClick={() => handleInspectResult(item)}
                  sx={{
                    px: 2,
                    py: 1.25,
                    borderBottom: 1,
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack
                      direction="row"
                      spacing={1.25}
                      alignItems="baseline"
                      sx={{ mb: 0.25 }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: "primary.main",
                          fontWeight: 600,
                          minWidth: 72,
                        }}
                      >
                        {item.entity_type}
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        className="mono"
                        noWrap
                      >
                        {item.display_value}
                      </Typography>
                    </Stack>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                    >
                      Match: {item.matched_field}
                      {item.location ? ` · Location: ${item.location}` : ""}
                      {item.related_to ? ` · Related: ${item.related_to}` : ""}
                    </Typography>
                  </Box>

                  <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    flexShrink={0}
                  >
                    <Box sx={{ textAlign: "right" }}>
                      {item.users !== null && item.users !== undefined ? (
                        <Typography
                          variant="caption"
                          className="tabular-nums"
                          sx={{ display: "block", color: "text.primary" }}
                        >
                          Users: {formatNumber(item.users)} · Devices:{" "}
                          {formatNumber(item.devices)}
                        </Typography>
                      ) : null}
                      {item.failure_rate !== null &&
                      item.failure_rate !== undefined ? (
                        <Typography
                          variant="caption"
                          className="tabular-nums"
                          sx={{
                            display: "block",
                            color:
                              item.failure_rate >= 50
                                ? "error.main"
                                : "text.secondary",
                          }}
                        >
                          Failure rate: {formatPercent(item.failure_rate)}
                        </Typography>
                      ) : null}
                    </Box>

                    {canFilter ? (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<FilterAltOutlinedIcon fontSize="small" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddFilterResult(item);
                        }}
                      >
                        Filter
                      </Button>
                    ) : null}
                  </Stack>
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>
    </Dialog>
  );
}
