import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import {
  Box,
  Button,
  FormControl,
  IconButton,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";
import { EntityLink } from "@/components/EntityLink";
import { StateFrame } from "@/components/StateFrame";
import { useAppStore } from "@/store/useAppStore";
import { useInvestigationStore } from "@/store/useInvestigationStore";
import type { EntityType, PaginationMeta } from "@/types/common";
import type { FilterField } from "@/types/filters";
import type {
  GroupByOption,
  GroupedInvestigationItem,
} from "@/types/investigate";
import { downloadCsv } from "@/utils/exportCsv";
import {
  formatNumber,
  formatPercent,
  formatTimestamp,
} from "@/utils/formatters";

interface GroupedResultsTableProps {
  groupBy: GroupByOption;
  records: GroupedInvestigationItem[];
  pagination?: PaginationMeta;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}

const columnHelper = createColumnHelper<GroupedInvestigationItem>();

function mapGroupToEntityType(groupBy: GroupByOption): EntityType | null {
  switch (groupBy) {
    case "user":
      return "Employee";
    case "device":
      return "Device";
    case "ssid":
      return "SSID";
    case "location":
      return "Location";
    case "ap":
      return "AP";
    case "ap_mac":
      return "AP MAC";
    default:
      return null;
  }
}

function mapGroupToFilterField(groupBy: GroupByOption): FilterField | null {
  switch (groupBy) {
    case "user":
      return "employee_ids";
    case "device":
      return "user_macs";
    case "ssid":
      return "ssids";
    case "location":
      return "locations";
    case "ap":
      return "ap_hostnames";
    case "ap_mac":
      return "ap_macs";
    case "event":
      return "mnemonics";
    default:
      return null;
  }
}

export function GroupedResultsTable({
  groupBy,
  records,
  pagination,
  loading,
  error,
  onRetry,
}: GroupedResultsTableProps) {
  const openEntityDrawer = useAppStore((s) => s.openEntityDrawer);
  const page = useInvestigationStore((s) => s.page);
  const pageSize = useInvestigationStore((s) => s.pageSize);
  const sortBy = useInvestigationStore((s) => s.sortBy);
  const sortOrder = useInvestigationStore((s) => s.sortOrder);
  const setPage = useInvestigationStore((s) => s.setPage);
  const setPageSize = useInvestigationStore((s) => s.setPageSize);
  const setSort = useInvestigationStore((s) => s.setSort);
  const addCondition = useInvestigationStore((s) => s.addCondition);

  const entityType = mapGroupToEntityType(groupBy);
  const filterField = mapGroupToFilterField(groupBy);

  const columns = useMemo(
    () => [
      columnHelper.accessor("group_key", {
        header: `Group (${groupBy.toUpperCase()})`,
        cell: (info) => {
          const val = info.getValue();
          return entityType ? (
            <EntityLink
              type={entityType}
              value={val}
              mono={groupBy !== "ssid" && groupBy !== "location"}
              highlightUnknown={groupBy === "location"}
            />
          ) : (
            <span className="mono">{val}</span>
          );
        },
      }),
      columnHelper.accessor("users", {
        header: "Users",
        cell: (info) => (
          <span className="mono">{formatNumber(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("devices", {
        header: "Devices",
        cell: (info) => (
          <span className="mono">{formatNumber(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("total_events", {
        header: "Events",
        cell: (info) => (
          <span className="mono">{formatNumber(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("success_count", {
        header: "Success",
        cell: (info) => (
          <Typography
            variant="caption"
            className="mono"
            sx={{ color: "success.main", fontWeight: 600 }}
          >
            {formatNumber(info.getValue())}
          </Typography>
        ),
      }),
      columnHelper.accessor("failure_count", {
        header: "Failures",
        cell: (info) => (
          <Typography
            variant="caption"
            className="mono"
            sx={{
              color: info.getValue() > 0 ? "error.main" : "text.secondary",
              fontWeight: 600,
            }}
          >
            {formatNumber(info.getValue())}
          </Typography>
        ),
      }),
      columnHelper.accessor("unknown_count", {
        header: "Unknown",
        cell: (info) => (
          <Typography
            variant="caption"
            className="mono"
            sx={{
              color: info.getValue() > 0 ? "secondary.main" : "text.secondary",
            }}
          >
            {formatNumber(info.getValue())}
          </Typography>
        ),
      }),
      columnHelper.accessor("failure_rate", {
        header: "Fail Rate",
        cell: (info) => (
          <Typography
            variant="caption"
            className="mono"
            sx={{
              color: info.getValue() >= 20 ? "error.main" : "text.primary",
              fontWeight: 600,
            }}
          >
            {formatPercent(info.getValue(), 2)}
          </Typography>
        ),
      }),
      columnHelper.accessor("last_seen", {
        header: "Last Seen",
        cell: (info) => (
          <span className="mono" style={{ fontSize: "0.75rem" }}>
            {formatTimestamp(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) =>
          filterField ? (
            <Tooltip title={`Filter by ${info.row.original.group_key}`}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  addCondition(
                    filterField,
                    "equals",
                    info.row.original.group_key,
                  );
                }}
              >
                <FilterAltOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null,
      }),
    ],
    [addCondition, entityType, filterField, groupBy],
  );

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleSort = (colId: string) => {
    if (colId === "actions") return;
    if (sortBy === colId) {
      setSort(colId, sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSort(colId, "desc");
    }
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
        <FormControl size="small">
          <Select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            sx={{ height: 32, fontSize: "0.78rem" }}
          >
            {[25, 50, 100, 250].map((sz) => (
              <MenuItem key={sz} value={sz}>
                {sz} rows
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          size="small"
          variant="outlined"
          disabled={records.length === 0}
          startIcon={<DownloadOutlinedIcon fontSize="small" />}
          onClick={() =>
            downloadCsv(
              `wifi-grouped-${groupBy}-page-${page}.csv`,
              records as unknown as Array<Record<string, unknown>>,
              [
                { key: "group_key", label: `Group (${groupBy})` },
                { key: "users", label: "Users" },
                { key: "devices", label: "Devices" },
                { key: "total_events", label: "Events" },
                { key: "success_count", label: "Success" },
                { key: "failure_count", label: "Failures" },
                { key: "unknown_count", label: "Unknown" },
                { key: "failure_rate", label: "Failure Rate %" },
                { key: "last_seen", label: "Last Seen" },
              ],
            )
          }
        >
          Export CSV
        </Button>
      </Stack>

      <StateFrame
        loading={loading}
        error={error}
        empty={!loading && !error && records.length === 0}
        emptyTitle="No aggregated entities matched"
        emptyDescription="Relax or adjust filters in the Investigation Query Builder."
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
          <TableContainer sx={{ maxHeight: 540 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => {
                      const isSorted = sortBy === header.column.id;
                      return (
                        <TableCell
                          key={header.id}
                          onClick={() => handleSort(header.column.id)}
                          sx={{
                            cursor:
                              header.column.id === "actions"
                                ? "default"
                                : "pointer",
                            userSelect: "none",
                            whiteSpace: "nowrap",
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
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHead>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() => {
                      if (entityType) {
                        openEntityDrawer({
                          type: entityType,
                          value: row.original.group_key,
                        });
                      }
                    }}
                    sx={{ cursor: entityType ? "pointer" : "default" }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} sx={{ whiteSpace: "nowrap" }}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {pagination ? (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
              sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: "divider" }}
            >
              <Typography variant="caption" color="text.secondary" className="mono">
                {formatNumber(pagination.total_records)} groups · Page{" "}
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
