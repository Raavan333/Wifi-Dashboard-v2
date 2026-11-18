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
import { fetchSsidDetails } from "@/api/investigate";
import { EntityLink } from "@/components/EntityLink";
import { KpiCard } from "@/components/KpiCard";
import { StateFrame } from "@/components/StateFrame";
import { formatNumber, formatTimestamp } from "@/utils/formatters";
import { EntityTimelineEmbed } from "./EntityTimelineEmbed";

export function SsidDrawerView({ ssid }: { ssid: string }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["entity-ssid", ssid],
    queryFn: ({ signal }) => fetchSsidDetails(ssid, signal),
    retry: false,
  });

  return (
    <StateFrame
      loading={isLoading}
      error={error as Error | null}
      empty={!data}
      emptyTitle="SSID not found"
      onRetry={() => void refetch()}
      skeletonHeight={320}
    >
      {data ? (
        <Stack spacing={2.5}>
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

          <EntityTimelineEmbed entity={{ type: "SSID", value: data.ssid }} />

          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Locations ({data.locations.length})
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
                    <TableCell>Location</TableCell>
                    <TableCell align="right">Users</TableCell>
                    <TableCell align="right">Devices</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.locations.map((loc) => (
                    <TableRow key={loc.location} hover>
                      <TableCell>
                        <EntityLink
                          type="Location"
                          value={loc.location}
                          highlightUnknown
                        />
                      </TableCell>
                      <TableCell align="right" className="tabular-nums">
                        {formatNumber(loc.users)}
                      </TableCell>
                      <TableCell align="right" className="tabular-nums">
                        {formatNumber(loc.devices)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Access Points ({data.aps.length})
            </Typography>
            {data.aps.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No valid AP hostnames mapped to this SSID.
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.aps.map((ap) => (
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
                      </TableRow>
                    ))}
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
