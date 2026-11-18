import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { EntityLink } from "@/components/EntityLink";
import { useAppStore } from "@/store/useAppStore";
import type { APAnalyticsResponse, APMetricItem } from "@/types/dashboard";
import { formatNumber, formatPercent } from "@/utils/formatters";
import { SectionHeader } from "./SectionHeader";

interface ApAnalyticsSectionProps {
  data: APAnalyticsResponse;
}

function ApTable({
  title,
  items,
  tone,
}: {
  title: string;
  items: APMetricItem[];
  tone: "accent" | "fail";
}) {
  const openEntityDrawer = useAppStore((s) => s.openEntityDrawer);

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="subtitle2" fontWeight={600}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" className="mono">
          {items.length} APs
        </Typography>
      </Box>
      <TableContainer sx={{ maxHeight: 360 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>AP Hostname</TableCell>
              <TableCell align="right">Users</TableCell>
              <TableCell align="right">Devices</TableCell>
              <TableCell align="right">Success</TableCell>
              <TableCell align="right">Fail</TableCell>
              <TableCell align="right">Fail Rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", py: 2, textAlign: "center" }}
                  >
                    No access points returned.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((ap) => (
                <TableRow
                  key={ap.ap_hostname}
                  hover
                  onClick={() =>
                    openEntityDrawer({ type: "AP", value: ap.ap_hostname })
                  }
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>
                    <EntityLink type="AP" value={ap.ap_hostname} mono />
                  </TableCell>
                  <TableCell align="right" className="mono">
                    {formatNumber(ap.users)}
                  </TableCell>
                  <TableCell align="right" className="mono">
                    {formatNumber(ap.devices)}
                  </TableCell>
                  <TableCell
                    align="right"
                    className="mono"
                    sx={{ color: "success.main" }}
                  >
                    {formatNumber(ap.success_count)}
                  </TableCell>
                  <TableCell
                    align="right"
                    className="mono"
                    sx={{ color: ap.failure_count > 0 ? "error.main" : "text.secondary" }}
                  >
                    {formatNumber(ap.failure_count)}
                  </TableCell>
                  <TableCell
                    align="right"
                    className="mono"
                    sx={{
                      fontWeight: 600,
                      color:
                        tone === "fail" || ap.failure_rate >= 20
                          ? "error.main"
                          : "text.primary",
                    }}
                  >
                    {formatPercent(ap.failure_rate, 1)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export function ApAnalyticsSection({ data }: ApAnalyticsSectionProps) {
  const coverage = data.ap_coverage;

  return (
    <Box component="section">
      <SectionHeader
        title="Access Point Analytics"
        subtitle="Top utilized and highest failure-rate access points (click any row to open AP Entity Drawer)"
        action={
          coverage ? (
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{
                px: 1.25,
                py: 0.5,
                borderRadius: 1,
                border: 1,
                borderColor:
                  coverage.ap_coverage < 80 ? "warning.main" : "divider",
                color:
                  coverage.ap_coverage < 80 ? "warning.main" : "text.secondary",
              }}
            >
              <InfoOutlinedIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" fontWeight={600} className="mono">
                AP Coverage: {formatPercent(coverage.ap_coverage, 2)} (
                {formatNumber(coverage.mapped_devices)} mapped /{" "}
                {formatNumber(coverage.unmapped_devices)} unmapped)
              </Typography>
            </Stack>
          ) : null
        }
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
          gap: 2,
        }}
      >
        <ApTable title="Top Access Points" items={data.top_aps} tone="accent" />
        <ApTable
          title="Highest Failure-Rate Access Points"
          items={data.worst_aps}
          tone="fail"
        />
      </Box>
    </Box>
  );
}
