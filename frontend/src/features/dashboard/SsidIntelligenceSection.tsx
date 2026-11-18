import { Box, Stack, Typography, useTheme } from "@mui/material";
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
import { EntityLink } from "@/components/EntityLink";
import { KpiCard } from "@/components/KpiCard";
import { useAppStore } from "@/store/useAppStore";
import { useInvestigationStore } from "@/store/useInvestigationStore";
import { getTokens } from "@/theme/tokens";
import type { SSIDIntelligenceResponse } from "@/types/dashboard";
import { formatNumber, formatPercent } from "@/utils/formatters";
import { SectionHeader } from "./SectionHeader";

interface SsidIntelligenceSectionProps {
  data: SSIDIntelligenceResponse;
  refreshPulseKey: number;
}

export function SsidIntelligenceSection({
  data,
  refreshPulseKey,
}: SsidIntelligenceSectionProps) {
  const theme = useTheme();
  const tokens = getTokens(theme.palette.mode);
  const navigate = useNavigate();
  const openEntityDrawer = useAppStore((s) => s.openEntityDrawer);
  const replaceFilterConditions = useInvestigationStore(
    (s) => s.replaceFilterConditions,
  );

  const inspectSsid = (ssid: string) => {
    openEntityDrawer({ type: "SSID", value: ssid });
  };

  const drillSsidFail = (ssid: string) => {
    replaceFilterConditions(
      [
        { field: "ssids", operator: "equals", value: ssid },
        { field: "statuses", operator: "equals", value: "FAIL" },
      ],
      { groupBy: "device" },
    );
    navigate("/investigate");
  };

  return (
    <Box component="section">
      <SectionHeader
        title="SSID Intelligence"
        subtitle="Wireless network adoption, multi-SSID roaming combinations, and SSID failure telemetry"
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
              onClick={() => {
                replaceFilterConditions([], { groupBy: "ssid" });
                navigate("/investigate");
              }}
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
            {data.user_distribution.title}
          </Typography>
          <Box sx={{ height: 270 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.user_distribution.items}
                layout="vertical"
                margin={{ top: 6, right: 16, left: 4, bottom: 6 }}
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
                  width={110}
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
                  formatter={(value: number) => [formatNumber(value), "Users"]}
                />
                <Bar
                  dataKey="value"
                  fill={tokens.accent}
                  radius={[0, 4, 4, 0]}
                  onClick={(entry: { label?: string }) => {
                    if (entry?.label) inspectSsid(entry.label);
                  }}
                  style={{ cursor: "pointer" }}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
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
            {data.ssid_combinations.title}
          </Typography>
          <Box sx={{ height: 270 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.ssid_combinations.items.slice(0, 8)}
                layout="vertical"
                margin={{ top: 6, right: 16, left: 4, bottom: 6 }}
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
                  width={130}
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
                  fill={tokens.unknown}
                  radius={[0, 4, 4, 0]}
                  onClick={(entry: { label?: string }) => {
                    if (entry?.label) {
                      const firstSsid = entry.label.split(/[,+]/)[0]?.trim();
                      if (firstSsid) inspectSsid(firstSsid);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        <Box
          sx={{
            p: 2.5,
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} mb={1}>
            {data.failure_distribution.title}
          </Typography>
          {!data.failure_distribution.available ||
          data.failure_distribution.items.length === 0 ? (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                p: 2,
                borderRadius: 1.5,
                bgcolor: "action.hover",
                border: 1,
                borderColor: "divider",
              }}
            >
              <Typography variant="body2" fontWeight={600} gutterBottom>
                SSID Failure Breakdown Unavailable
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {data.failure_distribution.message ||
                  "Per-SSID failure telemetry is not available in the aggregated summary table."}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1} sx={{ flex: 1, overflowY: "auto" }}>
              {data.failure_distribution.items.map((item) => (
                <Box
                  key={item.ssid}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    p: 1,
                    borderRadius: 1,
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  <EntityLink type="SSID" value={item.ssid} />
                  <Box
                    component="button"
                    type="button"
                    onClick={() => drillSsidFail(item.ssid)}
                    sx={{
                      background: "none",
                      border: 0,
                      p: 0,
                      cursor: "pointer",
                      color: "error.main",
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: "0.78rem",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    {formatNumber(item.failure_count)} ·{" "}
                    {formatPercent(item.failure_rate, 1)}
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
}
