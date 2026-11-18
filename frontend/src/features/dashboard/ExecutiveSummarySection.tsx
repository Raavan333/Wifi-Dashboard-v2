import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { KpiCard } from "@/components/KpiCard";
import { useInvestigationStore } from "@/store/useInvestigationStore";
import type { ExecutiveSummaryResponse } from "@/types/dashboard";
import type { FilterField, FilterOperator } from "@/types/filters";
import { SectionHeader } from "./SectionHeader";

interface ExecutiveSummarySectionProps {
  data: ExecutiveSummaryResponse;
  refreshPulseKey: number;
}

function resolveDrilldown(
  title: string,
): Array<{ field: FilterField; operator?: FilterOperator; value: string }> {
  const normalized = title.toLowerCase();
  if (normalized.includes("valid user")) {
    return [{ field: "valid_users_only", operator: "is", value: "true" }];
  }
  if (normalized.includes("invalid")) {
    return [{ field: "invalid_devices_only", operator: "is", value: "true" }];
  }
  if (normalized.includes("ux") && normalized.includes("missing")) {
    return [{ field: "ux_available", operator: "is", value: "false" }];
  }
  if (normalized.includes("total user")) {
    return [{ field: "valid_users_only", operator: "is", value: "true" }];
  }
  return [];
}

function resolveTone(
  title: string,
): "neutral" | "success" | "fail" | "warning" | "unknown" | "accent" {
  const normalized = title.toLowerCase();
  if (normalized.includes("valid user")) return "success";
  if (normalized.includes("invalid")) return "fail";
  if (normalized.includes("ux") && normalized.includes("missing")) {
    return "warning";
  }
  if (normalized.includes("device") || normalized.includes("user")) {
    return "accent";
  }
  return "neutral";
}

export function ExecutiveSummarySection({
  data,
  refreshPulseKey,
}: ExecutiveSummarySectionProps) {
  const navigate = useNavigate();
  const replaceFilterConditions = useInvestigationStore(
    (s) => s.replaceFilterConditions,
  );

  return (
    <Box component="section">
      <SectionHeader
        title="Executive Summary"
        subtitle="Click any fleet metric to open the matching cohort in Investigation"
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(5, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        {data.metrics.map((metric) => {
          const conditions = resolveDrilldown(metric.title);
          const isUserFocused = metric.title.toLowerCase().includes("user");
          return (
            <KpiCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              subtitle={metric.subtitle ?? "Inspect cohort"}
              tone={resolveTone(metric.title)}
              refreshPulseKey={refreshPulseKey}
              onClick={() => {
                replaceFilterConditions(conditions, {
                  groupBy: isUserFocused ? "user" : "device",
                });
                navigate("/investigate");
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
}
