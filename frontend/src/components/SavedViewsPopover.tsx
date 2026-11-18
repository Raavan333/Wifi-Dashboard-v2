import BookmarkAddOutlinedIcon from "@mui/icons-material/BookmarkAddOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { useInvestigationStore } from "@/store/useInvestigationStore";
import { flattenActiveConditions } from "@/utils/filterCompiler";
import { formatShortDate } from "@/utils/formatters";

export function SavedViewsPopover() {
  const navigate = useNavigate();
  const open = useAppStore((s) => s.savedViewsOpen);
  const setOpen = useAppStore((s) => s.setSavedViewsOpen);
  const pushNotification = useAppStore((s) => s.pushNotification);

  const savedViews = useInvestigationStore((s) => s.savedViews);
  const saveCurrentView = useInvestigationStore((s) => s.saveCurrentView);
  const loadSavedView = useInvestigationStore((s) => s.loadSavedView);
  const deleteSavedView = useInvestigationStore((s) => s.deleteSavedView);
  const filterTree = useInvestigationStore((s) => s.filterTree);
  const groupBy = useInvestigationStore((s) => s.groupBy);
  const bucket = useInvestigationStore((s) => s.bucket);
  const visibleColumns = useInvestigationStore((s) => s.visibleColumns);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const activeCount = flattenActiveConditions(filterTree).length;

  const handleSave = () => {
    const view = saveCurrentView(name, description);
    setName("");
    setDescription("");
    pushNotification({
      severity: "success",
      title: "Saved Investigation View",
      detail: `"${view.name}" captured filters, grouping, ${view.visibleColumns.length} columns, and chart mode.`,
    });
  };

  const handleOpenView = (id: string) => {
    loadSavedView(id);
    setOpen(false);
    navigate("/investigate");
  };

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="sm"
      fullWidth
      aria-labelledby="saved-views-dialog-title"
    >
      <DialogTitle id="saved-views-dialog-title" sx={{ fontWeight: 600 }}>
        Saved Views
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: 1.5,
              border: 1,
              borderColor: "divider",
              bgcolor: "background.default",
            }}
          >
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Save Current Workspace Snapshot
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1.5 }}
            >
              {activeCount} active filter{activeCount === 1 ? "" : "s"} · Grouping:{" "}
              {groupBy ?? "Raw Events"} · Bucket: {bucket} ·{" "}
              {visibleColumns.length} columns
            </Typography>
            <Stack spacing={1.25}>
              <TextField
                size="small"
                label="View Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Unknown Location Auth Failures"
              />
              <TextField
                size="small"
                label="Notes (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Filters + grouping snapshot for shift handoff"
              />
              <Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<BookmarkAddOutlinedIcon />}
                  onClick={handleSave}
                >
                  Save View
                </Button>
              </Box>
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Saved Investigation Presets ({savedViews.length})
            </Typography>

            {savedViews.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                No saved views yet. Configure filters, grouping, and visible
                columns on the Investigation page, then save them here for instant
                reload.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {savedViews.map((view) => {
                  const condCount = flattenActiveConditions(view.filterTree).length;
                  return (
                    <Box
                      key={view.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        border: 1,
                        borderColor: "divider",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1.5,
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {view.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block" }}
                        >
                          {condCount} filters ·{" "}
                          {view.groupBy ? `Group: ${view.groupBy}` : "Raw Mode"} ·{" "}
                          {view.bucket} · {formatShortDate(view.createdAt)}
                        </Typography>
                        {view.description ? (
                          <Typography variant="caption" color="text.secondary">
                            {view.description}
                          </Typography>
                        ) : null}
                      </Box>

                      <Stack direction="row" spacing={0.5} flexShrink={0}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenView(view.id)}
                        >
                          Open
                        </Button>
                        <IconButton
                          size="small"
                          aria-label={`Delete saved view ${view.name}`}
                          onClick={() => deleteSavedView(view.id)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
