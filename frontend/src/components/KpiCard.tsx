import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { CountUpNumber } from "./CountUpNumber";

interface KpiCardProps {
  title: string;
  value: number | string;
  subtitle?: string | null;
  tone?: "neutral" | "success" | "fail" | "warning" | "unknown" | "accent";
  onClick?: () => void;
  refreshPulseKey?: number;
  decimals?: number;
  suffix?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  tone = "neutral",
  onClick,
  refreshPulseKey = 0,
  decimals = 0,
  suffix = "",
}: KpiCardProps) {
  const toneColorMap: Record<NonNullable<KpiCardProps["tone"]>, string> = {
    neutral: "text.primary",
    success: "success.main",
    fail: "error.main",
    warning: "warning.main",
    unknown: "secondary.main",
    accent: "primary.main",
  };

  const isNumeric = typeof value === "number" && Number.isFinite(value);

  return (
    <motion.div
      key={refreshPulseKey}
      initial={{ opacity: 0.92 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      style={{ height: "100%" }}
    >
      <Box
        component={onClick ? "button" : "div"}
        type={onClick ? "button" : undefined}
        onClick={onClick}
        sx={{
          width: "100%",
          height: "100%",
          textAlign: "left",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 1,
          p: 2,
          borderRadius: 2,
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          cursor: onClick ? "pointer" : "default",
          transition: "border-color 150ms ease, background-color 150ms ease",
          "&:hover": onClick
            ? {
                borderColor: "primary.main",
                bgcolor: "action.hover",
              }
            : undefined,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 500,
            lineHeight: 1.3,
          }}
        >
          {title}
        </Typography>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: toneColorMap[tone],
            fontSize: { xs: "1.35rem", md: "1.55rem" },
            lineHeight: 1.15,
          }}
        >
          {isNumeric ? (
            <CountUpNumber value={value} decimals={decimals} suffix={suffix} />
          ) : (
            <span className="tabular-nums">{value}</span>
          )}
        </Typography>

        {subtitle ? (
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontSize: "0.72rem" }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </motion.div>
  );
}
