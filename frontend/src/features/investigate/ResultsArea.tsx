import { Box, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useInvestigationStore } from "@/store/useInvestigationStore";
import type {
  GroupByOption,
  GroupedInvestigationResponse,
  RawEventsResponse,
} from "@/types/investigate";
import { GroupedResultsTable } from "./GroupedResultsTable";
import { RawEventsTable } from "./RawEventsTable";

interface ResultsAreaProps {
  data?: RawEventsResponse | GroupedInvestigationResponse;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}

const AGGREGATION_TABS: Array<{ value: string; label: string }> = [
  { value: "raw", label: "Raw Events" },
  { value: "user", label: "By Employee" },
  { value: "device", label: "By Device" },
  { value: "ssid", label: "By SSID" },
  { value: "location", label: "By Location" },
  { value: "ap", label: "By AP" },
  { value: "ap_mac", label: "By AP MAC" },
  { value: "event", label: "By Mnemonic" },
];

export function ResultsArea({
  data,
  loading,
  error,
  onRetry,
}: ResultsAreaProps) {
  const groupBy = useInvestigationStore((s) => s.groupBy);
  const setGroupBy = useInvestigationStore((s) => s.setGroupBy);

  const activeTab = groupBy ?? "raw";
  const isGroupedResponse = data && "group_by" in data;

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction={{ xs: "column", lg: "row" }}
        alignItems={{ xs: "flex-start", lg: "center" }}
        justifyContent="space-between"
        spacing={1.5}
        mb={2}
      >
        <Stack spacing={0.25}>
          <Typography variant="subtitle2" fontWeight={700}>
            Results Explorer
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Switch seamlessly between virtualized raw syslog events and aggregated cohort groupings
          </Typography>
        </Stack>

        <Tabs
          value={activeTab}
          variant="scrollable"
          scrollButtons="auto"
          onChange={(_, v: string) =>
            setGroupBy(v === "raw" ? null : (v as GroupByOption))
          }
          sx={{
            minHeight: 34,
            maxWidth: "100%",
            border: 1,
            borderColor: "divider",
            borderRadius: 1.5,
            "& .MuiTab-root": {
              minHeight: 34,
              py: 0.4,
              px: 1.4,
              fontSize: "0.78rem",
            },
          }}
        >
          {AGGREGATION_TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} />
          ))}
        </Tabs>
      </Stack>

      {groupBy ? (
        <GroupedResultsTable
          groupBy={groupBy}
          records={isGroupedResponse ? data.records : []}
          pagination={isGroupedResponse ? data.pagination : undefined}
          loading={loading}
          error={error}
          onRetry={onRetry}
        />
      ) : (
        <RawEventsTable
          records={!isGroupedResponse && data ? data.records : []}
          pagination={!isGroupedResponse && data ? data.pagination : undefined}
          loading={loading}
          error={error}
          onRetry={onRetry}
        />
      )}
    </Box>
  );
}
