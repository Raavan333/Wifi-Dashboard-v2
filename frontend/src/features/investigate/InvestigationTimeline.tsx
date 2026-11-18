import {
  Box,
  FormControlLabel,
  Stack,
  Switch,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from "@mui/material";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StateFrame } from "@/components/StateFrame";
import { useInvestigationStore } from "@/store/useInvestigationStore";
import { getTokens } from "@/theme/tokens";
import type { TimelineBucket, TimelinePoint } from "@/types/investigate";
import { formatNumber, formatShortDate } from "@/utils/formatters";

interface InvestigationTimelineProps {
  points: TimelinePoint[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}

const BUCKET_OPTIONS: Array<{ value: TimelineBucket; label: string }> = [
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

export function InvestigationTimeline({
  points,
  loading,
  error,
  onRetry,
}: InvestigationTimelineProps) {
  const theme = useTheme();
  const tokens = getTokens(theme.palette.mode);

  const bucket = useInvestigationStore((s) => s.bucket);
  const setBucket = useInvestigationStore((s) => s.setBucket);
  const chartPreferences = useInvestigationStore((s) => s.chartPreferences);
  const setChartPreferences = useInvestigationStore(
    (s) => s.setChartPreferences,
  );
  const setTimeRangeFilter = useInvestigationStore((s) => s.setTimeRangeFilter);

  const bucketMs = useMemo(() => {
    switch (bucket) {
      case "hour":
        return 3600 * 1000;
      case "week":
        return 7 * 86400 * 1000;
      case "month":
        return 30 * 86400 * 1000;
      default:
        return 86400 * 1000;
    }
  }, [bucket]);

  const handlePointClick = (timestamp?: string) => {
    if (!timestamp) return;
    const start = new Date(timestamp);
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + bucketMs);
    setTimeRangeFilter(start.toISOString(), end.toISOString());
  };

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        spacing={1.5}
        mb={2}
      >
        <Stack spacing={0.25}>
          <Typography variant="subtitle2" fontWeight={700}>
            Event & Outcome Timeline
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Drag brush handles or click a bucket to zoom the investigation time window
          </Typography>
        </Stack>

        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
        >
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={chartPreferences.showRecoveryOverlay}
                onChange={(_, checked) =>
                  setChartPreferences({ showRecoveryOverlay: checked })
                }
              />
            }
            label={<Typography variant="caption">Appearances Overlay</Typography>}
            sx={{ mr: 0 }}
          />

          <Tabs
            value={chartPreferences.chartStyle}
            onChange={(_, style: "stacked_area" | "stacked_bar") =>
              setChartPreferences({ chartStyle: style })
            }
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
            <Tab value="stacked_area" label="Area" />
            <Tab value="stacked_bar" label="Bar" />
          </Tabs>

          <Tabs
            value={bucket}
            onChange={(_, next: TimelineBucket) => setBucket(next)}
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
            {BUCKET_OPTIONS.map((b) => (
              <Tab key={b.value} value={b.value} label={b.label} />
            ))}
          </Tabs>
        </Stack>
      </Stack>

      <StateFrame
        loading={loading}
        error={error}
        empty={!loading && !error && points.length === 0}
        emptyTitle="No timeline telemetry"
        emptyDescription="No events fall within the active filters and time bounds."
        onRetry={onRetry}
        skeletonHeight={260}
      >
        <Box sx={{ height: 290 }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartPreferences.chartStyle === "stacked_bar" ? (
              <BarChart
                data={points}
                margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                onClick={(state) => handlePointClick(state?.activeLabel)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={tokens.gridLine} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(v: string) => formatShortDate(v)}
                  tick={{ fill: tokens.textSecondary, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: tokens.textSecondary, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tokens.surfaceElevated,
                    border: `1px solid ${tokens.borderStrong}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [
                    formatNumber(value),
                    name,
                  ]}
                />
                <Bar
                  dataKey="success_count"
                  name="Success"
                  stackId="outcomes"
                  fill={tokens.success}
                />
                <Bar
                  dataKey="failure_count"
                  name="Failure"
                  stackId="outcomes"
                  fill={tokens.fail}
                />
                <Bar
                  dataKey="unknown_count"
                  name="Unknown"
                  stackId="outcomes"
                  fill={tokens.unknown}
                />
                {chartPreferences.showRecoveryOverlay ? (
                  <Bar
                    dataKey="appearance_count"
                    name="Total Appearances"
                    fill={tokens.accent}
                    fillOpacity={0.35}
                  />
                ) : null}
                <Brush
                  dataKey="timestamp"
                  height={22}
                  stroke={tokens.accent}
                  fill={tokens.surface}
                  tickFormatter={(v: string) => formatShortDate(v)}
                />
              </BarChart>
            ) : (
              <AreaChart
                data={points}
                margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                onClick={(state) => handlePointClick(state?.activeLabel)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={tokens.gridLine} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(v: string) => formatShortDate(v)}
                  tick={{ fill: tokens.textSecondary, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: tokens.textSecondary, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tokens.surfaceElevated,
                    border: `1px solid ${tokens.borderStrong}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [
                    formatNumber(value),
                    name,
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="success_count"
                  name="Success"
                  stackId="outcomes"
                  stroke={tokens.success}
                  fill={tokens.success}
                  fillOpacity={0.28}
                />
                <Area
                  type="monotone"
                  dataKey="failure_count"
                  name="Failure"
                  stackId="outcomes"
                  stroke={tokens.fail}
                  fill={tokens.fail}
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="unknown_count"
                  name="Unknown"
                  stackId="outcomes"
                  stroke={tokens.unknown}
                  fill={tokens.unknown}
                  fillOpacity={0.25}
                />
                {chartPreferences.showRecoveryOverlay ? (
                  <Area
                    type="monotone"
                    dataKey="appearance_count"
                    name="Total Appearances"
                    stroke={tokens.accent}
                    strokeDasharray="4 4"
                    fill="none"
                  />
                ) : null}
                <Brush
                  dataKey="timestamp"
                  height={22}
                  stroke={tokens.accent}
                  fill={tokens.surface}
                  tickFormatter={(v: string) => formatShortDate(v)}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </Box>
      </StateFrame>
    </Box>
  );
}
