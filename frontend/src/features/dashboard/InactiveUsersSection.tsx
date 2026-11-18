import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import {
  Box,
  Button,
  Pagination,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { EntityLink } from "@/components/EntityLink";
import { StateFrame } from "@/components/StateFrame";
import { useAppStore } from "@/store/useAppStore";
import type { InactiveUserItem, InactiveUsersResponse } from "@/types/dashboard";
import { downloadCsv } from "@/utils/exportCsv";
import { formatNumber, formatTimestamp } from "@/utils/formatters";
import { SectionHeader } from "./SectionHeader";

interface InactiveUsersSectionProps {
  data?: InactiveUsersResponse;
  loading: boolean;
  error: Error | null;
  page: number;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}

type InactiveWindow = "7d" | "30d" | "90d";

const columnHelper = createColumnHelper<InactiveUserItem>();

export function InactiveUsersSection({
  data,
  loading,
  error,
  page,
  onPageChange,
  onRetry,
}: InactiveUsersSectionProps) {
  const [windowTab, setWindowTab] = useState<InactiveWindow>("7d");
  const openEntityDrawer = useAppStore((s) => s.openEntityDrawer);

  const records = useMemo(() => {
    if (!data) return [];
    if (windowTab === "30d") return data.inactive_30d;
    if (windowTab === "90d") return data.inactive_90d;
    return data.inactive_7d;
  }, [data, windowTab]);

  const paginationMeta = useMemo(() => {
    if (!data?.pagination) return null;
    const keyCandidates = [
      windowTab,
      `inactive_${windowTab}`,
      windowTab === "7d" ? "7" : windowTab === "30d" ? "30" : "90",
    ];
    for (const k of keyCandidates) {
      if (data.pagination[k]) return data.pagination[k];
    }
    const firstKey = Object.keys(data.pagination)[0];
    return firstKey ? data.pagination[firstKey] : null;
  }, [data, windowTab]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("employee_id", {
        header: "Employee ID",
        cell: (info) => (
          <EntityLink type="Employee" value={info.getValue()} mono />
        ),
      }),
      columnHelper.accessor("device_count", {
        header: "Devices",
        cell: (info) => (
          <span className="mono">{formatNumber(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("last_seen_timestamp", {
        header: "Last Seen",
        cell: (info) => (
          <span className="mono">{formatTimestamp(info.getValue())}</span>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Box component="section">
      <SectionHeader
        title="Inactive Users"
        subtitle="Employees with no observed WiFi telemetry within the selected threshold window"
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Tabs
              value={windowTab}
              onChange={(_, v: InactiveWindow) => setWindowTab(v)}
              sx={{
                minHeight: 34,
                border: 1,
                borderColor: "divider",
                borderRadius: 1.5,
                "& .MuiTab-root": {
                  minHeight: 34,
                  py: 0.5,
                  px: 1.5,
                  fontSize: "0.78rem",
                },
              }}
            >
              <Tab value="7d" label="7 Days" />
              <Tab value="30d" label="30 Days" />
              <Tab value="90d" label="90 Days" />
            </Tabs>
            {records.length > 0 ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadOutlinedIcon fontSize="small" />}
                onClick={() =>
                  downloadCsv(
                    `inactive-users-${windowTab}-page-${page}.csv`,
                    records as unknown as Array<Record<string, unknown>>,
                    [
                      { key: "employee_id", label: "Employee ID" },
                      { key: "device_count", label: "Device Count" },
                      { key: "last_seen_timestamp", label: "Last Seen" },
                    ],
                  )
                }
              >
                Export CSV
              </Button>
            ) : null}
          </Stack>
        }
      />

      <StateFrame
        loading={loading}
        error={error}
        empty={!loading && !error && records.length === 0}
        emptyTitle={`No users inactive for ${windowTab}`}
        emptyDescription="All tracked employees were seen more recently than this threshold."
        onRetry={onRetry}
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
          <TableContainer sx={{ maxHeight: 380 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableCell key={header.id}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableHead>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() =>
                      openEntityDrawer({
                        type: "Employee",
                        value: String(row.original.employee_id),
                      })
                    }
                    sx={{ cursor: "pointer" }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
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

          {paginationMeta ? (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
              sx={{
                px: 2,
                py: 1.25,
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              <Typography variant="caption" color="text.secondary" className="mono">
                {formatNumber(paginationMeta.total_records)} users · Page{" "}
                {paginationMeta.page} of {paginationMeta.total_pages}
              </Typography>
              <Pagination
                size="small"
                count={Math.max(1, paginationMeta.total_pages)}
                page={page}
                onChange={(_, p) => onPageChange(p)}
              />
            </Stack>
          ) : null}
        </Box>
      </StateFrame>
    </Box>
  );
}
