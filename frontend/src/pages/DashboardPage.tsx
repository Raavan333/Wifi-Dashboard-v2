import ManageSearchOutlinedIcon from "@mui/icons-material/ManageSearchOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchApAnalytics,
  fetchFullDashboard,
  fetchInactiveUsers,
  fetchRareUsers,
} from "@/api/dashboard";
import { StateFrame } from "@/components/StateFrame";
import { ActivitySection } from "@/features/dashboard/ActivitySection";
import { ApAnalyticsSection } from "@/features/dashboard/ApAnalyticsSection";
import { ConnectivityHealthSection } from "@/features/dashboard/ConnectivityHealthSection";
import { DataQualitySection } from "@/features/dashboard/DataQualitySection";
import { ExecutiveSummarySection } from "@/features/dashboard/ExecutiveSummarySection";
import { InactiveUsersSection } from "@/features/dashboard/InactiveUsersSection";
import { LocationAnalyticsSection } from "@/features/dashboard/LocationAnalyticsSection";
import { RareUsersSection } from "@/features/dashboard/RareUsersSection";
import { SsidIntelligenceSection } from "@/features/dashboard/SsidIntelligenceSection";
import { UserPopulationSection } from "@/features/dashboard/UserPopulationSection";
import { useAppStore } from "@/store/useAppStore";

export function DashboardPage() {
  const navigate = useNavigate();
  const autoRefreshSeconds = useAppStore((s) => s.autoRefreshSeconds);
  const pushNotification = useAppStore((s) => s.pushNotification);

  const [refreshPulseKey, setRefreshPulseKey] = useState(0);
  const [rarePage, setRarePage] = useState(1);
  const [inactivePage, setInactivePage] = useState(1);

  const refetchInterval =
    autoRefreshSeconds > 0 ? autoRefreshSeconds * 1000 : false;

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "full"],
    queryFn: ({ signal }) => fetchFullDashboard(signal),
    refetchInterval,
  });

  const apQuery = useQuery({
    queryKey: ["dashboard", "ap"],
    queryFn: ({ signal }) => fetchApAnalytics(signal),
    refetchInterval,
  });

  const rareQuery = useQuery({
    queryKey: ["dashboard", "rare-users", rarePage],
    queryFn: ({ signal }) => fetchRareUsers(rarePage, 25, signal),
    refetchInterval,
  });

  const inactiveQuery = useQuery({
    queryKey: ["dashboard", "inactive-users", inactivePage],
    queryFn: ({ signal }) => fetchInactiveUsers(inactivePage, 25, signal),
    refetchInterval,
  });

  useEffect(() => {
    if (dashboardQuery.data?.data_quality) {
      const dq = dashboardQuery.data.data_quality;
      if (dq.location_coverage < 75) {
        pushNotification({
          severity: "warning",
          title: "Location telemetry coverage below 75%",
          detail: `Current location coverage is ${dq.location_coverage.toFixed(1)}%`,
        });
      }
      if (dq.ap_coverage && dq.ap_coverage.ap_coverage < 75) {
        pushNotification({
          severity: "warning",
          title: "AP mapping coverage below 75%",
          detail: `${dq.ap_coverage.unmapped_devices.toLocaleString()} unmapped devices detected`,
        });
      }
    }
  }, [dashboardQuery.data, pushNotification]);

  const handleRefreshAll = () => {
    setRefreshPulseKey((k) => k + 1);
    void Promise.all([
      dashboardQuery.refetch(),
      apQuery.refetch(),
      rareQuery.refetch(),
      inactiveQuery.refetch(),
    ]);
  };

  return (
    <Stack spacing={4}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Stack spacing={0.25}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "1.45rem", md: "1.75rem" },
              letterSpacing: "-0.02em",
            }}
          >
            WiFi Fleet Situation Awareness
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enterprise authentication health, roaming populations, AP telemetry, and data completeness
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1.25}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon fontSize="small" />}
            onClick={handleRefreshAll}
          >
            Refresh
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<ManageSearchOutlinedIcon fontSize="small" />}
            onClick={() => navigate("/investigate")}
          >
            Open Investigation
          </Button>
        </Stack>
      </Box>

      <StateFrame
        loading={dashboardQuery.isLoading}
        error={dashboardQuery.error as Error | null}
        empty={!dashboardQuery.isLoading && !dashboardQuery.data}
        onRetry={() => void dashboardQuery.refetch()}
        skeletonHeight={320}
      >
        {dashboardQuery.data ? (
          <Stack spacing={4}>
            <ExecutiveSummarySection
              data={dashboardQuery.data.executive_summary}
              refreshPulseKey={refreshPulseKey}
            />

            <ConnectivityHealthSection
              data={dashboardQuery.data.connectivity_health}
              refreshPulseKey={refreshPulseKey}
            />

            <UserPopulationSection
              data={dashboardQuery.data.user_population}
              refreshPulseKey={refreshPulseKey}
            />

            <SsidIntelligenceSection
              data={dashboardQuery.data.ssid_intelligence}
              refreshPulseKey={refreshPulseKey}
            />

            <LocationAnalyticsSection
              data={dashboardQuery.data.location_overview}
              refreshPulseKey={refreshPulseKey}
            />

            <ActivitySection
              data={dashboardQuery.data.user_activity}
              refreshPulseKey={refreshPulseKey}
            />

            <DataQualitySection
              data={dashboardQuery.data.data_quality}
              refreshPulseKey={refreshPulseKey}
            />
          </Stack>
        ) : null}
      </StateFrame>

      <StateFrame
        loading={apQuery.isLoading}
        error={apQuery.error as Error | null}
        empty={!apQuery.isLoading && !apQuery.data}
        onRetry={() => void apQuery.refetch()}
        skeletonHeight={240}
      >
        {apQuery.data ? <ApAnalyticsSection data={apQuery.data} /> : null}
      </StateFrame>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" },
          gap: 3,
        }}
      >
        <RareUsersSection
          data={rareQuery.data}
          loading={rareQuery.isLoading}
          error={rareQuery.error as Error | null}
          page={rarePage}
          onPageChange={setRarePage}
          onRetry={() => void rareQuery.refetch()}
        />

        <InactiveUsersSection
          data={inactiveQuery.data}
          loading={inactiveQuery.isLoading}
          error={inactiveQuery.error as Error | null}
          page={inactivePage}
          onPageChange={setInactivePage}
          onRetry={() => void inactiveQuery.refetch()}
        />
      </Box>
    </Stack>
  );
}
