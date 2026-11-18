import { Box, Breadcrumbs, Link, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { useInvestigationStore } from "@/store/useInvestigationStore";

export function BreadcrumbsBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const entityHistory = useAppStore((s) => s.entityHistory);
  const activeEntity = useAppStore((s) => s.activeEntity);
  const jumpToEntityBreadcrumb = useAppStore((s) => s.jumpToEntityBreadcrumb);
  const subView = useInvestigationStore((s) => s.subView);
  const setSubView = useInvestigationStore((s) => s.setSubView);

  const isInvestigate = location.pathname.startsWith("/investigate");

  return (
    <Breadcrumbs
      aria-label="Workspace navigation breadcrumbs"
      separator="/"
      sx={{
        fontSize: "0.8125rem",
        "& .MuiBreadcrumbs-separator": { color: "text.disabled", mx: 0.75 },
      }}
    >
      <Link
        component="button"
        type="button"
        underline="hover"
        color={isInvestigate ? "text.secondary" : "text.primary"}
        fontWeight={isInvestigate ? 500 : 600}
        onClick={() => navigate("/")}
        sx={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}
      >
        WiFi Observability
      </Link>

      <Link
        component="button"
        type="button"
        underline="hover"
        color={
          isInvestigate && subView === "results" && !activeEntity
            ? "text.primary"
            : "text.secondary"
        }
        fontWeight={isInvestigate && subView === "results" ? 600 : 500}
        onClick={() => {
          if (isInvestigate) {
            setSubView("results");
          } else {
            navigate("/");
          }
        }}
        sx={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}
      >
        {isInvestigate ? "Investigation" : "Executive Dashboard"}
      </Link>

      {isInvestigate && subView === "graph" ? (
        <Typography
          variant="body2"
          fontWeight={600}
          color={activeEntity ? "text.secondary" : "text.primary"}
          sx={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}
        >
          Entity Graph
        </Typography>
      ) : null}

      {entityHistory.slice(-3).map((item, idx, arr) => {
        const originalIndex = entityHistory.length - arr.length + idx;
        const isCurrent =
          activeEntity?.type === item.type &&
          activeEntity?.value === item.value;
        return (
          <Box
            component="button"
            type="button"
            key={`${item.type}-${item.value}`}
            onClick={() => jumpToEntityBreadcrumb(originalIndex)}
            sx={{
              background: "none",
              border: 0,
              p: 0,
              m: 0,
              font: "inherit",
              fontSize: "0.8125rem",
              cursor: "pointer",
              color: isCurrent ? "primary.main" : "text.secondary",
              fontWeight: isCurrent ? 600 : 500,
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {item.type}: {item.value}
          </Box>
        );
      })}
    </Breadcrumbs>
  );
}
