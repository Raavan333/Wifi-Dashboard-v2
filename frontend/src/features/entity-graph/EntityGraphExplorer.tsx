import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchApDetails,
  fetchApMacDetails,
  fetchEmployeeDetails,
  fetchLocationDetails,
  fetchMacDetails,
  fetchSsidDetails,
  fetchUniversalEntity,
} from "@/api/investigate";
import { useAppStore } from "@/store/useAppStore";
import { useInvestigationStore } from "@/store/useInvestigationStore";
import { getTokens } from "@/theme/tokens";
import type { EntityType } from "@/types/common";
import type { FilterField } from "@/types/filters";
import { normalizeApDisplay } from "@/utils/normalization";

interface GraphNode {
  id: string;
  type: EntityType;
  label: string;
  x: number;
  y: number;
  expanded?: boolean;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

function makeNodeId(type: EntityType, label: string): string {
  return `${type}::${label}`;
}

function mapEntityToFilterField(type: EntityType): FilterField {
  switch (type) {
    case "Employee":
      return "employee_ids";
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
  }
}

export function EntityGraphExplorer() {
  const theme = useTheme();
  const tokens = getTokens(theme.palette.mode);

  const graphSeed = useInvestigationStore((s) => s.graphSeed);
  const setGraphSeed = useInvestigationStore((s) => s.setGraphSeed);
  const addCondition = useInvestigationStore((s) => s.addCondition);
  const setSubView = useInvestigationStore((s) => s.setSubView);
  const openEntityDrawer = useAppStore((s) => s.openEntityDrawer);

  const [lookupInput, setLookupInput] = useState(graphSeed?.value ?? "");
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const nodeColor = useCallback(
    (type: EntityType) => {
      switch (type) {
        case "Employee":
          return tokens.accent;
        case "Device":
          return tokens.success;
        case "SSID":
          return tokens.unknown;
        case "Location":
          return tokens.warning;
        case "AP":
        case "AP MAC":
          return tokens.fail;
      }
    },
    [tokens],
  );

  const expandFromEntity = useCallback(
    async (type: EntityType, value: string, resetGraph: boolean) => {
      const cleanVal = value.trim();
      if (!cleanVal) return;

      setLoading(true);
      setErrorMsg(null);

      try {
        const neighbors: Array<{ type: EntityType; label: string }> = [];

        if (type === "Employee") {
          const res = await fetchEmployeeDetails(cleanVal);
          for (const d of res.devices.slice(0, 10)) {
            const mac = typeof d.user_mac === "string" ? d.user_mac : "";
            if (mac) neighbors.push({ type: "Device", label: mac });
          }
          for (const loc of res.locations.slice(0, 6)) {
            neighbors.push({ type: "Location", label: loc });
          }
          for (const ssid of res.ssids.slice(0, 6)) {
            neighbors.push({ type: "SSID", label: ssid });
          }
          for (const ap of res.aps.slice(0, 6)) {
            const apClean = normalizeApDisplay(ap);
            if (apClean) neighbors.push({ type: "AP", label: apClean });
          }
        } else if (type === "Device") {
          const res = await fetchMacDetails(cleanVal);
          if (res) {
            if (res.employee_id !== null && res.employee_id !== undefined) {
              neighbors.push({
                type: "Employee",
                label: String(res.employee_id),
              });
            }
            for (const ssid of (res.ssids ?? res.observed_ssids ?? []).slice(0, 6)) {
              neighbors.push({ type: "SSID", label: ssid });
            }
            for (const loc of (res.locations ?? []).slice(0, 5)) {
              neighbors.push({ type: "Location", label: loc });
            }
            for (const ap of (res.aps ?? []).slice(0, 5)) {
              const apClean = normalizeApDisplay(ap);
              if (apClean) neighbors.push({ type: "AP", label: apClean });
            }
            if (res.ap_mac) {
              neighbors.push({ type: "AP MAC", label: res.ap_mac });
            }
          }
        } else if (type === "Location") {
          const res = await fetchLocationDetails(cleanVal);
          for (const s of (res.ssids ?? res.top_ssids ?? []).slice(0, 6)) {
            neighbors.push({ type: "SSID", label: s.ssid });
          }
          for (const ap of (res.aps ?? res.top_aps ?? []).slice(0, 8)) {
            const apClean = normalizeApDisplay(ap.ap_hostname);
            if (apClean) neighbors.push({ type: "AP", label: apClean });
          }
        } else if (type === "SSID") {
          const res = await fetchSsidDetails(cleanVal);
          for (const loc of (res.locations ?? []).slice(0, 6)) {
            neighbors.push({ type: "Location", label: loc.location });
          }
          for (const ap of (res.aps ?? []).slice(0, 8)) {
            const apClean = normalizeApDisplay(ap.ap_hostname);
            if (apClean) neighbors.push({ type: "AP", label: apClean });
          }
        } else if (type === "AP") {
          const res = await fetchApDetails(cleanVal);
          for (const mac of (res.ap_macs ?? []).slice(0, 6)) {
            neighbors.push({ type: "AP MAC", label: mac });
          }
          for (const loc of (res.locations ?? []).slice(0, 5)) {
            neighbors.push({ type: "Location", label: loc });
          }
          for (const ssid of (res.ssids ?? []).slice(0, 6)) {
            neighbors.push({ type: "SSID", label: ssid });
          }
        } else if (type === "AP MAC") {
          const res = await fetchApMacDetails(cleanVal);
          for (const ap of (res.ap_hostnames ?? []).slice(0, 6)) {
            const apClean = normalizeApDisplay(ap);
            if (apClean) neighbors.push({ type: "AP", label: apClean });
          }
          for (const loc of (res.locations ?? []).slice(0, 5)) {
            neighbors.push({ type: "Location", label: loc });
          }
          for (const ssid of (res.ssids ?? []).slice(0, 6)) {
            neighbors.push({ type: "SSID", label: ssid });
          }
        }

        const rootId = makeNodeId(type, cleanVal);

        setNodes((prevNodes) => {
          const baseNodes = resetGraph ? [] : [...prevNodes];
          const existingMap = new Map(baseNodes.map((n) => [n.id, n]));

          let rootNode = existingMap.get(rootId);
          if (!rootNode) {
            rootNode = {
              id: rootId,
              type,
              label: cleanVal,
              x: 420,
              y: 250,
              expanded: true,
            };
            existingMap.set(rootId, rootNode);
          } else {
            existingMap.set(rootId, { ...rootNode, expanded: true });
          }

          const uniqueNeighbors = neighbors.filter(
            (n) => n.label && makeNodeId(n.type, n.label) !== rootId,
          );

          uniqueNeighbors.forEach((n, idx) => {
            const id = makeNodeId(n.type, n.label);
            if (!existingMap.has(id)) {
              const angle = (2 * Math.PI * idx) / Math.max(1, uniqueNeighbors.length);
              const radius = resetGraph ? 175 : 135;
              existingMap.set(id, {
                id,
                type: n.type,
                label: n.label,
                x: Math.max(70, Math.min(770, rootNode!.x + Math.cos(angle) * radius)),
                y: Math.max(50, Math.min(450, rootNode!.y + Math.sin(angle) * radius)),
                expanded: false,
              });
            }
          });

          return Array.from(existingMap.values());
        });

        setEdges((prevEdges) => {
          const baseEdges = resetGraph ? [] : [...prevEdges];
          const edgeSet = new Map(baseEdges.map((e) => [e.id, e]));
          for (const n of neighbors) {
            const targetId = makeNodeId(n.type, n.label);
            if (targetId === rootId) continue;
            const pairId = [rootId, targetId].sort().join("--");
            if (!edgeSet.has(pairId)) {
              edgeSet.set(pairId, {
                id: pairId,
                source: rootId,
                target: targetId,
              });
            }
          }
          return Array.from(edgeSet.values());
        });

        setSelectedId(rootId);
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Unable to resolve entity relationships.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (graphSeed?.value) {
      setLookupInput(graphSeed.value);
      const maybeType = graphSeed.type as EntityType;
      const validTypes: EntityType[] = [
        "Employee",
        "Device",
        "AP MAC",
        "AP",
        "Location",
        "SSID",
      ];
      if (validTypes.includes(maybeType)) {
        void expandFromEntity(maybeType, graphSeed.value, true);
      } else {
        void handleLookup(graphSeed.value);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphSeed]);

  const handleLookup = async (rawQuery?: string) => {
    const q = (rawQuery ?? lookupInput).trim();
    if (!q) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchUniversalEntity(q);
      if (res.resolved && res.entity_type && res.canonical_value) {
        setGraphSeed({ type: res.entity_type, value: res.canonical_value });
        await expandFromEntity(res.entity_type, res.canonical_value, true);
      } else {
        setErrorMsg(`No matching entity resolved for "${q}".`);
        setLoading(false);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Universal entity lookup failed.",
      );
      setLoading(false);
    }
  };

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  const connectedNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (!selectedId) return set;
    set.add(selectedId);
    for (const e of edges) {
      if (e.source === selectedId) set.add(e.target);
      if (e.target === selectedId) set.add(e.source);
    }
    return set;
  }, [edges, selectedId]);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
        spacing={1.5}
        mb={2}
      >
        <Stack spacing={0.25}>
          <Typography variant="subtitle2" fontWeight={700}>
            Interactive Entity Graph Explorer
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Explore live topology links across Employee, Device MAC, SSID, Location, AP, and AP MAC
          </Typography>
        </Stack>

        <Stack
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleLookup();
          }}
          direction="row"
          spacing={1}
        >
          <TextField
            size="small"
            value={lookupInput}
            onChange={(e) => setLookupInput(e.target.value)}
            placeholder="Seed Employee ID, MAC, SSID, Location, or AP"
            sx={{ minWidth: { xs: 200, sm: 300 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button type="submit" variant="contained" size="small" disabled={loading}>
            Explore
          </Button>
          <Tooltip title="Zoom in">
            <IconButton
              size="small"
              onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
            >
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom out">
            <IconButton
              size="small"
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
            >
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset zoom">
            <IconButton size="small" onClick={() => setZoom(1)}>
              <CenterFocusStrongIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={1.5}>
        {(
          ["Employee", "Device", "SSID", "Location", "AP", "AP MAC"] as EntityType[]
        ).map((t) => (
          <Stack key={t} direction="row" spacing={0.75} alignItems="center">
            <Box
              sx={{
                width: 9,
                height: 9,
                borderRadius: "2px",
                bgcolor: nodeColor(t),
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {t}
            </Typography>
          </Stack>
        ))}
      </Stack>

      {errorMsg ? (
        <Box
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 1.5,
            border: 1,
            borderColor: "error.main",
          }}
        >
          <Typography variant="caption" color="error.main">
            {errorMsg}
          </Typography>
        </Box>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 290px" },
          gap: 2,
        }}
      >
        <Box
          sx={{
            position: "relative",
            height: 500,
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
            bgcolor: "background.default",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <Box
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 2,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">
                Resolving links...
              </Typography>
            </Box>
          ) : null}

          {nodes.length === 0 ? (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 3,
                textAlign: "center",
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Seed an entity to visualize relationships
              </Typography>
              <Typography variant="caption" color="text.secondary" maxWidth={420}>
                Enter an Employee ID, Device MAC, SSID, Location, or AP Hostname above, or click &quot;Explore in Graph&quot; from any Entity Drawer.
              </Typography>
            </Box>
          ) : (
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 840 500"
              style={{ display: "block" }}
            >
              <g
                transform={`translate(${420 * (1 - zoom)}, ${250 * (1 - zoom)}) scale(${zoom})`}
              >
                {edges.map((edge) => {
                  const src = nodeMap.get(edge.source);
                  const tgt = nodeMap.get(edge.target);
                  if (!src || !tgt) return null;
                  const highlighted =
                    !selectedId ||
                    (connectedNodeIds.has(src.id) &&
                      connectedNodeIds.has(tgt.id));
                  return (
                    <line
                      key={edge.id}
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      stroke={highlighted ? tokens.borderStrong : tokens.gridLine}
                      strokeWidth={highlighted ? 1.5 : 1}
                      strokeOpacity={highlighted ? 0.9 : 0.35}
                    />
                  );
                })}

                {nodes.map((node) => {
                  const isSelected = node.id === selectedId;
                  const isDimmed =
                    Boolean(selectedId) && !connectedNodeIds.has(node.id);
                  const fill = nodeColor(node.type);
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={() => setSelectedId(node.id)}
                      onDoubleClick={() =>
                        void expandFromEntity(node.type, node.label, false)
                      }
                      style={{
                        cursor: "pointer",
                        opacity: isDimmed ? 0.3 : 1,
                      }}
                    >
                      <circle
                        r={isSelected ? 16 : 12}
                        fill={fill}
                        fillOpacity={0.22}
                        stroke={fill}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />
                      <circle r={4.5} fill={fill} />
                      <text
                        y={26}
                        textAnchor="middle"
                        fill={tokens.textPrimary}
                        fontSize={10.5}
                        fontFamily='"JetBrains Mono", monospace'
                      >
                        {node.label.length > 22
                          ? `${node.label.slice(0, 20)}...`
                          : node.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          )}
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
            bgcolor: "background.default",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {selectedNode ? (
            <Stack spacing={1.5}>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  {selectedNode.type.toUpperCase()}
                </Typography>
                <Typography
                  variant="subtitle2"
                  className="mono"
                  fontWeight={700}
                  sx={{ wordBreak: "break-all" }}
                >
                  {selectedNode.label}
                </Typography>
              </Box>

              <Typography variant="caption" color="text.secondary">
                Connected nodes in graph:{" "}
                <span className="mono">{Math.max(0, connectedNodeIds.size - 1)}</span>
              </Typography>

              <Stack spacing={1}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<OpenInNewIcon fontSize="small" />}
                  onClick={() =>
                    openEntityDrawer({
                      type: selectedNode.type,
                      value: selectedNode.label,
                    })
                  }
                >
                  Open Entity Drawer
                </Button>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddCircleOutlineIcon fontSize="small" />}
                  disabled={loading}
                  onClick={() =>
                    void expandFromEntity(
                      selectedNode.type,
                      selectedNode.label,
                      false,
                    )
                  }
                >
                  Expand Neighborhood
                </Button>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FilterAltOutlinedIcon fontSize="small" />}
                  onClick={() => {
                    addCondition(
                      mapEntityToFilterField(selectedNode.type),
                      "equals",
                      selectedNode.label,
                    );
                    setSubView("results");
                  }}
                >
                  Add to Filters &amp; View Events
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={600}>
                Node Inspector
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Select any node in the topology canvas to highlight its neighbors, expand connected entities, or jump into raw events. Double-click a node to expand immediately.
              </Typography>
            </Stack>
          )}

          <Typography variant="caption" color="text.disabled" className="mono">
            Nodes: {nodes.length} · Edges: {edges.length}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
