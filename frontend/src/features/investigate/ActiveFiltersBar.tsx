import BookmarkAddOutlinedIcon from "@mui/icons-material/BookmarkAddOutlined";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useInvestigationStore } from "@/store/useInvestigationStore";
import {
  describeOperator,
  flattenActiveConditions,
  getFieldDef,
} from "@/utils/filterCompiler";

export function ActiveFiltersBar() {
  const filterTree = useInvestigationStore((s) => s.filterTree);
  const removeNode = useInvestigationStore((s) => s.removeNode);
  const clearAllFilters = useInvestigationStore((s) => s.clearAllFilters);
  const saveCurrentView = useInvestigationStore((s) => s.saveCurrentView);
  const pushNotification = useAppStore((s) => s.pushNotification);

  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewDescription, setViewDescription] = useState("");

  const activeConditions = flattenActiveConditions(filterTree);

  const handleSave = () => {
    const saved = saveCurrentView(viewName, viewDescription);
    pushNotification({
      severity: "success",
      title: `Saved view "${saved.name}"`,
      detail: `${activeConditions.length} active filter conditions persisted`,
    });
    setSaveOpen(false);
    setViewName("");
    setViewDescription("");
  };

  return (
    <>
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ flex: 1, minWidth: 0 }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{ mr: 0.5 }}
          >
            Active Filters ({activeConditions.length}):
          </Typography>

          {activeConditions.length === 0 ? (
            <Typography variant="caption" color="text.disabled">
              None — showing entire matching fleet scope
            </Typography>
          ) : (
            activeConditions.map((cond) => {
              const def = getFieldDef(cond.field);
              return (
                <Box
                  key={cond.id}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 1,
                    py: 0.35,
                    borderRadius: 1,
                    border: 1,
                    borderColor: "divider",
                    bgcolor: "background.default",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {def.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    className="mono"
                    color="primary.main"
                  >
                    {describeOperator(cond.operator)}
                  </Typography>
                  <Typography
                    variant="caption"
                    className="mono"
                    fontWeight={600}
                  >
                    {cond.value}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => removeNode(cond.id)}
                    aria-label={`Remove ${def.label} filter`}
                    sx={{ p: 0.25 }}
                  >
                    <CloseIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Box>
              );
            })
          )}
        </Stack>

        <Stack direction="row" spacing={1}>
          {activeConditions.length > 0 ? (
            <Button
              size="small"
              variant="text"
              color="inherit"
              startIcon={<ClearAllIcon fontSize="small" />}
              onClick={clearAllFilters}
            >
              Clear All
            </Button>
          ) : null}
          <Button
            size="small"
            variant="outlined"
            startIcon={<BookmarkAddOutlinedIcon fontSize="small" />}
            onClick={() => setSaveOpen(true)}
          >
            Save View
          </Button>
        </Stack>
      </Box>

      <Dialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Save Investigation View</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              size="small"
              label="View Name"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="e.g. CorpWiFi High Failure Cohort"
              fullWidth
            />
            <TextField
              size="small"
              label="Description (optional)"
              value={viewDescription}
              onChange={(e) => setViewDescription(e.target.value)}
              placeholder="Notes on filter logic or root cause"
              multiline
              rows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
