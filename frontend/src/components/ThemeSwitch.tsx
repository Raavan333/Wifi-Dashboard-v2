import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { IconButton, Tooltip } from "@mui/material";
import { useAppStore } from "@/store/useAppStore";

export function ThemeSwitch() {
  const themeMode = useAppStore((s) => s.themeMode);
  const toggleThemeMode = useAppStore((s) => s.toggleThemeMode);

  return (
    <Tooltip
      title={
        themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
    >
      <IconButton
        size="small"
        onClick={toggleThemeMode}
        aria-label="Toggle color theme"
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 1.5,
          width: 34,
          height: 34,
        }}
      >
        {themeMode === "dark" ? (
          <LightModeOutlinedIcon fontSize="small" />
        ) : (
          <DarkModeOutlinedIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
}
