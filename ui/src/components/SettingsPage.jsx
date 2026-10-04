import React from "react";
import {
	Box,
	Button,
	Typography,
	Paper,
	TextField,
	MenuItem,
	Switch,
	FormControlLabel,
	Alert,
	CircularProgress,
	Divider,
	Chip,
	LinearProgress,
	InputAdornment,
	IconButton,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon, Search as SearchIcon, Clear as ClearIcon } from "@mui/icons-material";
import CollapsibleSection, { useSectionState } from "./CollapsibleSection";
import { api } from "../api/client";
import AppearanceSettings from "./AppearanceSettings";
import FolderField from "./FolderField";
import PanelUpdateCard from "./PanelUpdateCard";
import NotificationEvents from "./NotificationEvents";
import BackupDestinations from "./BackupDestinations";
import DiscordBotCard from "./DiscordBotCard";
import RemoteAccessCard from "./RemoteAccessCard";
import CommunityAccessCard from "./CommunityAccessCard";
import CommunityViewCard from "./CommunityViewCard";
import { formatBytes } from "../utils/format";

// The form is generated from the schema the server sends, so it can't drift
// out of step with what's actually honoured — adding a setting on the server
// makes it appear here with its own label, limits and restart behaviour.

const GROUP_LABELS = {
	http: "Access",
	network: "Network",
	paths: "Folders",
	portAllocation: "Ports",
	polling: "Refresh rates",
	storage: "Storage",
	servers: "New servers",
	discord: "Discord",
	updates: "Panel updates",
	notifications: "Notifications",
	backups: "Backups",
	startup: "Starting with Windows",
	recovery: "Crash recovery",
	metrics: "Charts and history",
};

// What each group of settings is for, shown beside its name while it is folded.
const GROUP_HINTS = {
	http: "The panel's port, and who can reach it",
	network: "Which addresses may open the panel",
	paths: "Where servers, SteamCMD and tools live",
	portAllocation: "How new servers get their ports",
	polling: "How often the panel checks things",
	storage: "A size limit for your servers",
	servers: "Defaults for new servers",
	discord: "Status posts and the admin role",
	updates: "Checking for new panel versions",
	notifications: "Windows, webhook and email alerts",
	backups: "Where backups go and how many are kept",
	startup: "Starting with Windows, and server start order",
	recovery: "When a crashed server is restarted",
	metrics: "The history behind each server's charts",
};

// Words people might search for that the name doesn't contain.
const GROUP_WORDS = {
	http: "web port address lan network access listen computer",
	network: "allow vpn tailscale cidr host name dns",
	paths: "folder directory install steamcmd jcmd location",
	portAllocation: "port spacing reserved",
	polling: "interval refresh rate speed cpu memory ram stats steam update check",
	storage: "disk space limit quota size warn",
	servers: "rcon password window mode default hidden minimized",
	discord: "webhook status post admin role",
	updates: "version release github prerelease alpha beta",
	notifications: "alert email smtp mail webhook windows toast crash disk",
	backups: "backup keep days count free space folder",
	startup: "windows boot login tray autostart delay",
	recovery: "crash restart give up auto restart unresponsive hang",
	metrics: "history chart graph cpu memory players readings sample seconds",
};

const SECRET_FIELDS = [
	{ key: "discordWebhookUrl", label: "Discord status webhook" },
	{ key: "discordBotToken", label: "Discord bot token" },
	{ key: "discordUpdateWebhookUrl", label: "Discord update webhook" },
	{ key: "curseForgeApiKey", label: "CurseForge API key" },
	{ key: "fixedRconPassword", label: "Fixed RCON password" },
	{ key: "alertWebhookUrl", label: "Alert webhook (Discord, Slack, ...)" },
	{ key: "smtpPassword", label: "Mail account password" },
];

function valueAt(obj, dotted) {
	return dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function nest(dotted, value) {
	const keys = dotted.split(".");
	const out = {};
	let cur = out;
	keys.forEach((k, i) => {
		if (i === keys.length - 1) cur[k] = value;
		else cur = cur[k] = {};
	});
	return out;
}

function SettingsPage({ onBack }) {
	const [data, setData] = React.useState(null);
	const [storage, setStorage] = React.useState(null);
	const [edits, setEdits] = React.useState({});
	const [secretEdits, setSecretEdits] = React.useState({});
	const [error, setError] = React.useState(null);
	const [notice, setNotice] = React.useState(null);
	const [restartNeeded, setRestartNeeded] = React.useState([]);
	const [busy, setBusy] = React.useState(false);
	const [installingSteam, setInstallingSteam] = React.useState(false);
	const [openMap, setOpenMap] = useSectionState();
	const [query, setQuery] = React.useState("");

	const load = React.useCallback(async () => {
		try {
			const [settings, storageState] = await Promise.all([
				api.get("/api/settings"),
				api.get("/api/storage").catch(() => null),
			]);
			setData(settings);
			setStorage(storageState);
		} catch (e) {
			setError(e.message);
		}
	}, []);

	React.useEffect(() => {
		load();
	}, [load]);

	const current = (spec) =>
		spec.path in edits ? edits[spec.path] : valueAt(data.config, spec.path);

	const setField = (spec, value) =>
		setEdits((prev) => ({ ...prev, [spec.path]: value }));

	const save = async () => {
		setBusy(true);
		setError(null);
		setNotice(null);
		try {
			let patch = {};
			for (const [dotted, value] of Object.entries(edits)) {
				patch = mergeDeep(patch, nest(dotted, value));
			}

			if (Object.keys(patch).length > 0) {
				const result = await api.put("/api/settings", patch);
				setRestartNeeded(result.restartRequired ?? []);
				if (result.issues?.length) {
					setNotice(result.issues.join(" "));
				}
			}

			const secretPatch = Object.fromEntries(
				Object.entries(secretEdits).filter(([, v]) => v !== ""),
			);
			if (Object.keys(secretPatch).length > 0) {
				await api.put("/api/settings/secrets", secretPatch);
			}

			setEdits({});
			setSecretEdits({});
			await load();
			if (!notice) setNotice("Settings saved.");
		} catch (e) {
			setError(e.message);
		} finally {
			setBusy(false);
		}
	};

	const installSteamCmd = async () => {
		setInstallingSteam(true);
		setError(null);
		try {
			await api.post("/api/settings/steamcmd/install");
			setNotice("SteamCMD is installed and ready.");
			await load();
		} catch (e) {
			setError(e.message);
		} finally {
			setInstallingSteam(false);
		}
	};

	const rescan = async () => {
		await api.post("/api/settings/storage/rescan");
		setNotice("Recalculating storage in the background — this can take a few minutes.");
	};

	if (!data) {
		return <CircularProgress sx={{ display: "block", mx: "auto", mt: 8 }} />;
	}

	const groups = {};
	for (const spec of data.fields) {
		const group = spec.path.split(".")[0];
		(groups[group] ||= []).push(spec);
	}

	const dirty = Object.keys(edits).length > 0 || Object.keys(secretEdits).length > 0;

	// ---- the page as a list of sections, so it can be searched and folded ----------------------------
	// Each has a name, a one-line hint (shown while it is folded), and words people might look for that aren't in
	// its name. Settings made from the server's schema also match on each setting's label and help text.
	const sections = [];
	const add = (id, title, hint, words, render, fields = null) => sections.push({ id: `settings:${id}`, title, hint, words, render, fields });

	if (storage) {
		add("storage-summary", "Storage use", "How much disk your servers use", "storage disk space size quota usage folders", () => (
			<Paper sx={{ p: 2 }}>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
					<Typography variant="subtitle2" sx={{ flex: 1 }}>
						Storage
					</Typography>
					{storage.stale && <Chip size="small" label="Recalculating" />}
					<Button size="small" onClick={rescan}>
						Recalculate
					</Button>
				</Box>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					{formatBytes(storage.totals.bytes)} across {storage.roots.length} folder
					{storage.roots.length === 1 ? "" : "s"}
					{storage.quotaBytes > 0 && ` of a ${formatBytes(storage.quotaBytes)} limit`}
					{storage.volumes?.[0] &&
						` · ${formatBytes(storage.volumes[0].freeBytes)} free on ${storage.volumes[0].root}`}
				</Typography>
				{storage.quotaBytes > 0 && (
					<LinearProgress
						variant="determinate"
						value={Math.min(100, (storage.usedRatio ?? 0) * 100)}
						sx={{ mt: 1, height: 6, borderRadius: 3 }}
					/>
				)}
			</Paper>
		));
	}

	add("steamcmd", "SteamCMD", data.steamCmdInstalled ? "Installed" : "Not installed yet", "steamcmd steam download install valve game server tool", () => (
		<Paper sx={{ p: 2 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
				<Typography variant="subtitle2" sx={{ flex: 1 }}>
					SteamCMD
				</Typography>
				<Chip
					size="small"
					color={data.steamCmdInstalled ? "success" : "warning"}
					label={data.steamCmdInstalled ? "Installed" : "Not installed"}
				/>
			</Box>
			<Typography variant="body2" sx={{ color: "text.secondary", my: 1 }}>
				{data.steamCmdInstalled
					? `Using ${data.resolved.paths.steamCmdPath}`
					: "Valve's tool for installing and updating game servers. It isn't bundled — it's downloaded from Valve once, on request. Or point the SteamCMD location setting below at a copy you already have."}
			</Typography>
			{!data.steamCmdInstalled && (
				<Button size="small" variant="outlined" disabled={installingSteam} onClick={installSteamCmd}>
					{installingSteam ? "Downloading — about a minute..." : "Download SteamCMD"}
				</Button>
			)}
		</Paper>
	));

	add("panel-update", "Panel version and updates", "Your version, and new releases", "update version upgrade release new download prerelease alpha", () => <PanelUpdateCard />);

	for (const [group, specs] of Object.entries(groups)) {
		add(
			`group:${group}`,
			GROUP_LABELS[group] ?? group,
			GROUP_HINTS[group] ?? "",
			GROUP_WORDS[group] ?? "",
			(visibleSpecs) => (
				<Paper sx={{ p: 2 }}>
					<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
						{visibleSpecs.map((spec) => (
							<Field key={spec.path} spec={spec} value={current(spec)} onChange={(v) => setField(spec, v)} events={data.notificationEvents} />
						))}
					</Box>
				</Paper>
			),
			specs.map((spec) => ({ key: spec.path, text: `${spec.label} ${spec.help ?? ""} ${spec.path}`, item: spec })),
		);
	}

	add("remote", "Opening the panel from another device", "Addresses, Tailscale and other VPNs", "remote access network address ip tailscale zerotier vpn mesh phone other device", () => <RemoteAccessCard />);
	add("community-view", "Community view (a public address)", "A public page for friends, through a tunnel", "community view public address tunnel cloudflare cloudflared staff sign in administrators moderators outside internet", () => <CommunityViewCard />);
	add("community-access", "Community access", "The code friends use to join", "community code invite friends guest viewer sign up join accounts", () => <CommunityAccessCard />);
	add("discord-bot", "Discord bot", "Slash commands in your Discord server", "discord bot slash commands token application guild server", () => <DiscordBotCard applicationId={data.resolved.discord.botApplicationId} refreshKey={data} />);
	add("backup-destinations", "Copies of backups off this PC", "Another drive, a share or cloud storage", "backup off-site offsite copies destination s3 backblaze wasabi r2 minio amazon cloud onedrive dropbox network share", () => <BackupDestinations />);
	add("appearance", "Appearance", "Artwork, colours and images for your servers", "appearance artwork theme colour color banner image card picture custom", () => <AppearanceSettings />);
	add(
		"secrets",
		"Keys and webhooks",
		"Passwords, tokens and webhook addresses",
		"keys webhooks secrets tokens passwords api",
		(visibleFields) => (
			<Paper sx={{ p: 2 }}>
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					Kept separately from the rest of your settings, so a settings file is
					safe to share when asking for help. Leave blank to keep the current value.
				</Typography>
				<Divider sx={{ my: 2 }} />
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
					{visibleFields.map((field) => (
						<TextField
							key={field.key}
							fullWidth
							size="small"
							type="password"
							label={field.label}
							placeholder={data.secrets[field.key] ? "•••••••• (set)" : "Not set"}
							value={secretEdits[field.key] ?? ""}
							onChange={(e) => setSecretEdits((prev) => ({ ...prev, [field.key]: e.target.value }))}
						/>
					))}
				</Box>
			</Paper>
		),
		SECRET_FIELDS.map((field) => ({ key: field.key, text: field.label, item: field })),
	);

	// What is shown for what was typed: every word must be found in a section's name, hint or words, or in a setting
	// inside it. A section whose own name matches shows all of its settings; otherwise only the ones that match.
	const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	const searching = terms.length > 0;
	const found = (text) => terms.every((t) => text.toLowerCase().includes(t));
	const shown = [];
	for (const section of sections) {
		if (!searching) {
			shown.push({ ...section, items: section.fields?.map((f) => f.item) });
			continue;
		}
		const sectionMatches = found(`${section.title} ${section.hint} ${section.words}`);
		const matching = section.fields?.filter((f) => found(`${section.title} ${section.words} ${f.text}`)) ?? [];
		if (sectionMatches) shown.push({ ...section, items: section.fields?.map((f) => f.item) });
		else if (matching.length > 0) shown.push({ ...section, items: matching.map((f) => f.item) });
	}

	const isOpen = (section) => searching || (openMap[section.id] ?? false);
	const setAll = (value) => setOpenMap(Object.fromEntries(sections.map((s) => [s.id, value])));

	return (
		<Box sx={{ mt: 2, pb: 10 }}>
			<Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>
				Back to Dashboard
			</Button>

			<Typography variant="h5" gutterBottom>
				Settings
			</Typography>
			<Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
				Stored in {data.paths.configFile}
			</Typography>

			{error && (
				<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}
			{notice && (
				<Alert severity="info" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
					{notice}
				</Alert>
			)}
			{restartNeeded.length > 0 && (
				<Alert severity="warning" sx={{ mb: 2 }}>
					Saved. {restartNeeded.join(", ")} only takes effect after a restart —
					use Restart API in the tray menu.
				</Alert>
			)}

			<Box
				sx={{
					position: "sticky",
					top: 0,
					zIndex: 5,
					display: "flex",
					alignItems: "center",
					gap: 1,
					flexWrap: "wrap",
					py: 1,
					mb: 1,
					backgroundColor: (t) => t.palette.background.default,
				}}
			>
				<TextField
					size="small"
					placeholder="Search settings (for example: backup, port, discord)"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					sx={{ flex: "1 1 280px", maxWidth: 520 }}
					inputProps={{ "aria-label": "Search settings" }}
					InputProps={{
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
					}}
				/>
				<Button size="small" onClick={() => setAll(true)} disabled={searching}>
					Open all sections
				</Button>
				<Button size="small" onClick={() => setAll(false)} disabled={searching}>
					Close all sections
				</Button>
				{searching && (
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						{shown.length} of {sections.length} sections match
					</Typography>
				)}
			</Box>

			{searching && shown.length === 0 && (
				<Typography variant="body2" sx={{ color: "text.secondary", py: 3 }}>
					Nothing matches "{query.trim()}". Try one word, or part of one, such as "back" or "port".{" "}
					<Button size="small" onClick={() => setQuery("")}>
						Clear search
					</Button>
				</Typography>
			)}

			{shown.map((section) => (
				<CollapsibleSection
					key={section.id}
					id={section.id}
					title={section.title}
					hint={section.hint}
					open={isOpen(section)}
					onToggle={() => setOpenMap({ [section.id]: !(openMap[section.id] ?? false) })}
				>
					{section.render(section.items)}
				</CollapsibleSection>
			))}

			<Box
				sx={{
					position: "sticky",
					bottom: 0,
					display: "flex",
					gap: 2,
					py: 2,
					backgroundColor: (t) => t.palette.background.default,
					borderTop: (t) => `1px solid ${t.palette.divider}`,
				}}
			>
				<Button variant="contained" disabled={!dirty || busy} onClick={save}>
					{busy ? "Saving..." : "Save changes"}
				</Button>
				<Button
					variant="outlined"
					disabled={!dirty || busy}
					onClick={() => {
						setEdits({});
						setSecretEdits({});
					}}
				>
					Discard
				</Button>
				{dirty && (
					<Typography variant="body2" sx={{ color: "warning.main", alignSelf: "center" }}>
						You have unsaved changes{searching ? ", including some that the search is hiding" : ""}.
					</Typography>
				)}
			</Box>
		</Box>
	);
}

function Field({ spec, value, onChange, events }) {
	const help = spec.help || (spec.restart ? "Takes effect after a restart." : undefined);

	if (spec.path === "notifications.events") {
		return <NotificationEvents labels={events} value={value} onChange={onChange} />;
	}

	if (spec.path === "backups.dir") {
		return <FolderField label={spec.label} value={value ?? ""} onChange={onChange} checkUrl="/api/settings/check-folder" helperText={help} blankMeans="a folder inside your data directory" />;
	}

	if (spec.path === "paths.serversRoot") {
		return (
			<FolderField
				label={spec.label}
				value={value ?? ""}
				onChange={onChange}
				checkUrl="/api/settings/check-folder"
				helperText={`${help} Only affects servers created from now on.`}
			/>
		);
	}

	if (spec.type === "bool") {
		return (
			<FormControlLabel
				control={
					<Switch checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
				}
				label={
					<Box>
						<Typography variant="body2">{spec.label}</Typography>
						{help && (
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								{help}
							</Typography>
						)}
					</Box>
				}
			/>
		);
	}

	if (spec.type === "enum") {
		return (
			<TextField
				select
				fullWidth
				size="small"
				label={spec.label}
				helperText={help}
				value={value ?? ""}
				onChange={(e) => onChange(e.target.value)}
			>
				{spec.values.map((v) => (
					<MenuItem key={v} value={v}>
						{v}
					</MenuItem>
				))}
			</TextField>
		);
	}

	if (spec.type === "intArray" || spec.type === "stringArray") {
		return (
			<TextField
				fullWidth
				size="small"
				label={spec.label}
				helperText={help ? `${help} Separate with commas.` : "Separate with commas."}
				value={Array.isArray(value) ? value.join(", ") : ""}
				onChange={(e) => {
					const parts = e.target.value
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean);
					onChange(spec.type === "intArray" ? parts.map(Number).filter(Number.isFinite) : parts);
				}}
			/>
		);
	}

	return (
		<TextField
			fullWidth
			size="small"
			type={spec.type === "int" ? "number" : "text"}
			label={spec.label}
			helperText={help}
			value={value ?? ""}
			onChange={(e) =>
				onChange(spec.type === "int" ? Number(e.target.value) : e.target.value)
			}
		/>
	);
}

function mergeDeep(target, source) {
	const out = { ...target };
	for (const [key, value] of Object.entries(source)) {
		out[key] =
			value && typeof value === "object" && !Array.isArray(value)
				? mergeDeep(out[key] ?? {}, value)
				: value;
	}
	return out;
}

export default SettingsPage;
