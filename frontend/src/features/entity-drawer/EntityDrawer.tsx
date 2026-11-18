import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { useInvestigationStore } from "@/store/useInvestigationStore";
import type { EntityType } from "@/types/common";
import type { FilterField } from "@/types/filters";
import { ApDrawerView } from "./ApDrawerView";
import { ApMacDrawerView } from "./ApMacDrawerView";
import { DeviceDrawerView } from "./DeviceDrawerView";
import { EmployeeDrawerView } from "./EmployeeDrawerView";
import { LocationDrawerView } from "./LocationDrawerView";
import { SsidDrawerView } from "./SsidDrawerView";

function entityTypeToFilterField(type: EntityType): FilterField {
  switch (type) {
    case "Employee":
      return "employee_ids";
    case "Device":
      return "user_macs";
    case "SSID":
      return "ssids";
    case "Location":
      return "locations";
    case "AP":
      return "ap_hostnames";
    case "AP MAC":
      return "ap_macs";
  }
}

export function EntityDrawer() {
  const navigate = useNavigate();
  const activeEntity = useAppStore((s) => s.activeEntity);
  const entityHistory = useAppStore((s) => s.entityHistory);
  const closeEntityDrawer = useAppStore((s) => s.closeEntityDrawer);
  const goBackEntityDrawer = useAppStore((s) => s.goBackEntityDrawer);

  const addCondition = useInvestigationStore((s) => s.addCondition);
  const setSubView = useInvestigationStore((s) => s.setSubView);
  const setGraphSeed = useInvestigationStore((s) => s.setGraphSeed);

  const handleAddFilter = () => {
    if (!activeEntity) return;
    addCondition(
      entityTypeToFilterField(activeEntity.type),
      "equals",
      activeEntity.value,
    );
    setSubView("results");
    closeEntityDrawer();
    navigate("/investigate");
  };

  const handleOpenGraph = () => {
    if (!activeEntity) return;
    setGraphSeed({ type: activeEntity.type, value: activeEntity.value });
    setSubView("graph");
    closeEntityDrawer();
    navigate("/investigate");
  };

  return (
    <Drawer
      anchor="right"
      open={Boolean(activeEntity)}
      onClose={closeEntityDrawer}
      PaperProps={{
        sx: {
          width: { xs: "100vw", sm: 580, md: 660 },
          maxWidth: "100vw",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {activeEntity ? (
        <>
          <Box sx={{ px: 2.5, py: 2 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
            >
              <Stack direction="row" alignItems="center" spacing={1} minWidth={0}>
                {entityHistory.length > 1 ? (
                  <Tooltip title="Previous entity">
                    <IconButton
                      size="small"
                      onClick={goBackEntityDrawer}
                      aria-label="Back to previous entity"
                    >
                      <ArrowBackIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : null}
                <Box minWidth={0}>
                  <Typography
                    variant="caption"
                    sx={{ color: "primary.main", fontWeight: 600 }}
                  >
                    {activeEntity.type}
                  </Typography>
                  <Typography
                    variant="h6"
                    className="mono"
                    noWrap
                    sx={{ fontSize: "1.05rem", fontWeight: 700 }}
                  >
                    {activeEntity.value}
                  </Typography>
                </Box>
              </Stack>

              <IconButton
                size="small"
                onClick={closeEntityDrawer}
                aria-label="Close entity drawer"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: 1.75, flexWrap: "wrap", rowGap: 1 }}
            >
              <Button
                size="small"
                variant="contained"
                startIcon={<FilterAltOutlinedIcon fontSize="small" />}
                onClick={handleAddFilter}
              >
                Filter in Investigation
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<HubOutlinedIcon fontSize="small" />}
                onClick={handleOpenGraph}
              >
                Explore Relationships
              </Button>
            </Stack>
          </Box>

          <Divider />

          <Box sx={{ p: 2.5, overflowY: "auto", flex: 1 }}>
            {activeEntity.type === "Employee" ? (
              <EmployeeDrawerView employeeId={activeEntity.value} />
            ) : activeEntity.type === "Device" ? (
              <DeviceDrawerView userMac={activeEntity.value} />
            ) : activeEntity.type === "Location" ? (
              <LocationDrawerView location={activeEntity.value} />
            ) : activeEntity.type === "SSID" ? (
              <SsidDrawerView ssid={activeEntity.value} />
            ) : activeEntity.type === "AP" ? (
              <ApDrawerView apHostname={activeEntity.value} />
            ) : (
              <ApMacDrawerView apMac={activeEntity.value} />
            )}
          </Box>
        </>
      ) : null}
    </Drawer>
  );
}
