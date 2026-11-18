import {
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { fetchLocationDetails } from "@/api/investigate";
import { EntityLink } from "@/components/EntityLink";
import { KpiCard } from "@/components/KpiCard";
import { StateFrame } from "@/components/StateFrame";
import { formatNumber, formatPercent, formatTimestamp } from "@/utils/formatters";
import { EntityTimelineEmbed } from "./EntityTimelineEmbed";

export function LocationDrawerView({ location }: { location: string }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["entity-location", location],
    queryFn: ({ signal }) => fetchLocationDetails(location, signal),
    retry: false,
  });

  const isUnknown = location.trim().toLowerCase() === "unknown";

  return (
    <StateFrame
      loading={isLoading}
      error={error as Error | null}
      empty={!data}
      emptyTitle="Location not found"
      onRetry={() => void refetch()}
      skeletonHeight={320}
    >
      {data ? (
        <Stack spacing={2.5}>
          {isUnknown ? (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                border: 1,
                borderColor: "warning.main",
                bgcolor: "background.default",
              }}
            >
              <Typography variant="caption" color="warning.main" fontWeight={600}>
                Unattributed Location Bucket (Unknown)
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.25 }}
              >
                Devices in this cohort lack physical site enrichment in{" "}
                <span className="mono">wifi_user_summary</span>.
              </Typography>
            </Box>
          ) : null}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 1.5,
            }}
          >
            <KpiCard title="Users" value={data.users} />
            <KpiCard title="Devices" value={data.devices} />
            <KpiCard
              title="Success"
              value={data.success_count}
              tone="success"
            />
            <KpiCard
              title="Failure Rate"
              value={data.failure_rate}
              decimals={2}
              suffix="%"
              tone={data.failure_rate >= 50 ? "fail" : "warning"}
            />
          </Box>

          <Typography variant="caption" color="text.secondary" className="mono">
            First seen: {formatTimestamp(data.first_seen)} · Last seen:{" "}
            {formatTimestamp(data.last_seen)}
          </Typography>

          <EntityTimelineEmbed
            entity={{ type: "Location", value: data.location }}
          />

          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Top SSIDs at Location ({data.top_ssids.length})
            </Typography>
            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1.5,
                overflowX: "auto",
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>SSID</TableCell>
                    <TableCell align="right">Users</TableCell>
                    <TableCell align="right">Devices</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.top_ssids.map((row) => (
                    <TableRow key={row.ssid} hover>
                      <TableCell>
                        <EntityLink type="SSID" value={row.ssid} mono />
                      </TableCell>
                      <TableCell align="right" className="tabular-nums">
                        {formatNumber(row.users)}
                      </TableCell>
                      <TableCell align="right" className="tabular-nums">
                        {formatNumber(row.devices)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Access Points at Location ({data.top_aps.length})
            </Typography>
            {data.top_aps.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No valid AP hostnames mapped to this location.
              </Typography>
            ) : (
              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1.5,
                  overflowX: "auto",
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>AP Hostname</TableCell>
                      <TableCell align="right">Users</TableCell>
                      <TableCell align="right">Devices</TableCell>
                      <TableCell align="right">Failure Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.top_aps.map((ap) => {
                      const total =
                        (ap.success_count ?? 0) + (ap.failure_count ?? 0);
                      const rate =
                        total > 0 ? ((ap.failure_count ?? 0) * 100) / total : 0;
                      return (
                        <TableRow key={ap.ap_hostname} hover>
                          <TableCell>
                            <EntityLink type="AP" value={ap.ap_hostname} mono />
                          </TableCell>
                          <TableCell align="right" className="tabular-nums">
                            {formatNumber(ap.users)}
                          </TableCell>
                          <TableCell align="right" className="tabular-nums">
                            {formatNumber(ap.devices)}
                          </TableCell>
                          <TableCell align="right" className="tabular-nums">
                            {formatPercent(rate)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        </Stack>
      ) : null}
    </StateFrame>
  );
}
