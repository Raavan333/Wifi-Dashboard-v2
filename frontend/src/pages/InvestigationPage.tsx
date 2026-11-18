import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import ManageSearchOutlinedIcon from "@mui/icons-material/ManageSearchOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  executeMultiBranchEvents,
  executeMultiBranchSummary,
  executeMultiBranchTimeline,
  fetchFilterOptions,
} from "@/api/investigate";
import { EntityGraphExplorer } from "@/features/entity-graph/EntityGraphExplorer";
import { ActiveFiltersBar } from "@/features/investigate/ActiveFiltersBar";
import { FilterBuilder } from "@/features/investigate/FilterBuilder";
import { InvestigationSummaryRibbon } from "@/features/investigate/InvestigationSummaryRibbon";
import { InvestigationTimeline } from "@/features/investigate/InvestigationTimeline";
import { ResultsArea } from "@/features/investigate/ResultsArea";
import { useAppStore } from "@/store/useAppStore";
import {
  type InvestigationSubView,
  useInvestigationStore,
} from "@/store/useInvestigationStore";
import { compileFilterTreeToRequests } from "@/utils/filterCompiler";

export function InvestigationPage() {
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  const filterTree = useInvestigationStore((s) => s.filterTree);
  const subView = useInvestigationStore((s) => s.subView);
  const setSubView = useInvestigationStore((s) => s.setSubView);
  const bucket = useInvestigationStore((s) => s.bucket);
  const groupBy = useInvestigationStore((s) => s.groupBy);
  const groupMode = useInvestigationStore((s) => s.groupMode);
  const searchFields = useInvestigationStore((s) => s.searchFields);
  const page = useInvestigationStore((s) => s.page);
  const pageSize = useInvestigationStore((s) => s.pageSize);
  const sortBy = useInvestigationStore((s) => s.sortBy);
  const sortOrder = useInvestigationStore((s) => s.sortOrder);

  const optionsQuery = useQuery({
    queryKey: ["investigate", "options"],
    queryFn: ({ signal }) => fetchFilterOptions(signal),
    staleTime: 5 * 60 * 1000,
  });

  const compiledRequests = useMemo(
    () =>
      compileFilterTreeToRequests(filterTree, {
        bucket,
        group_by: groupBy,
        group_mode: groupMode,
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
        search_fields: searchFields,
      }),
    [
      filterTree,
      bucket,
      groupBy,
      groupMode,
      page,
      pageSize,
      sortBy,
      sortOrder,
      searchFields,
    ],
  );

  const summaryRequests = useMemo(
    () =>
      compileFilterTreeToRequests(filterTree, {
        bucket,
        group_by: null,
        group_mode: groupMode,
        page: 1,
        page_size: 25,
        sort_by: null,
        sort_order: "desc",
        search_fields: searchFields,
      }),
    [filterTree, bucket, groupMode, searchFields],
  );

  const summaryKey = JSON.stringify(summaryRequests);
  const eventsKey = JSON.stringify(compiledRequests);

  const summaryQuery = useQuery({
    queryKey: ["investigate", "summary", summaryKey],
    queryFn: ({ signal }) => executeMultiBranchSummary(summaryRequests, signal),
    enabled: subView === "results",
  });

  const timelineQuery = useQuery({
    queryKey: ["investigate", "timeline", summaryKey],
    queryFn: ({ signal }) =>
      executeMultiBranchTimeline(summaryRequests, signal),
    enabled: subView === "results",
  });

  const eventsQuery = useQuery({
    queryKey: ["investigate", "events", eventsKey],
    queryFn: ({ signal }) =>
      executeMultiBranchEvents(compiledRequests, signal),
    enabled: subView === "results",
  });

  const handleRefresh = () => {
    void Promise.all([
      optionsQuery.refetch(),
      summaryQuery.refetch(),
      timelineQuery.refetch(),
      eventsQuery.refetch(),
    ]);
  };

  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Stack spacing={0.25}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "1.4rem", md: "1.7rem" },
              letterSpacing: "-0.02em",
            }}
          >
            Investigation Workspace
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Multi-entity query engine, time-series zoom, virtualized logs, and live topology exploration
          </Typography>
        </Stack>

        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
        >
          <TextField
            size="small"
            placeholder="Spotlight search (Ctrl+K)..."
            onClick={() => setCommandPaletteOpen(true)}
            inputProps={{ readOnly: true }}
            sx={{ width: { xs: 200, sm: 240 }, cursor: "pointer" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <Tabs
            value={subView}
            onChange={(_, v: InvestigationSubView) => setSubView(v)}
            sx={{
              minHeight: 36,
              border: 1,
              borderColor: "divider",
              borderRadius: 1.5,
              "& .MuiTab-root": {
                minHeight: 36,
                py: 0.5,
                px: 1.5,
                fontSize: "0.78rem",
              },
            }}
          >
            <Tab
              value="results"
              icon={<ManageSearchOutlinedIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label="Events & Cohort"
            />
            <Tab
              value="graph"
              icon={<HubOutlinedIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label="Entity Graph"
            />
          </Tabs>

          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon fontSize="small" />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {subView === "graph" ? (
        <EntityGraphExplorer />
      ) : (
        <Stack spacing={2.5}>
          <FilterBuilder options={optionsQuery.data} />

          <ActiveFiltersBar />

          <InvestigationSummaryRibbon
            data={summaryQuery.data}
            loading={summaryQuery.isLoading}
            error={summaryQuery.error as Error | null}
          />

          <InvestigationTimeline
            points={timelineQuery.data?.points ?? []}
            loading={timelineQuery.isLoading}
            error={timelineQuery.error as Error | null}
            onRetry={() => void timelineQuery.refetch()}
          />

          <ResultsArea
            data={eventsQuery.data}
            loading={eventsQuery.isLoading}
            error={eventsQuery.error as Error | null}
            onRetry={() => void eventsQuery.refetch()}
          />
        </Stack>
      )}
    </Stack>
  );
}
