import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import {
  Box,
  Button,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
import type { RareUserItem, RareUsersResponse } from "@/types/dashboard";
import { downloadCsv } from "@/utils/exportCsv";
import { formatNumber, formatTimestamp } from "@/utils/formatters";
import { SectionHeader } from "./SectionHeader";

interface RareUsersSectionProps {
  data?: RareUsersResponse;
  loading: boolean;
  error: Error | null;
  page: number;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}

const columnHelper = createColumnHelper<RareUserItem>();

export function RareUsersSection({
  data,
  loading,
  error,
  page,
  onPageChange,
  onRetry,
}: RareUsersSectionProps) {
  const openEntityDrawer = useAppStore((s) => s.openEntityDrawer);
  const records = data?.records ?? [];

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
      columnHelper.accessor("appearance_count", {
        header: "Appearances",
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
        title="Rare Users"
        subtitle="Low-appearance employees across aggregated fleet telemetry"
        action={
          records.length > 0 ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadOutlinedIcon fontSize="small" />}
              onClick={() =>
                downloadCsv(
                  `rare-users-page-${page}.csv`,
                  records as unknown as Array<Record<string, unknown>>,
                  [
                    { key: "employee_id", label: "Employee ID" },
                    { key: "device_count", label: "Device Count" },
                    { key: "appearance_count", label: "Appearances" },
                    { key: "last_seen_timestamp", label: "Last Seen" },
                  ],
                )
              }
            >
              Export CSV
            </Button>
          ) : null
        }
      />

      <StateFrame
        loading={loading}
        error={error}
        empty={!loading && !error && records.length === 0}
        emptyTitle="No rare users found"
        emptyDescription="All mapped employees exceed the rare appearance threshold."
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

          {data?.pagination ? (
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
                {formatNumber(data.pagination.total_records)} rare users · Page{" "}
                {data.pagination.page} of {data.pagination.total_pages}
              </Typography>
              <Pagination
                size="small"
                count={Math.max(1, data.pagination.total_pages)}
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
