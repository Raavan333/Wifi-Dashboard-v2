import { Box, Divider, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { fetchApDetails } from "@/api/investigate";
import { EntityLink } from "@/components/EntityLink";
import { KpiCard } from "@/components/KpiCard";
import { StateFrame } from "@/components/StateFrame";
import { formatTimestamp } from "@/utils/formatters";
import { EntityTimelineEmbed } from "./EntityTimelineEmbed";

export function ApDrawerView({ apHostname }: { apHostname: string }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["entity-ap", apHostname],
    queryFn: ({ signal }) => fetchApDetails(apHostname, signal),
    retry: false,
  });

  return (
    <StateFrame
      loading={isLoading}
      error={error as Error | null}
      empty={!data}
      emptyTitle="Access Point not found"
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
              title="Failures"
              value={data.failure_count}
              tone="fail"
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
            entity={{ type: "AP", value: data.ap_hostname }}
          />

          <Stack spacing={1.5}>
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                AP MAC Addresses ({data.ap_macs.length})
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                {data.ap_macs.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    None observed
                  </Typography>
                ) : (
                  data.ap_macs.map((mac) => (
                    <EntityLink key={mac} type="AP MAC" value={mac} mono />
                  ))
                )}
              </Stack>
            </Box>

            <Divider />

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
                Broadcasted SSIDs ({data.ssids.length})
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                {data.ssids.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    None observed
                  </Typography>
                ) : (
                  data.ssids.map((s) => (
                    <EntityLink key={s} type="SSID" value={s} mono />
                  ))
                )}
              </Stack>
            </Box>
          </Stack>
        </Stack>
      ) : null}
    </StateFrame>
  );
}
