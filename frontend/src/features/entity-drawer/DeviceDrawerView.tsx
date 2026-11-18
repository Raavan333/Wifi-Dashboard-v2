import { Box, Divider, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { fetchMacDetails } from "@/api/investigate";
import { EntityLink } from "@/components/EntityLink";
import { KpiCard } from "@/components/KpiCard";
import { StateFrame } from "@/components/StateFrame";
import { formatDurationText, formatTimestamp } from "@/utils/formatters";
import { EntityTimelineEmbed } from "./EntityTimelineEmbed";

export function DeviceDrawerView({ userMac }: { userMac: string }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["entity-mac", userMac],
    queryFn: ({ signal }) => fetchMacDetails(userMac, signal),
    retry: false,
  });

  return (
    <StateFrame
      loading={isLoading}
      error={error as Error | null}
      empty={!data}
      emptyTitle="Device MAC not found"
      emptyDescription={`No summary record matched MAC address ${userMac}.`}
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
            <KpiCard
              title="Appearances"
              value={data.total_appearance_count}
            />
            <KpiCard
              title="Success"
              value={data.total_success_count}
              tone="success"
            />
            <KpiCard
              title="Failures"
              value={data.total_failure_count}
              tone="fail"
            />
            <KpiCard
              title="Exclusions"
              value={data.total_exclusion_count}
              tone="warning"
            />
          </Box>

          <Box
            sx={{
              p: 2,
              borderRadius: 1.5,
              border: 1,
              borderColor: "divider",
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 1.25,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                Employee ID
              </Typography>
              <Box>
                <EntityLink type="Employee" value={data.employee_id} mono />
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Location
              </Typography>
              <Box>
                <EntityLink
                  type="Location"
                  value={data.location}
                  highlightUnknown
                />
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                AP Hostname
              </Typography>
              <Box>
                <EntityLink type="AP" value={data.ap_hostname} mono />
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                AP MAC
              </Typography>
              <Box>
                <EntityLink type="AP MAC" value={data.ap_mac} mono />
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Device IP / Asset ID
              </Typography>
              <Typography variant="body2" className="mono">
                {data.device_ip || "—"} / {data.asset_id || "—"}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Observed Duration · UX
              </Typography>
              <Typography variant="body2" className="mono">
                {formatDurationText(data.observed_duration)} ·{" "}
                {data.ux_available ? "UX Present" : "UX Missing"}
              </Typography>
            </Box>
          </Box>

          <Typography variant="caption" color="text.secondary" className="mono">
            First seen: {formatTimestamp(data.first_seen_timestamp)} · Last seen:{" "}
            {formatTimestamp(data.last_seen_timestamp)}
          </Typography>

          <EntityTimelineEmbed entity={{ type: "Device", value: data.user_mac }} />

          <Divider />

          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Observed SSIDs ({data.ssids.length})
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

          {data.aps.length > 0 ? (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                User&apos;s Observed APs ({data.aps.length})
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                {data.aps.map((ap) => (
                  <EntityLink key={ap} type="AP" value={ap} mono />
                ))}
              </Stack>
            </Box>
          ) : null}
        </Stack>
      ) : null}
    </StateFrame>
  );
}
