import AddIcon from "@mui/icons-material/Add";
import CreateNewFolderOutlinedIcon from "@mui/icons-material/CreateNewFolderOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FilterListIcon from "@mui/icons-material/FilterList";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useInvestigationStore } from "@/store/useInvestigationStore";
import type {
  FilterCondition,
  FilterField,
  FilterGroup,
  FilterOperator,
} from "@/types/filters";
import type { FilterOptionsResponse, SearchField } from "@/types/investigate";
import {
  FILTER_FIELD_DEFINITIONS,
  getFieldDef,
} from "@/utils/filterCompiler";

interface FilterBuilderProps {
  options?: FilterOptionsResponse;
}

const CATEGORIES: Array<"Entity" | "Telemetry" | "Numeric" | "Temporal" | "Cohort"> =
  ["Entity", "Telemetry", "Numeric", "Temporal", "Cohort"];

function getOptionsForField(
  field: FilterField,
  options?: FilterOptionsResponse,
): string[] {
  if (!options) {
    if (field === "statuses") return ["SUCCESS", "FAIL", "UNKNOWN"];
    return [];
  }
  switch (field) {
    case "ssids":
      return options.ssids ?? [];
    case "locations":
      return options.locations ?? [];
    case "ap_hostnames":
      return options.ap_hostnames ?? [];
    case "statuses":
      return options.statuses?.length
        ? options.statuses
        : ["SUCCESS", "FAIL", "UNKNOWN"];
    case "mnemonics":
      return options.mnemonics ?? [];
    case "facilities":
      return options.facilities ?? [];
    default:
      return [];
  }
}

function ConditionRow({
  condition,
  options,
  onChange,
  onRemove,
}: {
  condition: FilterCondition;
  options?: FilterOptionsResponse;
  onChange: (patch: Partial<FilterCondition>) => void;
  onRemove: () => void;
}) {
  const def = getFieldDef(condition.field);
  const autocompleteOptions = getOptionsForField(condition.field, options);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "200px 115px minmax(200px, 1fr) auto",
        },
        gap: 1,
        alignItems: "center",
        p: 1,
        borderRadius: 1.5,
        border: 1,
        borderColor: condition.enabled ? "divider" : "action.disabledBackground",
        bgcolor: "background.default",
        opacity: condition.enabled ? 1 : 0.6,
      }}
    >
      <FormControl size="small" fullWidth>
        <Select
          value={condition.field}
          onChange={(e) => {
            const nextField = e.target.value as FilterField;
            const nextDef = getFieldDef(nextField);
            onChange({
              field: nextField,
              operator: nextDef.operators[0],
              value: nextDef.valueKind === "boolean" ? "true" : "",
            });
          }}
        >
          {CATEGORIES.flatMap((cat) => [
            <MenuItem
              key={`cat-${cat}`}
              disabled
              sx={{ fontSize: "0.7rem", fontWeight: 700, opacity: 0.7 }}
            >
              {cat.toUpperCase()}
            </MenuItem>,
            ...FILTER_FIELD_DEFINITIONS.filter((d) => d.category === cat).map(
              (d) => (
                <MenuItem key={d.field} value={d.field}>
                  {d.label}
                </MenuItem>
              ),
            ),
          ])}
        </Select>
      </FormControl>

      <FormControl size="small" fullWidth>
        <Select
          value={condition.operator}
          onChange={(e) =>
            onChange({ operator: e.target.value as FilterOperator })
          }
        >
          {def.operators.map((op) => (
            <MenuItem key={op} value={op}>
              {op}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {def.valueKind === "boolean" ? (
        <FormControl size="small" fullWidth>
          <Select
            value={condition.value || "true"}
            onChange={(e) => onChange({ value: String(e.target.value) })}
          >
            <MenuItem value="true">True</MenuItem>
            <MenuItem value="false">False</MenuItem>
          </Select>
        </FormControl>
      ) : def.valueKind === "option" ? (
        <Autocomplete
          freeSolo
          size="small"
          options={autocompleteOptions}
          value={condition.value}
          onInputChange={(_, newVal) => onChange({ value: newVal })}
          onChange={(_, newVal) =>
            onChange({ value: typeof newVal === "string" ? newVal : "" })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={def.placeholder}
              size="small"
            />
          )}
        />
      ) : def.valueKind === "datetime" ? (
        <TextField
          size="small"
          type="datetime-local"
          value={
            condition.value && condition.value.length >= 16
              ? condition.value.slice(0, 16)
              : condition.value
          }
          onChange={(e) => onChange({ value: e.target.value })}
          fullWidth
        />
      ) : (
        <TextField
          size="small"
          type={def.valueKind === "number" ? "number" : "text"}
          value={condition.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder={def.placeholder}
          fullWidth
        />
      )}

      <Stack direction="row" spacing={0.5} alignItems="center">
        <Tooltip title={condition.enabled ? "Disable filter" : "Enable filter"}>
          <Switch
            size="small"
            checked={condition.enabled}
            onChange={(_, checked) => onChange({ enabled: checked })}
          />
        </Tooltip>
        <IconButton
          size="small"
          onClick={onRemove}
          aria-label="Remove condition"
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}

function GroupEditor({
  group,
  isRoot,
  depth,
  options,
}: {
  group: FilterGroup;
  isRoot: boolean;
  depth: number;
  options?: FilterOptionsResponse;
}) {
  const addCondition = useInvestigationStore((s) => s.addCondition);
  const updateCondition = useInvestigationStore((s) => s.updateCondition);
  const removeNode = useInvestigationStore((s) => s.removeNode);
  const addNestedGroup = useInvestigationStore((s) => s.addNestedGroup);
  const toggleGroupLogic = useInvestigationStore((s) => s.toggleGroupLogic);

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        border: 1,
        borderColor: "divider",
        bgcolor: depth % 2 === 0 ? "background.paper" : "action.hover",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
        mb={group.children.length > 0 ? 1.25 : 0}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant="outlined"
            color={group.logic === "OR" ? "warning" : "primary"}
            onClick={() => toggleGroupLogic(group.id)}
            sx={{ minWidth: 68, fontWeight: 700, fontSize: "0.75rem" }}
          >
            {group.logic}
          </Button>
          <Typography variant="caption" color="text.secondary">
            {isRoot
              ? "Match conditions using"
              : `Nested ${group.logic} group`}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.75}>
          <Button
            size="small"
            variant="text"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => addCondition("ssids", "equals", "", group.id)}
          >
            Add Filter
          </Button>
          {depth < 2 ? (
            <Button
              size="small"
              variant="text"
              startIcon={<CreateNewFolderOutlinedIcon fontSize="small" />}
              onClick={() =>
                addNestedGroup(group.logic === "AND" ? "OR" : "AND", group.id)
              }
            >
              Add Group
            </Button>
          ) : null}
          {!isRoot ? (
            <IconButton
              size="small"
              onClick={() => removeNode(group.id)}
              aria-label="Remove group"
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>
      </Stack>

      {group.children.length === 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
          No conditions defined. Click &quot;Add Filter&quot; or select a quick preset below.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {group.children.map((child) =>
            child.kind === "condition" ? (
              <ConditionRow
                key={child.id}
                condition={child}
                options={options}
                onChange={(patch) => updateCondition(child.id, patch)}
                onRemove={() => removeNode(child.id)}
              />
            ) : (
              <GroupEditor
                key={child.id}
                group={child}
                isRoot={false}
                depth={depth + 1}
                options={options}
              />
            ),
          )}
        </Stack>
      )}
    </Box>
  );
}

export function FilterBuilder({ options }: FilterBuilderProps) {
  const [expanded, setExpanded] = useState(true);
  const filterTree = useInvestigationStore((s) => s.filterTree);
  const searchFields = useInvestigationStore((s) => s.searchFields);
  const setSearchFields = useInvestigationStore((s) => s.setSearchFields);
  const addCondition = useInvestigationStore((s) => s.addCondition);

  const toggleSearchField = (field: SearchField) => {
    if (searchFields.includes(field)) {
      if (searchFields.length > 1) {
        setSearchFields(searchFields.filter((f) => f !== field));
      }
    } else {
      setSearchFields([...searchFields, field]);
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={1}
        mb={expanded ? 1.5 : 0}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <FilterListIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2" fontWeight={700}>
            Investigation Query Builder
          </Typography>
          <Typography variant="caption" color="text.secondary">
            · Compose multi-field AND / OR logic
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={searchFields.includes("raw_message")}
                onChange={() => toggleSearchField("raw_message")}
              />
            }
            label={<Typography variant="caption">Raw Message</Typography>}
            sx={{ mr: 0.5 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={searchFields.includes("metadata")}
                onChange={() => toggleSearchField("metadata")}
              />
            }
            label={<Typography variant="caption">Metadata JSON</Typography>}
            sx={{ mr: 1 }}
          />
          <Button
            size="small"
            variant="text"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Collapse" : "Expand"}
          </Button>
        </Stack>
      </Stack>

      {expanded ? (
        <Stack spacing={1.5}>
          <GroupEditor
            group={filterTree}
            isRoot
            depth={0}
            options={options}
          />

          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            alignItems="center"
            useFlexGap
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Quick add:
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => addCondition("statuses", "equals", "FAIL")}
            >
              Status = FAIL
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => addCondition("recovered_only", "is", "true")}
            >
              Recovered Only
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => addCondition("locations", "equals", "Unknown")}
            >
              Unknown Location
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => addCondition("ux_available", "is", "false")}
            >
              UX Missing
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => addCondition("invalid_devices_only", "is", "true")}
            >
              Invalid Devices
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => addCondition("failure_count", "gte", "5")}
            >
              Failures &ge; 5
            </Button>
          </Stack>
        </Stack>
      ) : null}
    </Box>
  );
}
