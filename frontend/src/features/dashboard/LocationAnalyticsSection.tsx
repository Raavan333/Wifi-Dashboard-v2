import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "@/components/KpiCard";
import { useAppStore } from "@/store/useAppStore";
import { useInvestigationStore } from "@/store/useInvestigationStore";
import { getTokens } from "@/theme/tokens";
import type { LocationOverviewResponse } from "@/types/dashboard";
import { formatNumber, formatPercent } from "@/utils/formatters";
import { isUnknownLocation } from "@/utils/normalization";
import { SectionHeader } from "./SectionHeader";

interface LocationAnalyticsSectionProps {
  data: LocationOverviewResponse;
  refreshPulseKey: number;
}

export function LocationAnalyticsSection({
  data,
  refreshPulseKey,
}: LocationAnalyticsSectionProps) {
  const theme = useTheme();
  const tokens = getTokens(theme.palette.mode);
  const navigate = useNavigate();
  const openEntityDrawer = useAppStore((s) => s.openEntityDrawer);
  const replaceFilterConditions = useInvestigationStore(
    (s) => s.replaceFilterConditions,
  );

  const hasUnknown =
    data.user_distribution.items.some((i) => isUnknownLocation(i.label)) ||
    data.device_distribution.items.some((i) => isUnknownLocation(i.label));

  return (
    <Box component="section">
      <SectionHeader
        title="Location Analytics"
        subtitle={`Campus & building distribution · Location Coverage ${formatPercent(data.location_coverage, 2)}`}
        action={
          hasUnknown ? (
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{
                px: 1.25,
                py: 0.5,
                borderRadius: 1,
                border: 1,
                borderColor: "warning.main",
                color: "warning.main",
              }}
            >
              <WarningAmberOutlinedIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" fontWeight={600}>
                Unmapped &quot;Unknown&quot; location traffic highlighted
              </Typography>
            </Stack>
          ) : null
        }
      />

      {data.metrics.length > 0 ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: `repeat(${Math.min(data.metrics.length + 1, 4)}, minmax(0, 1fr))`,
            },
            gap: 2,
            mb: 2,
          }}
        >
          <KpiCard
            title="Location Coverage"
            value={data.location_coverage}
            decimals={2}
            suffix="%"
            subtitle="Devices with resolved building / site location"
            tone={data.location_coverage >= 90 ? "success" : "warning"}
            refreshPulseKey={refreshPulseKey}
            onClick={() => {
              replaceFilterConditions(
                [{ field: "locations", operator: "equals", value: "Unknown" }],
                { groupBy: "location" },
              );
              navigate("/investigate");
            }}
          />
          {data.metrics.map((metric) => (
            <KpiCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              subtitle={metric.subtitle}
              tone="accent"
              refreshPulseKey={refreshPulseKey}
              onClick={() => {
                replaceFilterConditions([], { groupBy: "location" });
                navigate("/investigate");
              }}
            />
          ))}
        </Box>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
          gap: 2,
        }}
      >
        {[
          { chart: data.user_distribution, unit: "Users" },
          { chart: data.device_distribution, unit: "Devices" },
        ].map(({ chart, unit }) => (
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
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chart.items}
                  layout="vertical"
                  margin={{ top: 6, right: 16, left: 6, bottom: 6 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={tokens.gridLine}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: tokens.textSecondary, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={120}
                    tick={{ fill: tokens.textPrimary, fontSize: 11 }}
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
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    onClick={(entry: { label?: string }) => {
                      if (entry?.label) {
                        openEntityDrawer({
                          type: "Location",
                          value: entry.label,
                        });
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {chart.items.map((item) => (
                      <Cell
                        key={item.label}
                        fill={
                          isUnknownLocation(item.label)
                            ? tokens.warning
                            : tokens.accent
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
