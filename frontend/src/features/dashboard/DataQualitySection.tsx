import { Box, Stack, Typography, useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "@/components/KpiCard";
import { useInvestigationStore } from "@/store/useInvestigationStore";
import { getTokens } from "@/theme/tokens";
import type { DataQualityResponse } from "@/types/dashboard";
import { formatNumber, formatPercent } from "@/utils/formatters";
import { SectionHeader } from "./SectionHeader";

interface DataQualitySectionProps {
  data: DataQualityResponse;
  refreshPulseKey: number;
}

export function DataQualitySection({
  data,
  refreshPulseKey,
}: DataQualitySectionProps) {
  const theme = useTheme();
  const tokens = getTokens(theme.palette.mode);
  const navigate = useNavigate();
  const replaceFilterConditions = useInvestigationStore(
    (s) => s.replaceFilterConditions,
  );

  const drillClassification = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes("valid")) {
      replaceFilterConditions(
        [{ field: "valid_users_only", operator: "is", value: "true" }],
        { groupBy: "device" },
      );
    } else if (l.includes("unmapped")) {
      replaceFilterConditions(
        [{ field: "unmapped_users_only", operator: "is", value: "true" }],
        { groupBy: "device" },
      );
    } else if (l.includes("invalid")) {
      replaceFilterConditions(
        [{ field: "invalid_devices_only", operator: "is", value: "true" }],
        { groupBy: "device" },
      );
    } else {
      replaceFilterConditions([], { groupBy: "device" });
    }
    navigate("/investigate");
  };

  const drillCompleteness = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes("ux")) {
      replaceFilterConditions(
        [{ field: "ux_available", operator: "is", value: "false" }],
        { groupBy: "device" },
      );
    } else if (l.includes("location")) {
      replaceFilterConditions(
        [{ field: "locations", operator: "equals", value: "Unknown" }],
        { groupBy: "location" },
      );
    } else if (l.includes("employee")) {
      replaceFilterConditions(
        [{ field: "unmapped_users_only", operator: "is", value: "true" }],
        { groupBy: "device" },
      );
    } else {
      replaceFilterConditions([], { groupBy: "device" });
    }
    navigate("/investigate");
  };

  const classificationColor = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes("valid")) return tokens.success;
    if (l.includes("invalid")) return tokens.fail;
    if (l.includes("unmapped")) return tokens.warning;
    return tokens.accent;
  };

  return (
    <Box component="section">
      <SectionHeader
        title="Data Quality & Completeness"
        subtitle={`Location Coverage ${formatPercent(data.location_coverage, 2)}${
          data.ap_coverage
            ? ` · AP Coverage ${formatPercent(data.ap_coverage.ap_coverage, 2)} (${formatNumber(data.ap_coverage.mapped_devices)} mapped)`
            : ""
        }`}
      />

      {data.metrics.length > 0 ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: `repeat(${Math.min(data.metrics.length, 5)}, minmax(0, 1fr))`,
            },
            gap: 2,
            mb: 2,
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
                tone={
                  lower.includes("missing") || lower.includes("unmapped")
                    ? "warning"
                    : "accent"
                }
                refreshPulseKey={refreshPulseKey}
                onClick={() => drillCompleteness(metric.title)}
              />
            );
          })}
        </Box>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1.35fr" },
          gap: 2,
        }}
      >
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
            {data.classification_chart.title}
          </Typography>
          <Box sx={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.classification_chart.items}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={56}
                  outerRadius={84}
                  paddingAngle={2}
                  onClick={(entry: { label?: string }) => {
                    if (entry?.label) drillClassification(entry.label);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {data.classification_chart.items.map((item) => (
                    <Cell
                      key={item.label}
                      fill={classificationColor(item.label)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: tokens.surfaceElevated,
                    border: `1px solid ${tokens.borderStrong}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [formatNumber(value), "Devices"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>
          <Stack spacing={0.75} mt={1}>
            {data.classification_chart.items.map((item) => (
              <Box
                key={item.label}
                component="button"
                type="button"
                onClick={() => drillClassification(item.label)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  background: "none",
                  border: 0,
                  py: 0.4,
                  px: 0.75,
                  borderRadius: 1,
                  cursor: "pointer",
                  color: "text.primary",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "2px",
                      bgcolor: classificationColor(item.label),
                    }}
                  />
                  <Typography variant="caption" fontWeight={500}>
                    {item.label}
                  </Typography>
                </Stack>
                <Typography
                  variant="caption"
                  className="mono"
                  color="text.secondary"
                >
                  {formatNumber(item.value)} · {formatPercent(item.percentage, 1)}
                </Typography>
              </Box>
            ))}
          </Stack>
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
            {data.completeness_chart.title}
          </Typography>
          <Box sx={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.completeness_chart.items}
                layout="vertical"
                margin={{ top: 8, right: 20, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={tokens.gridLine}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fill: tokens.textSecondary, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={150}
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
                  formatter={(value: number) => [`${value.toFixed(2)}%`, "Coverage"]}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  onClick={(entry: { label?: string }) => {
                    if (entry?.label) drillCompleteness(entry.label);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {data.completeness_chart.items.map((item) => (
                    <Cell
                      key={item.label}
                      fill={
                        item.value >= 90
                          ? tokens.success
                          : item.value >= 60
                            ? tokens.accent
                            : tokens.warning
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
