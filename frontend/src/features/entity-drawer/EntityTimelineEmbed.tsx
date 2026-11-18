import { Box, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { postInvestigationTimeline } from "@/api/investigate";
import { StateFrame } from "@/components/StateFrame";
import { useAppStore } from "@/store/useAppStore";
import { getTokens } from "@/theme/tokens";
import type { EntityRef } from "@/types/common";
import { createDefaultInvestigationRequest } from "@/utils/filterCompiler";
import { formatNumber, formatShortDate } from "@/utils/formatters";

interface EntityTimelineEmbedProps {
  entity: EntityRef;
}

export function EntityTimelineEmbed({ entity }: EntityTimelineEmbedProps) {
  const themeMode = useAppStore((s) => s.themeMode);
  const tokens = getTokens(themeMode);

  const requestBody = (() => {
    const base = createDefaultInvestigationRequest({ bucket: "day" });
    switch (entity.type) {
      case "Employee": {
        const id = Number(entity.value);
        if (Number.isInteger(id)) base.employee_ids = [id];
        break;
      }
      case "Device":
        base.user_macs = [entity.value];
        break;
      case "SSID":
        base.ssids = [entity.value];
        break;
      case "Location":
        base.locations = [entity.value];
        break;
      case "AP":
        base.ap_hostnames = [entity.value];
        break;
      case "AP MAC":
        base.ap_macs = [entity.value];
        break;
    }
    return base;
  })();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["entity-timeline", entity.type, entity.value],
    queryFn: ({ signal }) => postInvestigationTimeline(requestBody, signal),
    retry: false,
  });

  const points = data?.points ?? [];

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 1.5,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.default",
      }}
    >
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
        Activity Timeline (Daily)
      </Typography>
      <StateFrame
        loading={isLoading}
        error={error as Error | null}
        empty={points.length === 0}
        emptyTitle="No timeline points"
        emptyDescription="No historical events matched this entity."
        onRetry={() => void refetch()}
        skeletonHeight={180}
      >
        <Box sx={{ width: "100%", height: 185 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={points}
              margin={{ top: 6, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={tokens.gridLine}
                vertical={false}
              />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(v) => formatShortDate(String(v)).slice(0, 10)}
                tick={{ fill: tokens.textSecondary, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatNumber(Number(v))}
                tick={{ fill: tokens.textSecondary, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: tokens.surface,
                  border: `1px solid ${tokens.borderStrong}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="success_count"
                name="Success"
                stackId="1"
                stroke={tokens.success}
                fill={tokens.successMuted}
              />
              <Area
                type="monotone"
                dataKey="failure_count"
                name="Failure"
                stackId="1"
                stroke={tokens.fail}
                fill={tokens.failMuted}
              />
              <Area
                type="monotone"
                dataKey="unknown_count"
                name="Unknown"
                stackId="1"
                stroke={tokens.unknown}
                fill={tokens.unknownMuted}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </StateFrame>
    </Box>
  );
}
