import { Box, Skeleton, Typography } from "@mui/material";
import { KpiCard } from "@/components/KpiCard";
import type { InvestigationSummary } from "@/types/investigate";
import { formatNumber } from "@/utils/formatters";

interface InvestigationSummaryRibbonProps {
  data?: InvestigationSummary;
  loading: boolean;
  error: Error | null;
}

export function InvestigationSummaryRibbon({
  data,
  loading,
  error,
}: InvestigationSummaryRibbonProps) {
  if (loading && !data) {
    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(6, minmax(0, 1fr))",
          },
          gap: 1.5,
        }}
      >
        {Array.from({ length: 6 }).map((_, idx) => (
          <Skeleton key={idx} variant="rounded" height={96} />
        ))}
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="caption" color="error.main">
          {error?.message || "Cohort summary unavailable."}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(6, minmax(0, 1fr))",
        },
        gap: 1.5,
      }}
    >
      <KpiCard
        title="Matching Devices"
        value={data.total_devices}
        tone="accent"
        subtitle="Unique MACs in scope"
      />
      <KpiCard
        title="Matching Users"
        value={data.total_users}
        tone="neutral"
        subtitle={`${formatNumber(data.valid_users)} valid · ${formatNumber(data.invalid_users)} invalid`}
      />
      <KpiCard
        title="Valid Users"
        value={data.valid_users}
        tone="success"
        subtitle="Mapped employee IDs"
      />
      <KpiCard
        title="Success Rate"
        value={data.success_rate}
        decimals={2}
        suffix="%"
        tone="success"
        subtitle="Successful auth ratio"
      />
      <KpiCard
        title="Failure Rate"
        value={data.failure_rate}
        decimals={2}
        suffix="%"
        tone={data.failure_rate >= 15 ? "fail" : "warning"}
        subtitle="Failed auth ratio"
      />
      <KpiCard
        title="Recovery Rate"
        value={data.recovery_rate}
        decimals={2}
        suffix="%"
        tone="unknown"
        subtitle="Failed then succeeded"
      />
    </Box>
  );
}
