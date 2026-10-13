import React from "react";
import {
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Alert,
	Autocomplete,
	Box,
	Button,
	Chip,
	IconButton,
	InputAdornment,
	MenuItem,
	Switch,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import {
	ExpandMore as ExpandMoreIcon,
	ContentCopy as ContentCopyIcon,
	Search as SearchIcon,
	Clear as ClearIcon,
	Visibility as VisibilityIcon,
	VisibilityOff as VisibilityOffIcon,
	Undo as UndoIcon,
} from "@mui/icons-material";
import { copyToClipboard } from "../utils/clipboard";
import { prettifyKey } from "../utils/prettifyKey";
import { detectSettingType, toBoolString } from "../utils/settingType";
import { cardAccordionSx } from "./cardStyles";

const DEFAULT_LABEL = "Not set (the game's default)";

/** The dropdown for a setting that has only a few values. Never loses a value the file already holds. */
function ChoiceControl({ entry, value, onChange }) {
	const options = entry.options;
	const known = options.some((o) => o.value === value);
	const labelOf = (v) => options.find((o) => o.value === v)?.label ?? v;

	// A list that grows with game updates or mods: pick from it, or type something else.
	if (entry.allowCustom) {
		return (
			<Autocomplete
				freeSolo
				disableClearable
				size="small"
				options={options.map((o) => o.value).filter((v) => v !== "")}
				value={value}
				getOptionLabel={(v) => (options.some((o) => o.value === v) && labelOf(v) !== v ? `${v} (${labelOf(v)})` : String(v))}
				onChange={(_, v) => onChange(v ?? "")}
				onInputChange={(_, v, reason) => reason === "input" && onChange(v)}
				renderInput={(params) => <TextField {...params} placeholder={entry.placeholder} />}
			/>
		);
	}

	const showDefault = entry.clearable || value === "";
	return (
		<TextField select size="small" fullWidth value={value} onChange={(e) => onChange(e.target.value)} slotProps={{ select: { displayEmpty: true } }}>
			{showDefault && !options.some((o) => o.value === "") && (
				<MenuItem value="">
					<em>{DEFAULT_LABEL}</em>
				</MenuItem>
			)}
			{!known && value !== "" && <MenuItem value={value}>Custom: {value}</MenuItem>}
			{options.map((o) => (
				<MenuItem key={o.value} value={o.value}>
					{o.label}
				</MenuItem>
			))}
		</TextField>
	);
}

function SettingControl({ settingKey, value, onChange, entry }) {
	const isPassword = /password|passwd|token|secret/i.test(settingKey);
	const type = entry?.type ?? detectSettingType(value);
	const [copyTooltip, setCopyTooltip] = React.useState("Copy");
	const [shown, setShown] = React.useState(false);

	const handleCopy = (e) => {
		e.stopPropagation();
		copyToClipboard(String(value), setCopyTooltip);
		setTimeout(() => setCopyTooltip("Copy"), 1500);
	};

	if (entry?.options) return <ChoiceControl entry={entry} value={String(value)} onChange={onChange} />;

	if (type === "boolean") {
		const checked = String(value).trim().toLowerCase() === "true";
		return <Switch checked={checked} onChange={(e) => onChange(toBoolString(e.target.checked, value))} />;
	}

	return (
		<TextField
			size="small"
			fullWidth
			type={isPassword && !shown ? "password" : type === "number" ? "number" : "text"}
			value={value}
			placeholder={entry?.placeholder}
			onChange={(e) => onChange(e.target.value)}
			autoComplete="off"
			slotProps={{
				htmlInput: type === "number" ? { onWheel: (e) => e.target.blur() } : undefined,
				input: isPassword
					? {
							endAdornment: (
								<InputAdornment position="end">
									<Tooltip title={shown ? "Hide" : "Show"}>
										<IconButton size="small" aria-label={shown ? "Hide the value" : "Show the value"} onClick={() => setShown((v) => !v)}>
											{shown ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <VisibilityIcon sx={{ fontSize: 16 }} />}
										</IconButton>
									</Tooltip>
									<Tooltip title={copyTooltip}>
										<IconButton size="small" aria-label="Copy the value" onClick={handleCopy}>
											<ContentCopyIcon sx={{ fontSize: 16 }} />
										</IconButton>
									</Tooltip>
								</InputAdornment>
							),
						}
					: undefined,
			}}
		/>
	);
}

function StructuredListEditor({ entry, onChange }) {
	const items = Array.isArray(entry.value) ? entry.value : [];

	const updateItem = (index, key, rawNewValue) => {
		const originalValue = items[index][key];
		const type = detectSettingType(originalValue);
		let coerced = rawNewValue;
		if (type === "boolean") coerced = String(rawNewValue).toLowerCase() === "true";
		else if (type === "number") coerced = rawNewValue === "" ? rawNewValue : Number(rawNewValue);

		const next = items.map((item, i) => (i === index ? { ...item, [key]: coerced } : item));
		onChange(next);
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{items.map((item, index) => (
				<Box key={index} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
					<Typography variant="subtitle2" sx={{ mb: 1 }}>
						{item.name || `Entry ${index + 1}`}
					</Typography>
					<Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
						{Object.entries(item).map(([key, value]) => (
							<Box key={key}>
								<Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
									{prettifyKey(key)}
								</Typography>
								<SettingControl settingKey={key} value={String(value)} onChange={(newVal) => updateItem(index, key, newVal)} />
							</Box>
						))}
					</Box>
				</Box>
			))}
		</Box>
	);
}

const matches = (entry, words) => {
	if (words.length === 0) return true;
	const hay = `${entry.label} ${entry.key} ${entry.description ?? ""}`.toLowerCase();
	return words.every((w) => hay.includes(w));
};

/**
 * A game's settings, in groups. Each setting says what it is for underneath its name. A setting with only a few values is a
 * dropdown. The search box finds a setting by its name, its key or its explanation.
 *
 * @param {{ groups: Array<{ name: string, settings: object[] }>, onChange: (entry, value) => void, undocumented?: number,
 *           changedIds?: Set<string>, onRevert?: (entry) => void }} props
 */
function ConfigForm({ groups, onChange, undocumented = 0, changedIds = null, onRevert = null }) {
	const [expanded, setExpanded] = React.useState(() => new Set(groups[0] ? [groups[0].name] : []));
	const [query, setQuery] = React.useState("");

	const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	const searching = words.length > 0;
	const shown = React.useMemo(
		() => groups.map((g) => ({ ...g, settings: g.settings.filter((e) => matches(e, words)) })).filter((g) => g.settings.length > 0),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[groups, query],
	);
	const total = groups.reduce((n, g) => n + g.settings.length, 0);
	const found = shown.reduce((n, g) => n + g.settings.length, 0);

	const toggle = (name) =>
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(name)) next.delete(name);
			else next.add(name);
			return next;
		});

	return (
		<Box>
			{undocumented > 0 && (
				<Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
					{undocumented === 1 ? "1 setting here has" : `${undocumented} settings here have`} no explanation. These come from mods or plugins, or from a game update newer than this panel knows about.{" "}
					<strong>Mods will not have explanations</strong>; they still work, and you can edit them like the others.
				</Alert>
			)}

			<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 2 }}>
				<TextField
					size="small"
					placeholder={`Search ${total} settings`}
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					sx={{ flex: "1 1 260px", maxWidth: 460 }}
					slotProps={{
						htmlInput: { "aria-label": "Search settings" },
						input: {
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon fontSize="small" />
								</InputAdornment>
							),
							endAdornment: query ? (
								<IconButton size="small" aria-label="Clear search" onClick={() => setQuery("")}>
									<ClearIcon fontSize="small" />
								</IconButton>
							) : null,
						},
					}}
				/>
				{searching ? (
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						{found === 0 ? "Nothing matches." : `${found} of ${total} match`}
					</Typography>
				) : (
					<>
						<Button size="small" onClick={() => setExpanded(new Set(groups.map((g) => g.name)))}>
							Open all
						</Button>
						<Button size="small" onClick={() => setExpanded(new Set())}>
							Close all
						</Button>
					</>
				)}
			</Box>

			{shown.map((group) => (
				<Accordion key={group.name} expanded={searching || expanded.has(group.name)} onChange={() => toggle(group.name)} disableGutters sx={cardAccordionSx}>
					<AccordionSummary expandIcon={<ExpandMoreIcon />}>
						<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
							<Typography variant="subtitle1">{group.name}</Typography>
							<Chip size="small" variant="outlined" label={group.settings.length} />
							{changedIds && group.settings.some((e) => changedIds.has(e.id)) && <Chip size="small" color="warning" label="changed" />}
						</Box>
					</AccordionSummary>
					<AccordionDetails>
						<Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
							{group.settings.map((entry) =>
								entry.structured ? (
									<Box key={entry.id}>
										<Typography variant="subtitle2" sx={{ mb: 1 }}>
											{entry.label}
										</Typography>
										<StructuredListEditor entry={entry} onChange={(newArr) => onChange(entry, newArr)} />
									</Box>
								) : (
									<Box key={entry.id} sx={{ display: "flex", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
										<Box sx={{ flex: { xs: "1 1 100%", sm: "1 1 320px" }, minWidth: 0 }}>
											<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
												<Typography variant="body2" sx={{ fontWeight: 600 }}>
													{entry.label}
												</Typography>
												{changedIds?.has(entry.id) && <Chip size="small" color="warning" label="changed" sx={{ height: 18, fontSize: 11 }} />}
												{!entry.documented && (
													<Tooltip title="No explanation: this is probably from a mod or a newer game version.">
														<Chip size="small" variant="outlined" label="no explanation" sx={{ height: 18, fontSize: 11 }} />
													</Tooltip>
												)}
											</Box>
											{entry.description && (
												<Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25, lineHeight: 1.45 }}>
													{entry.description}
												</Typography>
											)}
											<Typography variant="caption" sx={{ color: "text.disabled", fontFamily: "monospace", fontSize: 11 }}>
												{entry.key}
											</Typography>
										</Box>
										<Box sx={{ flex: "0 1 320px", minWidth: 200, width: { xs: "100%", sm: "auto" }, display: "flex", alignItems: "center", gap: 0.5 }}>
											<Box sx={{ flex: 1, minWidth: 0 }}>
												<SettingControl settingKey={entry.key} value={entry.value} onChange={(newVal) => onChange(entry, newVal)} entry={entry} />
											</Box>
											{onRevert && changedIds?.has(entry.id) && (
												<Tooltip title="Undo this change">
													<IconButton size="small" aria-label={`Undo the change to ${entry.label}`} onClick={() => onRevert(entry)}>
														<UndoIcon fontSize="small" />
													</IconButton>
												</Tooltip>
											)}
										</Box>
									</Box>
								),
							)}
						</Box>
					</AccordionDetails>
				</Accordion>
			))}
		</Box>
	);
}

export default ConfigForm;
