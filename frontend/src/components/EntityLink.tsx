import { Box } from "@mui/material";
import type { EntityType } from "@/types/common";
import { useAppStore } from "@/store/useAppStore";

interface EntityLinkProps {
  type: EntityType;
  value: string | number | null | undefined;
  mono?: boolean;
  highlightUnknown?: boolean;
}

export function EntityLink({
  type,
  value,
  mono = false,
  highlightUnknown = false,
}: EntityLinkProps) {
  const openEntityDrawer = useAppStore((s) => s.openEntityDrawer);

  if (value === null || value === undefined || String(value).trim() === "") {
    return (
      <Box component="span" sx={{ color: "text.disabled" }}>
        —
      </Box>
    );
  }

  const text = String(value).trim();
  const isUnknown = highlightUnknown && text.toLowerCase() === "unknown";

  return (
    <Box
      component="button"
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openEntityDrawer({ type, value: text });
      }}
      title={`Inspect ${type}: ${text}`}
      className={mono ? "mono" : undefined}
      sx={{
        display: "inline",
        p: 0,
        m: 0,
        border: 0,
        background: "none",
        font: "inherit",
        fontFamily: mono ? '"JetBrains Mono", monospace' : "inherit",
        fontSize: "inherit",
        color: isUnknown ? "warning.main" : "primary.main",
        fontWeight: isUnknown ? 600 : 500,
        cursor: "pointer",
        textAlign: "left",
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        verticalAlign: "bottom",
        "&:hover": {
          textDecoration: "underline",
        },
      }}
    >
      {text}
    </Box>
  );
}
