import { Box, Typography, useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "@/components/KpiCard";
import { useInvestigationStore } from "@/store/useInvestigationStore";
import { getTokens } from "@/theme/tokens";
import type { UserPopulationResponse } from "@/types/dashboard";
import type { FilterField, FilterOperator } from "@/types/filters";
import { formatNumber } from "@/utils/formatters";
import { SectionHeader } from "./SectionHeader";

interface UserPopulationSectionProps {
  data: UserPopulationResponse;
  refreshPulseKey: number;
}

export function UserPopulationSection({
  data,
  refreshPulseKey,
}: UserPopulationSectionProps) {
  const theme = useTheme();
  const tokens = getTokens(theme.palette.mode);
  const navigate = useNavigate();
  const replaceFilterConditions = useInvestigationStore(
    (s) => s.replaceFilterConditions,
  );

  const drillMetric = (title: string) => {
    const lower = title.toLowerCase();
    const conditions: Array<{
      field: FilterField;
      operator?: FilterOperator;
      value: string;
    }> = [];
    if (lower.includes("multi")) {
      conditions.push({
        field: "multi_device_users_only",
        operator: "is",
        value: "true",
      });
    } else if (lower.includes("valid")) {
      conditions.push({
        field: "valid_users_only",
        operator: "is",
        value: "true",
      });
    } else if (lower.includes("7d") || lower.includes("7 day")) {
      const since = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
      conditions.push({ field: "last_seen", operator: "after", value: since });
    } else if (lower.includes("30d") || lower.includes("30 day")) {
      const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
      conditions.push({ field: "last_seen", operator: "after", value: since });
    } else if (lower.includes("90d") || lower.includes("90 day")) {
      const since = new Date(Date.now() - 90 * 86400 * 1000).toISOString();
      conditions.push({ field: "last_seen", operator: "after", value: since });
    }
    replaceFilterConditions(conditions, {
      groupBy: lower.includes("mac") || lower.includes("device") ? "device" : "user",
    });
    navigate("/investigate");
  };

  return (
    <Box component="section">
      <SectionHeader
        title="User & Device Population"
        subtitle="Valid employee adoption, multi-device footprint, and rolling device activity windows"
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1.1fr 1fr" },
          gap: 2,
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          {data.metrics.map((metric) => {
            const lower = metric.title.toLowerCase();
            return (
              <KpiCard
                key={metric.title}
                title={metric.title}
                value={metric.value}
                subtitle={metric.subtitle}
                tone={lower.includes("multi") ? "warning" : "accent"}
                refreshPulseKey={refreshPulseKey}
                onClick={() => drillMetric(metric.title)}
              />
            );
          })}
        </Box>

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
            {data.device_distribution.title}
          </Typography>
          <Box sx={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.device_distribution.items}
                margin={{ top: 10, right: 12, left: 0, bottom: 10 }}
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
                  formatter={(value: number) => [formatNumber(value), "Users"]}
                />
                <Bar
                  dataKey="value"
                  fill={tokens.accent}
                  radius={[4, 4, 0, 0]}
                  onClick={() => drillMetric("Multi Device Users")}
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
