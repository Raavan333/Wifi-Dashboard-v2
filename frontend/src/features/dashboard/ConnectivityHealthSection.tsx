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
import type { ConnectivityHealthResponse } from "@/types/dashboard";
import type { FilterField, FilterOperator } from "@/types/filters";
import { formatNumber, formatPercent } from "@/utils/formatters";
import { SectionHeader } from "./SectionHeader";

interface ConnectivityHealthSectionProps {
  data: ConnectivityHealthResponse;
  refreshPulseKey: number;
}

function getSliceDrilldown(
  label: string,
): Array<{ field: FilterField; operator?: FilterOperator; value: string }> {
  const norm = label.toLowerCase();
  if (norm === "success") {
    return [{ field: "statuses", operator: "equals", value: "SUCCESS" }];
  }
  if (norm === "failure" || norm === "fail") {
    return [{ field: "statuses", operator: "equals", value: "FAIL" }];
  }
  if (norm === "unknown") {
    return [{ field: "statuses", operator: "equals", value: "UNKNOWN" }];
  }
  if (norm.includes("recovered") && !norm.includes("not") && !norm.includes("never") && !norm.includes("unrecovered")) {
    return [{ field: "recovered_only", operator: "is", value: "true" }];
  }
  if (norm.includes("not recovered") || norm.includes("unrecovered")) {
    return [
      { field: "failure_count", operator: "gte", value: "1" },
      { field: "success_count", operator: "lte", value: "0" },
    ];
  }
  if (norm.includes("success only")) {
    return [
      { field: "success_count", operator: "gte", value: "1" },
      { field: "failure_count", operator: "lte", value: "0" },
    ];
  }
  if (norm.includes("success & fail") || norm.includes("mixed")) {
    return [
      { field: "success_count", operator: "gte", value: "1" },
      { field: "failure_count", operator: "gte", value: "1" },
    ];
  }
  if (norm.includes("failure only") || norm.includes("fail only")) {
    return [
      { field: "failure_count", operator: "gte", value: "1" },
      { field: "success_count", operator: "lte", value: "0" },
    ];
  }
  if (norm.includes("unknown only")) {
    return [
      { field: "success_count", operator: "lte", value: "0" },
      { field: "failure_count", operator: "lte", value: "0" },
    ];
  }
  return [];
}

export function ConnectivityHealthSection({
  data,
  refreshPulseKey,
}: ConnectivityHealthSectionProps) {
  const theme = useTheme();
  const tokens = getTokens(theme.palette.mode);
  const navigate = useNavigate();
  const replaceFilterConditions = useInvestigationStore(
    (s) => s.replaceFilterConditions,
  );

  const colorForLabel = (label: string): string => {
    const l = label.toLowerCase();
    if (l === "success" || l === "recovered" || l === "success only") {
      return tokens.success;
    }
    if (
      l === "failure" ||
      l === "fail" ||
      l === "failure only" ||
      l === "fail only" ||
      l === "not recovered" ||
      l === "unrecovered"
    ) {
      return tokens.fail;
    }
    if (l.includes("success &") || l.includes("mixed")) {
      return tokens.warning;
    }
    if (l.includes("unknown")) {
      return tokens.unknown;
    }
    return tokens.accent;
  };

  const drill = (label: string, groupByDevice = false) => {
    const conditions = getSliceDrilldown(label);
    replaceFilterConditions(conditions, {
      groupBy: groupByDevice ? "device" : null,
    });
    navigate("/investigate");
  };

  return (
    <Box component="section">
      <SectionHeader
        title="Connectivity Health"
        subtitle="Authentication outcomes, failure recovery rates, and device outcome cohorts (click any slice or bar to drill in)"
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
          {data.metrics.map((metric) => {
            const lower = metric.title.toLowerCase();
            const tone = lower.includes("fail")
              ? "fail"
              : lower.includes("recover") || lower.includes("success")
                ? "success"
                : "accent";
            return (
              <KpiCard
                key={metric.title}
                title={metric.title}
                value={metric.value}
                subtitle={metric.subtitle}
                tone={tone}
                refreshPulseKey={refreshPulseKey}
                onClick={() => {
                  if (lower.includes("recover")) drill("Recovered", true);
                  else if (lower.includes("fail")) drill("Failure");
                  else if (lower.includes("success")) drill("Success");
                  else drill("");
                }}
              />
            );
          })}
        </Box>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" },
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
            {data.success_failure_chart.title}
          </Typography>
          <Box sx={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.success_failure_chart.items}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={56}
                  outerRadius={84}
                  paddingAngle={2}
                  onClick={(entry: { label?: string }) => {
                    if (entry?.label) drill(entry.label);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {data.success_failure_chart.items.map((item) => (
                    <Cell key={item.label} fill={colorForLabel(item.label)} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: tokens.surfaceElevated,
                    border: `1px solid ${tokens.borderStrong}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [formatNumber(value), "Events"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>
          <Stack spacing={0.75} mt={1}>
            {data.success_failure_chart.items.map((item) => (
              <Box
                key={item.label}
                component="button"
                type="button"
                onClick={() => drill(item.label)}
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
                      bgcolor: colorForLabel(item.label),
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
            {data.recovery_chart.title}
          </Typography>
          <Box sx={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.recovery_chart.items}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={56}
                  outerRadius={84}
                  paddingAngle={2}
                  onClick={(entry: { label?: string }) => {
                    if (entry?.label) drill(entry.label, true);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {data.recovery_chart.items.map((item) => (
                    <Cell key={item.label} fill={colorForLabel(item.label)} />
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
            {data.recovery_chart.items.map((item) => (
              <Box
                key={item.label}
                component="button"
                type="button"
                onClick={() => drill(item.label, true)}
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
                      bgcolor: colorForLabel(item.label),
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
            {data.outcome_distribution.title}
          </Typography>
          <Box sx={{ height: 270 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.outcome_distribution.items}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
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
                  formatter={(value: number) => [formatNumber(value), "Devices"]}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  onClick={(entry: { label?: string }) => {
                    if (entry?.label) drill(entry.label, true);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {data.outcome_distribution.items.map((item) => (
                    <Cell key={item.label} fill={colorForLabel(item.label)} />
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
