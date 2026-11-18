import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Pagination,
  Popover,
  Select,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";
import { EntityLink } from "@/components/EntityLink";
import { StateFrame } from "@/components/StateFrame";
import { useInvestigationStore } from "@/store/useInvestigationStore";
import type { PaginationMeta } from "@/types/common";
import type { GroupMode, RawEvent } from "@/types/investigate";
import { downloadCsv } from "@/utils/exportCsv";
import { formatNumber, formatTimestamp } from "@/utils/formatters";
import { normalizeApDisplay } from "@/utils/normalization";

interface RawEventsTableProps {
  records: RawEvent[];
  pagination?: PaginationMeta;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}

const columnHelper = createColumnHelper<RawEvent>();

const ALL_COLUMNS = [
  { id: "appeared_timestamp", label: "Timestamp", sortable: true },
  { id: "employee_id", label: "Employee", sortable: true },
  { id: "user_mac", label: "Device MAC", sortable: true },
  { id: "status", label: "Status", sortable: true },
  { id: "ssid", label: "SSID", sortable: true },
  { id: "location", label: "Location", sortable: true },
  { id: "ap_hostname", label: "AP Hostname", sortable: true },
  { id: "facility", label: "Facility", sortable: false },
  { id: "mnemonic", label: "Mnemonic", sortable: false },
  { id: "message", label: "Message", sortable: false },
];

export function RawEventsTable({
  records,
  pagination,
  loading,
  error,
  onRetry,
}: RawEventsTableProps) {
  const page = useInvestigationStore((s) => s.page);
  const pageSize = useInvestigationStore((s) => s.pageSize);
  const sortBy = useInvestigationStore((s) => s.sortBy);
  const sortOrder = useInvestigationStore((s) => s.sortOrder);
  const groupMode = useInvestigationStore((s) => s.groupMode);
  const visibleColumns = useInvestigationStore((s) => s.visibleColumns);

  const setPage = useInvestigationStore((s) => s.setPage);
  const setPageSize = useInvestigationStore((s) => s.setPageSize);
  const setSort = useInvestigationStore((s) => s.setSort);
  const setGroupMode = useInvestigationStore((s) => s.setGroupMode);
  const toggleColumnVisibility = useInvestigationStore(
    (s) => s.toggleColumnVisibility,
  );

  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [colMenuAnchor, setColMenuAnchor] = useState<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const statusColor = (status: string) => {
    const upper = status.toUpperCase();
    if (upper === "SUCCESS") return "success.main";
    if (upper === "FAIL") return "error.main";
    if (upper === "UNKNOWN") return "secondary.main";
    return "text.primary";
  };

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "expand",
        header: "",
        cell: (info) => {
          const isOpen = expandedRowId === info.row.original.id;
          return (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedRowId(isOpen ? null : info.row.original.id);
              }}
              aria-label="Toggle event details"
            >
              {isOpen ? (
                <ExpandLessIcon fontSize="small" />
              ) : (
                <ExpandMoreIcon fontSize="small" />
              )}
            </IconButton>
          );
        },
      }),
      columnHelper.accessor("appeared_timestamp", {
        id: "appeared_timestamp",
        header: "Timestamp",
        cell: (info) => (
          <span className="mono" style={{ fontSize: "0.78rem" }}>
            {formatTimestamp(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("employee_id", {
        id: "employee_id",
        header: "Employee",
        cell: (info) => (
          <EntityLink type="Employee" value={info.getValue()} mono />
        ),
      }),
      columnHelper.accessor("user_mac", {
        id: "user_mac",
        header: "Device MAC",
        cell: (info) => (
          <EntityLink type="Device" value={info.getValue()} mono />
        ),
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: "Status",
        cell: (info) => {
          const val = info.getValue();
          return (
            <Typography
              variant="caption"
              className="mono"
              fontWeight={700}
              sx={{ color: statusColor(val) }}
            >
              {val}
            </Typography>
          );
        },
      }),
      columnHelper.accessor("ssid", {
        id: "ssid",
        header: "SSID",
        cell: (info) => <EntityLink type="SSID" value={info.getValue()} />,
      }),
      columnHelper.accessor("location", {
        id: "location",
        header: "Location",
        cell: (info) => (
          <EntityLink
            type="Location"
            value={info.getValue()}
            highlightUnknown
          />
        ),
      }),
      columnHelper.accessor("ap_hostname", {
        id: "ap_hostname",
        header: "AP Hostname",
        cell: (info) => (
          <EntityLink
            type="AP"
            value={normalizeApDisplay(info.getValue())}
            mono
          />
        ),
      }),
      columnHelper.accessor("facility", {
        id: "facility",
        header: "Facility",
        cell: (info) => (
          <span className="mono" style={{ fontSize: "0.76rem" }}>
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("mnemonic", {
        id: "mnemonic",
        header: "Mnemonic",
        cell: (info) => (
          <span className="mono" style={{ fontSize: "0.76rem" }}>
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("message", {
        id: "message",
        header: "Message",
        cell: (info) => (
          <Typography
            variant="caption"
            noWrap
            sx={{ display: "block", maxWidth: 280, color: "text.secondary" }}
            title={info.getValue() ?? ""}
          >
            {info.getValue() || "—"}
          </Typography>
        ),
      }),
    ],
    [expandedRowId],
  );

  const activeColumns = useMemo(
    () =>
      columns.filter(
        (c) => c.id === "expand" || (c.id && visibleColumns.includes(c.id)),
      ),
    [columns, visibleColumns],
  );

  const table = useReactTable({
    data: records,
    columns: activeColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - virtualRows[virtualRows.length - 1].end
      : 0;

  const toggleSortColumn = (colId: string) => {
    const def = ALL_COLUMNS.find((c) => c.id === colId);
    if (!def?.sortable) return;
    if (sortBy === colId) {
      setSort(colId, sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSort(colId, "desc");
    }
  };

  return (
    <Stack spacing={1.5}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        spacing={1}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Event Grouping:
          </Typography>
          <Tabs
            value={groupMode}
            onChange={(_, v: GroupMode) => setGroupMode(v)}
            sx={{
              minHeight: 32,
              border: 1,
              borderColor: "divider",
              borderRadius: 1.5,
              "& .MuiTab-root": {
                minHeight: 32,
                py: 0.25,
                px: 1.25,
                fontSize: "0.75rem",
              },
            }}
          >
            <Tab value="raw" label="Raw Events" />
            <Tab value="authentication_attempt" label="Auth Attempts" />
          </Tabs>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl size="small">
            <Select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              sx={{ height: 32, fontSize: "0.78rem" }}
            >
              {[25, 50, 100, 250, 500].map((sz) => (
                <MenuItem key={sz} value={sz}>
                  {sz} rows
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            size="small"
            variant="outlined"
            startIcon={<ViewColumnOutlinedIcon fontSize="small" />}
            onClick={(e) => setColMenuAnchor(e.currentTarget)}
          >
            Columns
          </Button>

          <Button
            size="small"
            variant="outlined"
            disabled={records.length === 0}
            startIcon={<DownloadOutlinedIcon fontSize="small" />}
            onClick={() =>
              downloadCsv(
                `wifi-events-page-${page}.csv`,
                records as unknown as Array<Record<string, unknown>>,
                ALL_COLUMNS.map((c) => ({ key: c.id, label: c.label })),
              )
            }
          >
            Export CSV
          </Button>
        </Stack>
      </Stack>

      <Popover
        open={Boolean(colMenuAnchor)}
        anchorEl={colMenuAnchor}
        onClose={() => setColMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Stack sx={{ p: 1.5, minWidth: 200 }} spacing={0.25}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" mb={0.5}>
            Visible Columns
          </Typography>
          {ALL_COLUMNS.map((col) => (
            <FormControlLabel
              key={col.id}
              control={
                <Checkbox
                  size="small"
                  checked={visibleColumns.includes(col.id)}
                  onChange={() => toggleColumnVisibility(col.id)}
                />
              }
              label={<Typography variant="caption">{col.label}</Typography>}
            />
          ))}
        </Stack>
      </Popover>

      <StateFrame
        loading={loading}
        error={error}
        empty={!loading && !error && records.length === 0}
        emptyTitle="No matching events"
        emptyDescription="Modify your Investigation Query Builder filters or broaden the time range."
        onRetry={onRetry}
        skeletonHeight={340}
      >
        <Box
          sx={{
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            overflow: "hidden",
          }}
        >
          <Box
            ref={scrollRef}
            sx={{
              maxHeight: 540,
              overflow: "auto",
              position: "relative",
            }}
          >
            <Box
              component="table"
              sx={{
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "auto",
              }}
            >
              <Box
                component="thead"
                sx={{
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  bgcolor: "background.paper",
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                {table.getHeaderGroups().map((hg) => (
                  <Box component="tr" key={hg.id}>
                    {hg.headers.map((header) => {
                      const colDef = ALL_COLUMNS.find(
                        (c) => c.id === header.column.id,
                      );
                      const isSorted = sortBy === header.column.id;
                      return (
                        <Box
                          component="th"
                          key={header.id}
                          onClick={() => toggleSortColumn(header.column.id)}
                          sx={{
                            textAlign: "left",
                            px: 1.5,
                            py: 1.1,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "text.secondary",
                            whiteSpace: "nowrap",
                            cursor: colDef?.sortable ? "pointer" : "default",
                            userSelect: "none",
                          }}
                        >
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <span>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </span>
                            {isSorted ? (
                              sortOrder === "asc" ? (
                                <ArrowUpwardIcon sx={{ fontSize: 13 }} />
                              ) : (
                                <ArrowDownwardIcon sx={{ fontSize: 13 }} />
                              )
                            ) : null}
                          </Stack>
                        </Box>
                      );
                    })}
                  </Box>
                ))}
              </Box>

              <Box component="tbody">
                {paddingTop > 0 ? (
                  <Box component="tr">
                    <Box
                      component="td"
                      colSpan={activeColumns.length}
                      sx={{ height: paddingTop, p: 0 }}
                    />
                  </Box>
                ) : null}

                {virtualRows.map((vRow) => {
                  const row = rows[vRow.index];
                  const ev = row.original;
                  const isExpanded = expandedRowId === ev.id;
                  return (
                    <>
                      <Box
                        component="tr"
                        key={row.id}
                        onClick={() =>
                          setExpandedRowId(isExpanded ? null : ev.id)
                        }
                        sx={{
                          borderBottom: 1,
                          borderColor: "divider",
                          cursor: "pointer",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <Box
                            component="td"
                            key={cell.id}
                            sx={{
                              px: 1.5,
                              py: 0.9,
                              fontSize: "0.8rem",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </Box>
                        ))}
                      </Box>

                      {isExpanded ? (
                        <Box
                          component="tr"
                          key={`${row.id}-expanded`}
                          sx={{
                            bgcolor: "action.hover",
                            borderBottom: 1,
                            borderColor: "divider",
                          }}
                        >
                          <Box
                            component="td"
                            colSpan={activeColumns.length}
                            sx={{ p: 2 }}
                          >
                            <Stack spacing={1.25}>
                              <Stack
                                direction="row"
                                spacing={2}
                                flexWrap="wrap"
                                useFlexGap
                              >
                                <Typography variant="caption" className="mono">
                                  Event ID: {ev.id}
                                </Typography>
                                {ev.ap_mac ? (
                                  <Typography variant="caption" className="mono">
                                    AP MAC:{" "}
                                    <EntityLink
                                      type="AP MAC"
                                      value={ev.ap_mac}
                                      mono
                                    />
                                  </Typography>
                                ) : null}
                                {ev.attempt_count !== null &&
                                ev.attempt_count !== undefined ? (
                                  <Typography variant="caption" className="mono">
                                    Attempts: {ev.attempt_count}
                                  </Typography>
                                ) : null}
                                <Typography variant="caption" className="mono">
                                  ES Timestamp:{" "}
                                  {formatTimestamp(ev.elasticsearch_timestamp)}
                                </Typography>
                              </Stack>

                              {ev.message ? (
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    fontWeight={600}
                                    display="block"
                                    mb={0.4}
                                  >
                                    Raw Syslog Message
                                  </Typography>
                                  <Box
                                    component="pre"
                                    className="mono"
                                    sx={{
                                      m: 0,
                                      p: 1.25,
                                      borderRadius: 1,
                                      bgcolor: "background.paper",
                                      border: 1,
                                      borderColor: "divider",
                                      fontSize: "0.75rem",
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {ev.message}
                                  </Box>
                                </Box>
                              ) : null}

                              {ev.metadata ? (
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    fontWeight={600}
                                    display="block"
                                    mb={0.4}
                                  >
                                    Event Metadata JSON
                                  </Typography>
                                  <Box
                                    component="pre"
                                    className="mono"
                                    sx={{
                                      m: 0,
                                      p: 1.25,
                                      borderRadius: 1,
                                      bgcolor: "background.paper",
                                      border: 1,
                                      borderColor: "divider",
                                      fontSize: "0.74rem",
                                      overflowX: "auto",
                                    }}
                                  >
                                    {JSON.stringify(ev.metadata, null, 2)}
                                  </Box>
                                </Box>
                              ) : null}
                            </Stack>
                          </Box>
                        </Box>
                      ) : null}
                    </>
                  );
                })}

                {paddingBottom > 0 ? (
                  <Box component="tr">
                    <Box
                      component="td"
                      colSpan={activeColumns.length}
                      sx={{ height: paddingBottom, p: 0 }}
                    />
                  </Box>
                ) : null}
              </Box>
            </Box>
          </Box>

          {pagination ? (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
              sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: "divider" }}
            >
              <Typography variant="caption" color="text.secondary" className="mono">
                {formatNumber(pagination.total_records)} events · Page{" "}
                {pagination.page} of {pagination.total_pages}
              </Typography>
              <Pagination
                size="small"
                count={Math.max(1, pagination.total_pages)}
                page={page}
                onChange={(_, p) => setPage(p)}
              />
            </Stack>
          ) : null}
        </Box>
      </StateFrame>
    </Stack>
  );
}
