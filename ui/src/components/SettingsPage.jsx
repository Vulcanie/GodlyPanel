import React from "react";
import {
	Alert,
	Box,
	Button,
	ButtonBase,
	Chip,
	CircularProgress,
	Divider,
	FormControlLabel,
	IconButton,
	InputAdornment,
	LinearProgress,
	MenuItem,
	Paper,
	Switch,
	TextField,
	Typography,
} from "@mui/material";
import {
	Backup as BackupIcon,
	Clear as ClearIcon,
	Dns as ServersIcon,
	NotificationsActive as NotificationsIcon,
	Palette as AppearanceIcon,
	Public as CommunityIcon,
	Search as SearchIcon,
	Settings as SettingsIcon,
	Tune as GeneralIcon,
} from "@mui/icons-material";
import ServerLocations from "./ServerLocations";
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
import PortListDialog from "./PortListDialog";
import InfoTip from "./InfoTip";
import TipRow from "./settings/TipRow";
import PageHeader from "./ui/PageHeader";
import SectionCard from "./ui/SectionCard";
import EmptyState from "./ui/EmptyState";
import { useToast } from "../ToastContext";
import { findHelp } from "../help/helpIndex";
import { formatBytes } from "../utils/format";

// The form is generated from the schema the server sends, so it can't drift out of step with what's actually
// honoured: adding a setting on the server makes it appear here with its own label, limits and restart behaviour.
// Every setting's explanation is the (i) beside it (src/help/panelHelp.js), never text printed under the box.

/** The groups on the left. Each lists its sections one under the other, so nothing is folded away. */
const CATEGORIES = [
	{ id: "general", label: "General", hint: "Access, startup, updates", icon: <GeneralIcon fontSize="small" /> },
	{ id: "servers", label: "Servers", hint: "Folders, ports, recovery, storage", icon: <ServersIcon fontSize="small" /> },
	{ id: "backups", label: "Backups", hint: "How many to keep, and off-site copies", icon: <BackupIcon fontSize="small" /> },
	{ id: "notifications", label: "Notifications & Discord", hint: "Alerts, email, Discord", icon: <NotificationsIcon fontSize="small" /> },
	{ id: "community", label: "Community & remote access", hint: "Other devices, friends, guests", icon: <CommunityIcon fontSize="small" /> },
	{ id: "appearance", label: "Appearance", hint: "Artwork for your servers", icon: <AppearanceIcon fontSize="small" /> },
];

const CATEGORY_KEY = "gp.settingsCategory";

const readCategory = () => {
	try {
		const saved = localStorage.getItem(CATEGORY_KEY);
		return CATEGORIES.some((c) => c.id === saved) ? saved : CATEGORIES[0].id;
	} catch {
		return CATEGORIES[0].id;
	}
};

// Keys, tokens and webhook addresses. They are stored apart from the rest of the settings (so a settings file is safe to
// share), and each one sits in the section of the feature it belongs to.
const SECRET_LABELS = {
	discordWebhookUrl: "Discord status webhook",
	discordBotToken: "Discord bot token",
	discordUpdateWebhookUrl: "Discord update webhook",
	curseForgeApiKey: "CurseForge API key",
	fixedRconPassword: "Fixed RCON password",
	alertWebhookUrl: "Alert webhook (Discord, Slack, ...)",
	auditWebhookUrl: "Audit webhook (every sign-in and change, for a private Discord channel)",
	smtpPassword: "Mail account password",
};
const secretField = (key) => ({ key, label: SECRET_LABELS[key] });

// Words people might search for that a section's name doesn't contain.
const WORDS = {
	access: "web port address lan network access listen computer allow vpn tailscale cidr host name dns public ip",
	startup: "windows boot login tray autostart delay hidden",
	updates: "version release github prerelease alpha beta upgrade",
	steamcmd: "steamcmd steam download install valve game server tool",
	folders: "folder directory install steamcmd jcmd location where live path drive disk size server folders existing current",
	newServers: "rcon password window mode default hidden minimized curseforge api key modpack mods",
	ports: "port start range increment decrement rcon query reserved list",
	recovery: "crash restart give up auto restart unresponsive hang",
	polling: "interval refresh rate speed cpu memory ram stats steam update check",
	metrics: "history chart graph cpu memory players readings sample seconds",
	storage: "disk space limit quota size warn usage",
	backups: "backup keep days count free space folder",
	destinations: "backup off-site offsite copies destination s3 backblaze wasabi r2 minio amazon cloud onedrive dropbox network share",
	alerts: "alert notification windows toast crash disk webhook slack audit events test",
	email: "email smtp mail password server",
	discord: "discord webhook status post admin role bot token update",
	discordBot: "discord bot slash commands token application guild server",
	remote: "remote access network address ip tailscale zerotier vpn mesh phone other device",
	communityView: "community view public address tunnel cloudflare cloudflared staff sign in administrators moderators outside internet",
	communityAccess: "community code invite friends guest viewer sign up join accounts",
	appearance: "appearance artwork theme colour color banner image card picture custom",
	more: "other extra",
};

/**
 * The page as a list of sections. A section takes the settings from the schema whose path starts with one of its prefixes, plus
 * any keys that belong to it. `lead` is a card shown above the settings, `extra` is shown inside their card below the boxes, and a
 * section with `card` is a card that looks after itself.
 */
function buildSectionDefs({ data, storage, installingSteam, installSteamCmd, rescan }) {
	return [
		{
			id: "access", category: "general", title: "Access", hint: "The panel's port, and who can reach it", words: WORDS.access,
			prefixes: ["http.", "network."],
		},
		{
			id: "startup", category: "general", title: "Starting with Windows", hint: "Starting the panel and your servers when you sign in", words: WORDS.startup,
			prefixes: ["startup."],
		},
		{
			id: "updates", category: "general", title: "Panel updates", hint: "Your version, and checking for new ones", words: WORDS.updates,
			prefixes: ["updates."], cardTitle: "Update checks",
			lead: () => <PanelUpdateCard />,
		},
		{
			id: "steamcmd", category: "general", title: "SteamCMD", hint: data.steamCmdInstalled ? "Installed" : "Not installed yet", words: WORDS.steamcmd,
			card: () => (
				<SectionCard
					title={<TitleWithTip text="SteamCMD" info="card.steamcmd" />}
					actions={<Chip size="small" color={data.steamCmdInstalled ? "success" : "warning"} label={data.steamCmdInstalled ? "Installed" : "Not installed"} />}
				>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
						<Typography variant="body2" sx={{ color: "text.secondary", flex: "1 1 260px", minWidth: 0, wordBreak: "break-all" }}>
							{data.steamCmdInstalled ? `Using ${data.resolved.paths.steamCmdPath}` : "Not installed yet. Download it from Valve once, or point the SteamCMD location (Servers, Folders) at a copy you already have."}
						</Typography>
						{!data.steamCmdInstalled && (
							<Button size="small" variant="outlined" disabled={installingSteam} onClick={installSteamCmd}>
								{installingSteam ? "Downloading — about a minute..." : "Download SteamCMD"}
							</Button>
						)}
					</Box>
				</SectionCard>
			),
		},

		{
			id: "folders", category: "servers", title: "Folders", hint: "Where servers, SteamCMD and tools live, and where each server is now", words: WORDS.folders,
			prefixes: ["paths."],
			extra: () => <ServerLocations />,
		},
		{
			id: "new-servers", category: "servers", title: "New servers", hint: "Defaults for servers you create from now on", words: WORDS.newServers,
			prefixes: ["servers."], secrets: ["fixedRconPassword", "curseForgeApiKey"],
		},
		{
			id: "ports", category: "servers", title: "Ports for new servers", hint: "How new servers get their ports", words: WORDS.ports,
			prefixes: ["portAllocation."],
			extra: () => <ServerPortListButton />,
		},
		{
			id: "recovery", category: "servers", title: "Crash recovery", hint: "When a crashed server is restarted", words: WORDS.recovery,
			prefixes: ["recovery."],
		},
		{
			id: "polling", category: "servers", title: "Refresh rates", hint: "How often the panel checks things", words: WORDS.polling,
			prefixes: ["polling."],
		},
		{
			id: "metrics", category: "servers", title: "Charts and history", hint: "The history behind each server's charts", words: WORDS.metrics,
			prefixes: ["metrics."],
		},
		{
			id: "storage", category: "servers", title: "Storage", hint: "How much disk your servers use, and a limit", words: WORDS.storage,
			prefixes: ["storage."], cardTitle: "Storage limit",
			lead: storage
				? () => (
						<SectionCard
							title={<TitleWithTip text="Storage use" info="card.storage" />}
							actions={
								<>
									{storage.stale && <Chip size="small" label="Recalculating" />}
									<Button size="small" onClick={rescan}>
										Recalculate
									</Button>
								</>
							}
						>
							<Typography variant="body2" sx={{ color: "text.secondary" }}>
								{formatBytes(storage.totals.bytes)} across {storage.roots.length} folder{storage.roots.length === 1 ? "" : "s"}
								{storage.quotaBytes > 0 && ` of a ${formatBytes(storage.quotaBytes)} limit`}
								{storage.volumes?.[0] && ` · ${formatBytes(storage.volumes[0].freeBytes)} free on ${storage.volumes[0].root}`}
							</Typography>
							{storage.quotaBytes > 0 && <LinearProgress variant="determinate" value={Math.min(100, (storage.usedRatio ?? 0) * 100)} sx={{ mt: 1.5, height: 6 }} />}
						</SectionCard>
					)
				: null,
		},

		{
			id: "backups", category: "backups", title: "Backups", hint: "Where backups go and how many are kept", words: WORDS.backups,
			prefixes: ["backups."],
		},
		{
			id: "destinations", category: "backups", title: "Copies of backups off this PC", hint: "Another drive, a share or cloud storage", words: WORDS.destinations,
			card: () => <BackupDestinations />,
		},

		{
			id: "alerts", category: "notifications", title: "Alerts", hint: "Windows and webhook alerts, and which events", words: WORDS.alerts,
			prefixes: ["notifications."], except: ["notifications.email."], secrets: ["alertWebhookUrl", "auditWebhookUrl"],
		},
		{
			id: "email", category: "notifications", title: "Email", hint: "Alerts by email", words: WORDS.email,
			prefixes: ["notifications.email."], secrets: ["smtpPassword"],
		},
		{
			id: "discord", category: "notifications", title: "Discord", hint: "Status posts and the admin role", words: WORDS.discord,
			prefixes: ["discord."], secrets: ["discordWebhookUrl", "discordBotToken", "discordUpdateWebhookUrl"],
		},
		{
			id: "discord-bot", category: "notifications", title: "Discord bot", hint: "Slash commands in your Discord server", words: WORDS.discordBot,
			card: () => <DiscordBotCard applicationId={data.resolved.discord.botApplicationId} refreshKey={data} />,
		},

		{
			id: "remote", category: "community", title: "Opening the panel from another device", hint: "Addresses, Tailscale and other VPNs", words: WORDS.remote,
			card: () => <RemoteAccessCard />,
		},
		{
			id: "community-view", category: "community", title: "Community view (a public address)", hint: "A public page for friends, through a tunnel", words: WORDS.communityView,
			card: () => <CommunityViewCard />,
		},
		{
			id: "community-access", category: "community", title: "Community access", hint: "The code friends use to join", words: WORDS.communityAccess,
			card: () => <CommunityAccessCard />,
		},

		{
			id: "appearance", category: "appearance", title: "Appearance", hint: "Artwork, colours and images for your servers", words: WORDS.appearance,
			card: () => <AppearanceSettings />,
		},
	];
}

/** A card title with its (i), for cards that are made of more than boxes. */
function TitleWithTip({ text, info }) {
	return (
		<Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
			{text}
			<InfoTip id={info} />
		</Box>
	);
}

/** The button under Ports for new servers that opens the list of which server uses which port. */
function ServerPortListButton() {
	const [open, setOpen] = React.useState(false);
	return (
		<Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 0.5 }}>
			<Button size="small" variant="outlined" onClick={() => setOpen(true)}>
				Show server port list
			</Button>
			<InfoTip id="card.portList" />
			<PortListDialog open={open} onClose={() => setOpen(false)} />
		</Box>
	);
}

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

// A choice is a drop-down. The words are the setting's values spelt out, so nobody has to guess what "windowless" means.
const CHOICE_LABELS = {
	"storage.enforce": { off: "Off: ignore the limit", warn: "Warn: show it on the dashboard", block: "Block: also refuse new installs" },
	"servers.defaultRconPasswordMode": { generate: "Generate: a random password for each server", fixed: "Fixed: the same password for every server" },
	"servers.defaultWindowMode": { minimized: "Minimized", hidden: "Hidden", windowless: "No window" },
};

function SettingsPage() {
	const toast = useToast();
	const [data, setData] = React.useState(null);
	const [storage, setStorage] = React.useState(null);
	const [edits, setEdits] = React.useState({});
	const [secretEdits, setSecretEdits] = React.useState({});
	const [error, setError] = React.useState(null);
	const [notice, setNotice] = React.useState(null);
	const [restartNeeded, setRestartNeeded] = React.useState([]);
	const [busy, setBusy] = React.useState(false);
	const [installingSteam, setInstallingSteam] = React.useState(false);
	const [category, setCategory] = React.useState(readCategory);
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

	const dirty = Object.keys(edits).length > 0 || Object.keys(secretEdits).length > 0;

	// Leaving the page with changes that were never saved would lose them without a word.
	React.useEffect(() => {
		if (!dirty) return undefined;
		const warn = (event) => {
			event.preventDefault();
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [dirty]);

	const chooseCategory = (id) => {
		setCategory(id);
		setQuery("");
		try {
			localStorage.setItem(CATEGORY_KEY, id);
		} catch {
			// Remembering which group was open is a convenience.
		}
	};

	const current = (spec) => (spec.path in edits ? edits[spec.path] : valueAt(data.config, spec.path));

	const setField = (spec, value) => setEdits((prev) => ({ ...prev, [spec.path]: value }));

	const save = async () => {
		setBusy(true);
		setError(null);
		setNotice(null);
		try {
			let patch = {};
			for (const [dotted, value] of Object.entries(edits)) {
				patch = mergeDeep(patch, nest(dotted, value));
			}

			let issues = null;
			if (Object.keys(patch).length > 0) {
				const result = await api.put("/api/settings", patch);
				setRestartNeeded(result.restartRequired ?? []);
				if (result.issues?.length) issues = result.issues.join(" ");
			}

			const secretPatch = Object.fromEntries(Object.entries(secretEdits).filter(([, v]) => v !== ""));
			if (Object.keys(secretPatch).length > 0) {
				await api.put("/api/settings/secrets", secretPatch);
			}

			setEdits({});
			setSecretEdits({});
			await load();
			if (issues) setNotice(issues);
			else toast("Settings saved.");
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
			toast("SteamCMD is installed and ready.");
			await load();
		} catch (e) {
			setError(e.message);
		} finally {
			setInstallingSteam(false);
		}
	};

	const rescan = async () => {
		try {
			await api.post("/api/settings/storage/rescan");
			toast("Recalculating storage in the background — this can take a few minutes.", "info");
		} catch (e) {
			setError(e.message);
		}
	};

	if (!data) {
		return (
			<Box>
				{error ? <Alert severity="error">{error}</Alert> : <CircularProgress sx={{ display: "block", mx: "auto", mt: 8 }} />}
			</Box>
		);
	}

	// ---- the sections, and which of the schema's settings each one holds ------------------------------------------------
	const defs = buildSectionDefs({ data, storage, installingSteam, installSteamCmd, rescan });
	const claimed = new Set();
	const sections = defs.map((def) => {
		const specs = def.prefixes
			? data.fields.filter((spec) => def.prefixes.some((p) => spec.path.startsWith(p)) && !(def.except ?? []).some((p) => spec.path.startsWith(p)))
			: [];
		specs.forEach((spec) => claimed.add(spec.path));
		return { ...def, specs, secretFields: (def.secrets ?? []).map(secretField) };
	});
	// A setting the server knows about that no section above claims still appears, so it can never be unreachable.
	const loose = data.fields.filter((spec) => !claimed.has(spec.path));
	if (loose.length > 0) {
		sections.push({ id: "more", category: "general", title: "More settings", hint: "Other settings", words: WORDS.more, specs: loose, secretFields: [] });
	}

	// What each searchable thing in a section is called, so a search can match the setting's name or its explanation.
	for (const section of sections) {
		section.items = [
			...section.specs.map((spec) => ({ kind: "field", key: spec.path, item: spec, text: `${spec.label} ${spec.help ?? ""} ${spec.path} ${findHelp(spec.path)?.text ?? ""}` })),
			...section.secretFields.map((field) => ({ kind: "secret", key: field.key, item: field, text: `${field.label} ${findHelp(`secret.${field.key}`)?.text ?? ""}` })),
		];
	}

	// Which group each unsaved edit is in, so the list on the left can show where the changes are.
	const categoryOfKey = {};
	for (const section of sections) for (const entry of section.items) categoryOfKey[`${entry.kind}:${entry.key}`] = section.category;
	const unsaved = {};
	for (const path of Object.keys(edits)) unsaved[categoryOfKey[`field:${path}`]] = (unsaved[categoryOfKey[`field:${path}`]] ?? 0) + 1;
	for (const key of Object.keys(secretEdits)) if (secretEdits[key] !== "") unsaved[categoryOfKey[`secret:${key}`]] = (unsaved[categoryOfKey[`secret:${key}`]] ?? 0) + 1;
	const unsavedCount = Object.keys(edits).length + Object.values(secretEdits).filter((v) => v !== "").length;

	// What is shown for what was typed: every word must be found in a section's name, hint or words, or in a setting inside
	// it. A section whose own name matches shows all of its settings; otherwise only the ones that match. While searching, the
	// matches from every group are listed together.
	const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	const searching = terms.length > 0;
	const found = (text) => terms.every((t) => text.toLowerCase().includes(t));
	const shown = [];
	for (const section of sections) {
		if (!searching) {
			if (section.category === category) shown.push({ section, items: section.items });
			continue;
		}
		const sectionMatches = found(`${section.title} ${section.hint} ${section.words}`);
		const matching = section.items.filter((entry) => found(`${section.title} ${section.words} ${entry.text}`));
		if (sectionMatches) shown.push({ section, items: section.items });
		else if (matching.length > 0) shown.push({ section, items: matching });
	}
	const matchesIn = (id) => shown.filter((s) => s.section.category === id).length;
	const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

	return (
		<Box sx={{ pb: 2 }}>
			<PageHeader
				title="Settings"
				subtitle={`Stored in ${data.paths.configFile}`}
				icon={<SettingsIcon />}
				actions={
					<TextField
						size="small"
						placeholder="Search settings"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						sx={{ width: { xs: "100%", sm: 320 } }}
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
				}
				sx={{ "& > div:last-of-type": { width: { xs: "100%", sm: "auto" } } }}
			/>

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
					Saved. {restartNeeded.join(", ")} only takes effect after a restart — use Restart API in the tray menu.
				</Alert>
			)}

			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "232px minmax(0, 1fr)" },
					gap: { xs: 1.5, md: 3 },
					alignItems: "start",
				}}
			>
				<CategoryList categories={CATEGORIES} active={searching ? null : category} onPick={chooseCategory} unsaved={unsaved} matches={searching ? matchesIn : null} />

				<Box sx={{ minWidth: 0 }}>
					{searching && shown.length > 0 && (
						<Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
							{shown.length} of {sections.length} sections match "{query.trim()}", from every group.
						</Typography>
					)}
					{searching && shown.length === 0 && (
						<EmptyState
							title={`Nothing matches "${query.trim()}"`}
							action={
								<Button size="small" onClick={() => setQuery("")}>
									Clear search
								</Button>
							}
						>
							Try one word, or part of one, such as "back" or "port".
						</EmptyState>
					)}

					{shown.map(({ section, items }) => (
						<Box key={section.id} data-section={`settings:${section.id}`} id={`settings-${section.id}`}>
							{section.card ? (
								section.card()
							) : (
								<>
									{section.lead?.()}
									{items.length > 0 || section.extra ? (
										<SectionCard title={section.cardTitle ?? section.title} subtitle={searching ? `${categoryLabel(section.category)} · ${section.hint}` : section.hint}>
											<SectionFields
												items={items}
												data={data}
												current={current}
												setField={setField}
												secretEdits={secretEdits}
												setSecretEdits={setSecretEdits}
											/>
											{section.extra?.()}
										</SectionCard>
									) : null}
								</>
							)}
						</Box>
					))}
				</Box>
			</Box>

			<Paper
				variant="outlined"
				sx={{
					position: "sticky",
					bottom: 12,
					zIndex: 5,
					mt: 2,
					px: 2,
					py: 1.25,
					display: "flex",
					alignItems: "center",
					gap: 1.5,
					flexWrap: "wrap",
					borderRadius: 3,
					backdropFilter: "blur(14px)",
					backgroundColor: (t) => t.custom.glass,
					boxShadow: (t) => t.custom.shadow,
					borderColor: dirty ? "warning.main" : "divider",
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
				<Typography variant="body2" sx={{ color: dirty ? "warning.main" : "text.secondary", flex: 1, minWidth: 180 }}>
					{dirty
						? `You have unsaved changes (${unsavedCount})${searching ? ", including some that the search is hiding" : ""}.`
						: "Nothing to save. Changes are kept until you press Save."}
				</Typography>
			</Paper>
		</Box>
	);
}

/** The groups: a column on the left of a wide page, a strip you can swipe along the top of a narrow one. */
function CategoryList({ categories, active, onPick, unsaved, matches }) {
	return (
		<Paper
			variant="outlined"
			component="nav"
			aria-label="Settings groups"
			role="tablist"
			sx={{
				display: "flex",
				flexDirection: { xs: "row", md: "column" },
				gap: 0.5,
				p: 0.75,
				borderRadius: 3,
				overflowX: { xs: "auto", md: "visible" },
				position: "sticky",
				// Below the bar across the top of the page, so the list stays in reach while a long group scrolls.
				top: { xs: 56, md: 72 },
				zIndex: 4,
				backdropFilter: "blur(14px)",
				backgroundColor: (t) => t.custom.glass,
			}}
		>
			{categories.map((c) => {
				const selected = c.id === active;
				const count = unsaved[c.id] ?? 0;
				const hits = matches ? matches(c.id) : null;
				return (
					<ButtonBase
						key={c.id}
						role="tab"
						aria-selected={selected}
						data-testid={`settings-category-${c.id}`}
						onClick={() => onPick(c.id)}
						sx={{
							display: "flex",
							alignItems: "center",
							gap: 1.25,
							px: 1.5,
							py: 1,
							borderRadius: 2.5,
							textAlign: "left",
							justifyContent: "flex-start",
							flexShrink: 0,
							whiteSpace: "nowrap",
							color: selected ? "primary.main" : "text.primary",
							opacity: hits === 0 ? 0.5 : 1,
							backgroundColor: selected ? (t) => t.custom.hover : "transparent",
							"&:hover": { backgroundColor: (t) => t.custom.hover },
							"&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
						}}
					>
						<Box sx={{ display: "grid", placeItems: "center", color: selected ? "primary.main" : "text.secondary" }}>{c.icon}</Box>
						<Typography variant="body2" sx={{ fontWeight: selected ? 700 : 500, flex: 1 }}>
							{c.label}
						</Typography>
						{hits > 0 && <Chip size="small" label={hits} sx={{ height: 20, fontSize: 11 }} />}
						{count > 0 && (
							<Box
								component="span"
								title={`${count} unsaved change${count === 1 ? "" : "s"}`}
								sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "warning.main", flexShrink: 0 }}
							/>
						)}
					</ButtonBase>
				);
			})}
		</Paper>
	);
}

/** The boxes in one section: the schema's settings, then the keys that belong with them. */
function SectionFields({ items, data, current, setField, secretEdits, setSecretEdits }) {
	const specs = items.filter((i) => i.kind === "field");
	const secrets = items.filter((i) => i.kind === "secret");
	return (
		<Box>
			{specs.length > 0 && (
				// As many columns as fit; long ones take a full row (see Field).
				<Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 2.25 }}>
					{specs.map(({ item: spec }) => (
						<Field key={spec.path} spec={spec} value={current(spec)} onChange={(v) => setField(spec, v)} events={data.notificationEvents} />
					))}
				</Box>
			)}
			{secrets.length > 0 && (
				<>
					{specs.length > 0 && <Divider sx={{ my: 2.5 }} />}
					<Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 1.5, lineHeight: 1.5 }}>
						Keys and webhooks
					</Typography>
					<Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 2.25 }}>
						{secrets.map(({ item: field }) => (
							<TipRow key={field.key} info={`secret.${field.key}`}>
								<TextField
									fullWidth
									size="small"
									type="password"
									autoComplete="new-password"
									label={field.label}
									placeholder={data.secrets[field.key] ? "•••••••• (set)" : "Not set"}
									value={secretEdits[field.key] ?? ""}
									onChange={(e) => setSecretEdits((prev) => ({ ...prev, [field.key]: e.target.value }))}
								/>
							</TipRow>
						))}
					</Box>
				</>
			)}
		</Box>
	);
}

// Labels this long don't fit a half-width box without being cut off, so they get the whole row.
const LONG_LABEL = 34;

function Field({ spec, value, onChange, events }) {
	const wide = spec.label.length > LONG_LABEL || spec.type === "stringArray" || spec.type === "intArray" || spec.path === "network.publicAddress";
	const span = wide ? { gridColumn: "1 / -1" } : undefined;

	if (spec.path === "notifications.events") {
		return (
			<Box sx={{ gridColumn: "1 / -1" }}>
				<NotificationEvents labels={events} value={value} onChange={onChange} />
			</Box>
		);
	}

	if (spec.path === "backups.dir" || spec.path === "paths.serversRoot") {
		return (
			<Box sx={{ gridColumn: "1 / -1" }}>
				<FolderField
					label={spec.label}
					value={value ?? ""}
					onChange={onChange}
					checkUrl="/api/settings/check-folder"
					info={spec.path}
				/>
			</Box>
		);
	}

	if (spec.type === "bool") {
		return (
			<TipRow info={spec.path} restart={spec.restart} center sx={span}>
				<FormControlLabel
					sx={{ ml: 0, mr: 0 }}
					control={<Switch checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />}
					label={<Typography variant="body2">{spec.label}</Typography>}
				/>
			</TipRow>
		);
	}

	// Something with a few fixed answers is a drop-down, whether the schema calls it an enum or not.
	if (spec.type === "enum") {
		return (
			<TipRow info={spec.path} restart={spec.restart} sx={span}>
				<TextField select fullWidth size="small" label={spec.label} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
					{spec.values.map((v) => (
						<MenuItem key={v} value={v}>
							{CHOICE_LABELS[spec.path]?.[v] ?? v}
						</MenuItem>
					))}
				</TextField>
			</TipRow>
		);
	}

	if (spec.type === "intArray" || spec.type === "stringArray") {
		return (
			<TipRow info={spec.path} restart={spec.restart} sx={span}>
				<TextField
					fullWidth
					size="small"
					label={spec.label}
					placeholder="Separate with commas"
					value={Array.isArray(value) ? value.join(", ") : ""}
					onChange={(e) => {
						const parts = e.target.value
							.split(",")
							.map((s) => s.trim())
							.filter(Boolean);
						onChange(spec.type === "intArray" ? parts.map(Number).filter(Number.isFinite) : parts);
					}}
				/>
			</TipRow>
		);
	}

	return (
		<TipRow info={spec.path} restart={spec.restart} sx={span}>
			<TextField
				fullWidth
				size="small"
				type={spec.type === "int" ? "number" : "text"}
				label={spec.label}
				value={value ?? ""}
				inputProps={spec.type === "int" ? { min: spec.min, max: spec.max } : undefined}
				onChange={(e) =>
					// An empty box stays empty rather than becoming 0, or a minus sign typed first would be wiped.
					onChange(spec.type === "int" && e.target.value !== "" ? Number(e.target.value) : e.target.value)
				}
			/>
		</TipRow>
	);
}

export default SettingsPage;
