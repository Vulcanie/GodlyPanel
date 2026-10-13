import React from "react";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Alert,
	Box,
	Button,
	CircularProgress,
	FormControlLabel,
	Paper,
	Switch,
	Tab,
	Tabs,
	TextareaAutosize,
	Typography,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon, Save as SaveIcon, Undo as UndoIcon, Description as ScriptIcon, RestartAlt as RestartIcon } from "@mui/icons-material";
import ConfigForm from "./ConfigForm";
import ConfigHistoryPanel from "./ConfigHistoryPanel";
import LaunchReference from "./LaunchReference";
import EmptyState from "./ui/EmptyState";
import { cardAccordionSx } from "./cardStyles";
import { useToast } from "../ToastContext";
import { api } from "../api/client";
import { parseIni, serializeIni } from "../configParsers/ini";
import { parseProperties, serializeProperties } from "../configParsers/properties";
import { parseXmlProperties, serializeXmlProperties } from "../configParsers/xmlProperties";
import { parseJsonConfig, serializeJsonConfig, flattenJsonEntries } from "../configParsers/json";
import { parsePalworldStruct, serializePalworldStruct } from "../configParsers/palworldStruct";
import { parseValheimLaunch, serializeValheimLaunch, valheimLaunchEntries } from "../configParsers/valheimLaunch";
import { parseConvarCfg, serializeConvarCfg, convarEntries } from "../configParsers/convarCfg";
import { parseLaunchArgs, serializeLaunchArgs, launchArgsEntries } from "../configParsers/launchArgs";
import { annotateEntries, getCatalogKeys, getFileParser, getLaunchDef, getMissingFileNote, getPrimaryFileName, getStructuredPaths } from "../configCatalog";
import { detectSettingType } from "../utils/settingType";

// Each parser: read the file's text into something with entries, list the settings, and write edits back into the text without
// disturbing anything else in it. `ctx` carries what a parser needs to know about the game.
const PARSERS = {
	ini: { parse: parseIni, serialize: serializeIni, getEntries: (p) => p.entries },
	properties: { parse: parseProperties, serialize: serializeProperties, getEntries: (p) => p.entries },
	xml: { parse: parseXmlProperties, serialize: serializeXmlProperties, getEntries: (p) => p.entries },
	json: { parse: parseJsonConfig, serialize: serializeJsonConfig, getEntries: (p, structuredPaths) => flattenJsonEntries(p, new Set(structuredPaths)) },
	valheimLaunch: { parse: parseValheimLaunch, serialize: serializeValheimLaunch, getEntries: valheimLaunchEntries },
	palworld: { parse: parsePalworldStruct, serialize: serializePalworldStruct, getEntries: (p) => p.entries },
	convar: { parse: parseConvarCfg, serialize: serializeConvarCfg, getEntries: (p, _s, ctx) => convarEntries(p, ctx.catalogKeys) },
	launchArgs: { parse: (text, ctx) => parseLaunchArgs(text, ctx.launchDef), serialize: serializeLaunchArgs, getEntries: launchArgsEntries },
};

const fileTitle = (gameType, name) => (name === "config" ? (getPrimaryFileName(gameType) ?? "Settings") : name);

/** The settings of a text by id, so two versions of a file can be compared setting by setting. */
function valuesOf(parserDef, text, ctx) {
	const out = new Map();
	if (!parserDef || !text) return out;
	try {
		const parsed = parserDef.parse(text, ctx);
		for (const e of parserDef.getEntries(parsed, ctx.structuredPaths, ctx)) out.set(e.id, e.value);
	} catch {
		// A file that doesn't parse has no settings to compare.
	}
	return out;
}

/**
 * A server's settings: the game's own settings file(s) as a form with an explanation for every setting, the launch options for
 * games that are set up on their command line, and the raw text of each when you want it. Saves one file at a time.
 */
function ServerSettingsTab({ serverName, serverStatus, onEditBatchFiles, onAction }) {
	const toast = useToast();
	const gameType = serverStatus?.type;
	const online = Boolean(serverStatus?.online);

	const [names, setNames] = React.useState(null);
	const [texts, setTexts] = React.useState({}); // what is in the editor
	const [saved, setSaved] = React.useState({}); // what is on disk
	const [missing, setMissing] = React.useState({}); // file name -> true when the game hasn't made it yet
	const [active, setActive] = React.useState(0);
	const [raw, setRaw] = React.useState(false);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState(null);
	const [saving, setSaving] = React.useState(false);
	const [justSaved, setJustSaved] = React.useState(false);

	const load = React.useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const info = await api.get(`/api/server/${encodeURIComponent(serverName)}?t=${Date.now()}`);
			const list = info.configNames ?? [];
			// All the files at once; one that isn't there yet doesn't stop the others.
			const results = await Promise.all(
				list.map(async (name) => {
					try {
						const r = await api.get(`/api/config/${encodeURIComponent(serverName)}?file=${encodeURIComponent(name)}&t=${Date.now()}`);
						return [name, { text: r.content ?? "" }];
					} catch (e) {
						if (e.code === "file_missing") return [name, { text: "", missing: true }];
						return [name, { text: "", failed: e.message }];
					}
				}),
			);
			setNames(list);
			setTexts(Object.fromEntries(results.map(([n, r]) => [n, r.text])));
			setSaved(Object.fromEntries(results.map(([n, r]) => [n, r.text])));
			setMissing(Object.fromEntries(results.filter(([, r]) => r.missing).map(([n]) => [n, true])));
			const failed = results.find(([, r]) => r.failed);
			if (failed) setError(`Couldn't read ${failed[0]}: ${failed[1].failed}`);
		} catch (e) {
			setError(e.message || "Couldn't reach the panel to read this server's settings.");
		} finally {
			setLoading(false);
		}
	}, [serverName]);

	React.useEffect(() => {
		load();
	}, [load]);

	const name = names?.[active];
	const parserType = name ? getFileParser(gameType, name) : null;
	const parserDef = parserType ? PARSERS[parserType] : null;
	const text = name ? (texts[name] ?? "") : "";
	const savedText = name ? (saved[name] ?? "") : "";
	const dirty = Boolean(name) && text !== savedText;
	const dirtyNames = names?.filter((n) => texts[n] !== saved[n]) ?? [];

	const ctx = React.useMemo(
		() => ({
			structuredPaths: name ? getStructuredPaths(gameType, name) : [],
			catalogKeys: name ? getCatalogKeys(gameType, name) : [],
			launchDef: getLaunchDef(gameType),
		}),
		[gameType, name],
	);

	const parsed = React.useMemo(() => {
		if (!parserDef || !text) return null;
		try {
			return parserDef.parse(text, ctx);
		} catch {
			return null;
		}
	}, [parserDef, text, ctx]);

	const annotated = React.useMemo(() => {
		if (!parsed || !parserDef || !name) return { groups: [], undocumented: 0 };
		return annotateEntries(gameType, name, parserDef.getEntries(parsed, ctx.structuredPaths, ctx));
	}, [parsed, parserDef, name, gameType, ctx]);

	// Which settings differ from what is on disk, so they can be marked and undone one by one.
	const savedValues = React.useMemo(() => valuesOf(parserDef, savedText, ctx), [parserDef, savedText, ctx]);
	const changedIds = React.useMemo(() => {
		const ids = new Set();
		if (!dirty) return ids;
		for (const group of annotated.groups) for (const e of group.settings) if (savedValues.has(e.id) ? JSON.stringify(savedValues.get(e.id)) !== JSON.stringify(e.value) : String(e.value ?? "") !== "") ids.add(e.id);
		return ids;
	}, [annotated, savedValues, dirty]);

	const applyEdit = (entry, rawNewValue) => {
		if (!parserDef || !parsed || !name) return;
		let newValue = rawNewValue;
		if (parserType === "json" && !entry.structured) {
			if (entry.rawJson) {
				try {
					newValue = JSON.parse(rawNewValue);
				} catch {
					newValue = rawNewValue;
				}
			} else {
				const type = detectSettingType(entry.value);
				if (type === "boolean") newValue = String(rawNewValue).toLowerCase() === "true";
				else if (type === "number") newValue = rawNewValue === "" ? rawNewValue : Number(rawNewValue);
			}
		}
		const next = parserDef.serialize(parsed, { [entry.id]: newValue }, ctx);
		setTexts((prev) => ({ ...prev, [name]: next }));
		setJustSaved(false);
	};

	const revert = (entry) => {
		const before = savedValues.get(entry.id);
		applyEdit(entry, before === undefined ? "" : entry.structured ? before : String(before ?? ""));
	};

	const save = React.useCallback(async () => {
		if (!name || saving) return;
		setSaving(true);
		try {
			const r = await api.post(`/api/config/${encodeURIComponent(serverName)}`, { fileName: name, content: text });
			setSaved((prev) => ({ ...prev, [name]: text }));
			setMissing((prev) => ({ ...prev, [name]: false }));
			setJustSaved(true);
			toast(r.message || `${fileTitle(gameType, name)} saved.`, "success");
		} catch (e) {
			toast(e.message || "The file could not be saved.", "error");
		} finally {
			setSaving(false);
		}
	}, [name, saving, serverName, text, gameType, toast]);

	const discard = () => {
		setTexts((prev) => ({ ...prev, [name]: savedText }));
		setJustSaved(false);
	};

	// Ctrl+S saves, and leaving with unsaved changes asks first.
	React.useEffect(() => {
		const onKey = (e) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && dirty) {
				e.preventDefault();
				save();
			}
		};
		const onUnload = (e) => {
			if (dirtyNames.length > 0) e.preventDefault();
		};
		window.addEventListener("keydown", onKey);
		window.addEventListener("beforeunload", onUnload);
		return () => {
			window.removeEventListener("keydown", onKey);
			window.removeEventListener("beforeunload", onUnload);
		};
	}, [dirty, dirtyNames.length, save]);

	if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 6 }} />;
	if (error && !names) {
		return (
			<Alert severity="error" action={<Button onClick={load}>Try again</Button>}>
				{error}
			</Alert>
		);
	}

	const hasFiles = names && names.length > 0;
	const parseFailed = Boolean(parserDef && text && !parsed);
	const showRaw = raw || parseFailed || !parserDef;
	const missingNote = name && missing[name] ? getMissingFileNote(gameType, name) : null;
	const launchGame = Boolean(getLaunchDef(gameType));

	return (
		<Box sx={{ pb: 2 }}>
			{error && (
				<Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}

			{!hasFiles ? (
				<>
					<EmptyState icon={<ScriptIcon fontSize="large" />} title="This server has no settings file the panel can edit" action={onEditBatchFiles && <Button variant="outlined" onClick={onEditBatchFiles}>Edit the start script</Button>}>
						Its settings, if it has any, are on the command that starts it. You can change that in the start script.
					</EmptyState>
					<LaunchReference gameType={gameType} onEditStartScript={onEditBatchFiles} />
				</>
			) : (
				<>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", borderBottom: 1, borderColor: "divider", mb: 2 }}>
						{names.length > 1 ? (
							<Tabs value={active} onChange={(_, v) => { setActive(v); setRaw(false); setJustSaved(false); }} variant="scrollable" scrollButtons="auto" sx={{ minHeight: 0, maxWidth: "100%", flex: 1 }}>
								{names.map((n) => (
									<Tab key={n} label={`${fileTitle(gameType, n)}${texts[n] !== saved[n] ? " •" : ""}`} data-testid={`config-file-${n}`} />
								))}
							</Tabs>
						) : (
							<Typography variant="subtitle1" sx={{ flex: 1, py: 1 }}>
								{fileTitle(gameType, name)}
							</Typography>
						)}
						{onEditBatchFiles && (
							<Button size="small" startIcon={<ScriptIcon />} onClick={onEditBatchFiles}>
								Edit start script
							</Button>
						)}
						{parserDef && !parseFailed && (
							<FormControlLabel sx={{ mr: 0 }} control={<Switch checked={showRaw} onChange={(e) => setRaw(e.target.checked)} />} label="Edit as text" />
						)}
					</Box>

					{missingNote && (
						<Alert severity="info" sx={{ mb: 2 }}>
							This file doesn't exist yet. {missingNote}
						</Alert>
					)}
					{parseFailed && (
						<Alert severity="warning" sx={{ mb: 2 }}>
							This file couldn't be read as settings (it may have invalid syntax), so it's shown as text.
						</Alert>
					)}
					{parserType === "launchArgs" || parserType === "valheimLaunch" ? (
						parsed && parsed.at === -1 ? (
							<Alert severity="warning" sx={{ mb: 2 }}>
								Couldn't find the line that starts the game in this start script, so there is nothing to show as a form. Use "Edit as text" to change the script, or "Edit start script".
							</Alert>
						) : (
							<Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
								These are the arguments on the line of the start script that launches the game. Changing one rewrites only that line; the rest of the script stays as it is. Changes apply the next time the server starts.
							</Typography>
						)
					) : null}

					{showRaw ? (
						<TextareaAutosize
							value={text}
							onChange={(e) => {
								setTexts((prev) => ({ ...prev, [name]: e.target.value }));
								setJustSaved(false);
							}}
							minRows={22}
							spellCheck={false}
							aria-label={`${fileTitle(gameType, name)} as text`}
							style={{ width: "100%", boxSizing: "border-box", resize: "vertical", background: "transparent", color: "inherit", fontFamily: "Cascadia Code, Consolas, monospace", fontSize: 13, lineHeight: 1.55, border: "1px solid rgba(148,163,200,.3)", borderRadius: 12, padding: 14, tabSize: 4 }}
						/>
					) : annotated.groups.length === 0 && !(parserType === "launchArgs" || parserType === "valheimLaunch") ? (
						<Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
							No editable settings found in this file.
						</Typography>
					) : (
						<ConfigForm key={`${name}`} groups={annotated.groups} onChange={applyEdit} undocumented={annotated.undocumented} changedIds={changedIds} onRevert={revert} />
					)}

					{/* Save bar: always in reach while scrolling a long form. */}
					<Paper
						elevation={0}
						sx={{
							position: "sticky",
							bottom: 16,
							zIndex: 5,
							mt: 3,
							px: 2,
							py: 1.25,
							display: "flex",
							alignItems: "center",
							gap: 1.5,
							flexWrap: "wrap",
							border: 1,
							borderColor: dirty ? "warning.main" : "divider",
							borderRadius: 4,
							backgroundColor: (t) => t.custom.glass,
							backdropFilter: "blur(14px)",
							boxShadow: (t) => t.custom.shadow,
						}}
					>
						<Typography variant="body2" sx={{ flex: 1, color: dirty ? "warning.main" : "text.secondary" }}>
							{dirty
								? `You have unsaved changes${changedIds.size ? ` (${changedIds.size})` : ""} in ${fileTitle(gameType, name)}.${dirtyNames.length > 1 ? ` ${dirtyNames.length} files have changes.` : ""}`
								: justSaved
									? "Saved."
									: "No changes."}
						</Typography>
						<Button startIcon={<UndoIcon />} disabled={!dirty || saving} onClick={discard}>
							Discard
						</Button>
						<Button variant="contained" startIcon={<SaveIcon />} disabled={!dirty || saving} onClick={save} data-testid="save-config">
							{saving ? "Saving…" : `Save ${fileTitle(gameType, name)}`}
						</Button>
					</Paper>

					{justSaved && online && (
						<Alert
							severity="info"
							sx={{ mt: 2 }}
							action={
								onAction && (
									<Button color="inherit" size="small" startIcon={<RestartIcon />} onClick={() => onAction(serverName, "restart")}>
										Restart now
									</Button>
								)
							}
						>
							{serverName} is running. Most games read their settings only when they start, so restart it for this to take effect. (A few write their settings back when they stop, which would undo this: save with the server stopped for those.)
						</Alert>
					)}

					{launchGame && (
						<Box sx={{ mt: 3 }}>
							<LaunchReference gameType={gameType} onEditStartScript={onEditBatchFiles} defaultOpen={name === "Launch options"} />
						</Box>
					)}

					<Box sx={{ mt: launchGame ? 0 : 3 }}>
						<Accordion disableGutters sx={cardAccordionSx}>
							<AccordionSummary expandIcon={<ExpandMoreIcon />}>
								<Typography variant="subtitle1">Version history</Typography>
								<Typography variant="body2" sx={{ color: "text.secondary", ml: 2 }}>
									Every save is kept, and any version can be put back
								</Typography>
							</AccordionSummary>
							<AccordionDetails>
								<ConfigHistoryPanel serverName={serverName} serverStatus={serverStatus} />
							</AccordionDetails>
						</Accordion>
					</Box>
				</>
			)}
		</Box>
	);
}

export default ServerSettingsTab;
