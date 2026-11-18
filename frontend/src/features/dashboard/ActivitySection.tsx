import { Box, Typography, useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "@/components/KpiCard";
import { useInvestigationStore } from "@/store/useInvestigationStore";
import { getTokens } from "@/theme/tokens";
import type { UserActivityResponse } from "@/types/dashboard";
import { formatNumber, formatShortDate } from "@/utils/formatters";
import { SectionHeader } from "./SectionHeader";

interface ActivitySectionProps {
  data: UserActivityResponse;
  refreshPulseKey: number;
}

export function ActivitySection({
  data,
  refreshPulseKey,
}: ActivitySectionProps) {
  const theme = useTheme();
  const tokens = getTokens(theme.palette.mode);
  const navigate = useNavigate();
  const replaceFilterConditions = useInvestigationStore(
    (s) => s.replaceFilterConditions,
  );

  return (
    <Box component="section">
      <SectionHeader
        title="Activity & Longitudinal Trends"
        subtitle="New onboarding velocity, active user trendlines, and observed device lifetime distribution"
      />

      {data.metrics.length > 0 ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: `repeat(${Math.min(data.metrics.length, 4)}, minmax(0, 1fr))`,
            },
            gap: 2,
            mb: 2,
          }}
        >
          {data.metrics.map((metric) => (
            <KpiCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              subtitle={metric.subtitle}
              tone="accent"
              refreshPulseKey={refreshPulseKey}
            />
          ))}
        </Box>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" },
          gap: 2,
        }}
      >
        {[
          {
            chart: data.new_user_trend,
            color: tokens.success,
            unit: "New Users",
            filterField: "first_seen" as const,
          },
          {
            chart: data.active_user_trend,
            color: tokens.accent,
            unit: "Active Users",
            filterField: "last_seen" as const,
          },
        ].map(({ chart, color, unit, filterField }) => (
          <Box
            key={chart.title}
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              {chart.title}
            </Typography>
            <Box sx={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chart.items}
                  margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                  onClick={(state) => {
                    const label = state?.activeLabel;
                    if (!label) return;
                    const dayStart = new Date(label);
                    if (Number.isNaN(dayStart.getTime())) return;
                    const dayEnd = new Date(dayStart.getTime() + 86400 * 1000);
                    replaceFilterConditions(
                      [
                        {
                          field: filterField,
                          operator: "after",
                          value: dayStart.toISOString(),
                        },
                        {
                          field: filterField,
                          operator: "before",
                          value: dayEnd.toISOString(),
                        },
                      ],
                      { groupBy: "user" },
                    );
                    navigate("/investigate");
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={tokens.gridLine} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(v: string) => formatShortDate(v).slice(0, 10)}
                    tick={{ fill: tokens.textSecondary, fontSize: 10 }}
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
                    formatter={(value: number) => [formatNumber(value), unit]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        ))}

        <Box
          sx={{
            p: 2.5,
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} mb={1}>
            {data.duration_distribution.title}
          </Typography>
          <Box sx={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.duration_distribution.items}
                margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={tokens.gridLine}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
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
                  formatter={(value: number) => [formatNumber(value), "Devices"]}
                />
                <Bar
                  dataKey="value"
                  fill={tokens.unknown}
                  radius={[4, 4, 0, 0]}
                  onClick={() => {
                    replaceFilterConditions([], { groupBy: "device" });
                    navigate("/investigate");
                  }}
                  style={{ cursor: "pointer" }}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
