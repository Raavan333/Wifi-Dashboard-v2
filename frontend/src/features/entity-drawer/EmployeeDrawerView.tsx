import {
  Box,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { fetchEmployeeDetails } from "@/api/investigate";
import { EntityLink } from "@/components/EntityLink";
import { KpiCard } from "@/components/KpiCard";
import { StateFrame } from "@/components/StateFrame";
import { formatNumber, formatTimestamp } from "@/utils/formatters";
import { EntityTimelineEmbed } from "./EntityTimelineEmbed";

export function EmployeeDrawerView({ employeeId }: { employeeId: string }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["entity-employee", employeeId],
    queryFn: ({ signal }) => fetchEmployeeDetails(employeeId, signal),
    retry: false,
  });

  const profile = data?.profile;

  return (
    <StateFrame
      loading={isLoading}
      error={error as Error | null}
      empty={!data || (!profile && data.devices.length === 0)}
      emptyTitle="Employee not found"
      emptyDescription={`No summary records matched employee ${employeeId}.`}
      onRetry={() => void refetch()}
      skeletonHeight={320}
    >
      {data ? (
        <Stack spacing={2.5}>
          {profile ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 1.5,
              }}
            >
              <KpiCard title="Devices" value={profile.total_devices} />
              <KpiCard
                title="Success Events"
                value={profile.total_success_count}
                tone="success"
              />
              <KpiCard
                title="Failure Events"
                value={profile.total_failure_count}
                tone="fail"
              />
            </Box>
          ) : null}

          {profile ? (
            <Typography variant="caption" color="text.secondary" className="mono">
              First seen: {formatTimestamp(profile.first_seen_timestamp)} · Last
              seen: {formatTimestamp(profile.last_seen_timestamp)}
            </Typography>
          ) : null}

          <EntityTimelineEmbed
            entity={{ type: "Employee", value: employeeId }}
          />

          <Stack spacing={1.5}>
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Locations ({data.locations.length})
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                {data.locations.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    None observed
                  </Typography>
                ) : (
                  data.locations.map((loc) => (
                    <EntityLink
                      key={loc}
                      type="Location"
                      value={loc}
                      highlightUnknown
                    />
                  ))
                )}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                SSIDs ({data.ssids.length})
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                {data.ssids.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    None observed
                  </Typography>
                ) : (
                  data.ssids.map((ssid) => (
                    <EntityLink key={ssid} type="SSID" value={ssid} mono />
                  ))
                )}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Access Points ({data.aps.length})
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                {data.aps.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    None observed
                  </Typography>
                ) : (
                  data.aps.map((ap) => (
                    <EntityLink key={ap} type="AP" value={ap} mono />
                  ))
                )}
              </Stack>
            </Box>
          </Stack>

          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Associated Devices ({data.devices.length})
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
                    <TableCell>MAC Address</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>AP</TableCell>
                    <TableCell align="right">Success</TableCell>
                    <TableCell align="right">Failure</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.devices.map((dev) => {
                    const mac = String(dev.user_mac ?? "");
                    return (
                      <TableRow key={mac} hover>
                        <TableCell>
                          <EntityLink type="Device" value={mac} mono />
                        </TableCell>
                        <TableCell>
                          <EntityLink
                            type="Location"
                            value={dev.location as string | null}
                            highlightUnknown
                          />
                        </TableCell>
                        <TableCell>
                          <EntityLink
                            type="AP"
                            value={dev.ap_hostname as string | null}
                            mono
                          />
                        </TableCell>
                        <TableCell align="right" className="tabular-nums">
                          {formatNumber(dev.total_success_count as number)}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums">
                          {formatNumber(dev.total_failure_count as number)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Box>
        </Stack>
      ) : null}
    </StateFrame>
  );
}
