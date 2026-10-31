import React from "react";
import { Alert, Box, Button, Chip, InputAdornment, MenuItem, Select, Skeleton, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Search as SearchIcon, Timeline as ActivityIcon } from "@mui/icons-material";
import CompactEmpty from "./CompactEmpty";
import { api } from "../api/client";
import { onLive } from "../liveEvents";
import { t, useT, formatDate, errorText, getLocale } from "../i18n";

const COLOURS = { info: "default", warn: "warning", error: "error" };
// The colour of the stripe down the left of each event, as a theme path.
const STRIPE = { info: "divider", warn: "warning.main", error: "error.main" };

// Each label is a t() call, so the words follow the chosen language.
const TYPE_LABELS = {
	"server.crashed": () => t("activity.type.crashed"),
	"server.restarted.auto": () => t("activity.type.autoRestart"),
	"server.restarted.scheduled": () => t("activity.type.scheduledRestart"),
	"server.recovered": () => t("activity.type.recovered"),
	"server.gave_up": () => t("activity.type.gaveUp"),
	"server.unresponsive": () => t("activity.type.notAnswering"),
	"server.autostarted": () => t("activity.type.startedWithPanel"),
	"server.cloned": () => t("activity.type.cloned"),
	"backup.completed": () => t("activity.type.backup"),
	"backup.failed": () => t("activity.type.backupFailed"),
	"backup.restored": () => t("activity.type.restored"),
	"backup.restart_failed": () => t("activity.type.restartFailed"),
	"backup.deleted": () => t("activity.type.backupDeleted"),
	"schedule.ran": () => t("activity.type.schedule"),
	"schedule.failed": () => t("activity.type.scheduleFailed"),
	"schedule.skipped": () => t("activity.type.scheduleSkipped"),
	"disk.low": () => t("activity.type.diskSpace"),
	"panel.update_available": () => t("activity.type.updateAvailable"),
	"panel.updating": () => t("activity.type.updating"),
	"panel.updated": () => t("activity.type.updated"),
	"panel.update_failed": () => t("activity.type.updateFailed"),
	"mods.installed": () => t("activity.type.mods"),
	"mods.removed": () => t("activity.type.mods"),
	"preset.saved": () => t("activity.type.preset"),
	"preset.applied": () => t("activity.type.preset"),
	"admin.action": () => t("activity.type.change"),
	"auth.signed_in": () => t("activity.type.signedIn"),
	"auth.signed_out": () => t("activity.type.signedOut"),
	"auth.failed": () => t("activity.type.signInFailed"),
	"auth.password_changed": () => t("activity.type.password"),
	"community.staff-signin": () => t("activity.type.staffSignIn"),
	"backup.copy_failed": () => t("activity.type.copyFailed"),
	"backup.copied": () => t("activity.type.copied"),
	"backup.destination_stale": () => t("activity.type.copyOverdue"),
	"backup.destination_recovered": () => t("activity.type.copiesCaughtUp"),
	"player.op_level": () => t("activity.type.operatorLevel"),
};

const label = (type) => (Object.hasOwn(TYPE_LABELS, type) ? TYPE_LABELS[type]() : type);

// The kinds of event someone looks for, as the start of the event's type.
const KINDS = [
	{ id: "servers", label: () => t("activity.kind.servers"), prefixes: ["server."] },
	{ id: "backups", label: () => t("activity.kind.backups"), prefixes: ["backup."] },
	{ id: "players", label: () => t("activity.kind.players"), prefixes: ["player."] },
	{ id: "signins", label: () => t("activity.kind.signins"), prefixes: ["auth.", "community."] },
	{ id: "changes", label: () => t("activity.kind.changes"), prefixes: ["admin.", "preset.", "mods.", "motd."] },
	{ id: "schedules", label: () => t("activity.kind.schedules"), prefixes: ["schedule."] },
	{ id: "panel", label: () => t("activity.kind.panel"), prefixes: ["panel.", "disk."] },
];
const LEVELS = [
	{ id: "error", label: () => t("activity.level.errors") },
	{ id: "warn", label: () => t("activity.level.warnings") },
	{ id: "info", label: () => t("activity.level.information") },
];
const RANGES = [
	{ id: "", label: () => t("activity.range.allTime"), ms: 0 },
	{ id: "1h", label: () => t("activity.range.lastHour"), ms: 3_600_000 },
	{ id: "24h", label: () => t("activity.range.last24Hours"), ms: 86_400_000 },
	{ id: "7d", label: () => t("activity.range.last7Days"), ms: 7 * 86_400_000 },
	{ id: "30d", label: () => t("activity.range.last30Days"), ms: 30 * 86_400_000 },
];
const PAGE = 100;

const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

// Messages are text, but an event written by an older version might carry something else; never show it as "[object Object]".
const text = (value) => (typeof value === "string" ? value : value == null ? "" : typeof value === "object" ? String(value.message ?? JSON.stringify(value)) : String(value));

/** "5 minutes ago" for anything recent, the date and time for the rest. */
function whenText(iso) {
	const then = Date.parse(iso);
	if (!Number.isFinite(then)) return "";
	const seconds = Math.round((then - Date.now()) / 1000);
	const abs = Math.abs(seconds);
	const WHEN = new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto" });
	if (abs < 45) return t("common.justNow");
	if (abs < 3600) return WHEN.format(Math.round(seconds / 60), "minute");
	if (abs < 86400) return WHEN.format(Math.round(seconds / 3600), "hour");
	if (abs < 7 * 86400) return WHEN.format(Math.round(seconds / 86400), "day");
	return new Date(then).toLocaleDateString(getLocale(), { year: "numeric", month: "short", day: "numeric" });
}

/**
 * What has happened, newest first by default, and updating live. One server, or all of them. It can be searched, narrowed by
 * kind, level, server and time, and sorted either way; the search covers the whole log, not only what is shown.
 */
function ActivityPanel({ serverName = null, limit = PAGE }) {
	// Re-renders this panel when the language changes, so the t() text below switches with it.
	useT();
	const [result, setResult] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [q, setQ] = React.useState("");
	const [search, setSearch] = React.useState("");
	const [kinds, setKinds] = React.useState([]);
	const [levels, setLevels] = React.useState([]);
	const [server, setServer] = React.useState("");
	const [range, setRange] = React.useState("");
	const [order, setOrder] = React.useState("desc");
	const [shown, setShown] = React.useState(limit);
	const [fresh, setFresh] = React.useState(0);
	const [reloads, setReloads] = React.useState(0);

	// Wait for a pause in typing before asking.
	React.useEffect(() => {
		const timer = setTimeout(() => setSearch(q), 300);
		return () => clearTimeout(timer);
	}, [q]);
	// A different filter starts again from the first page.
	React.useEffect(() => setShown(limit), [search, kinds, levels, server, range, order, serverName, limit]);
	// Another server's page must not show the last one's events while its own are on the way.
	React.useEffect(() => {
		setResult(null);
		setError(null);
		setFresh(0);
	}, [serverName]);

	const filtered = Boolean(search || kinds.length || levels.length || server || range || order !== "desc");

	React.useEffect(() => {
		let alive = true;
		const params = new URLSearchParams({ limit: String(shown), order });
		if (search) params.set("q", search);
		if (kinds.length) params.set("types", KINDS.filter((k) => kinds.includes(k.id)).flatMap((k) => k.prefixes).join(","));
		if (levels.length) params.set("level", levels.join(","));
		if (serverName || server) params.set("server", serverName || server);
		const ms = RANGES.find((r) => r.id === range)?.ms;
		if (ms) params.set("from", new Date(Date.now() - ms).toISOString());
		api
			.get(`/api/activity/search?${params}`)
			.then((r) => {
				if (!alive) return;
				setResult({ ...r, events: Array.isArray(r?.events) ? r.events : [], servers: Array.isArray(r?.servers) ? r.servers : [], total: Number(r?.total) || 0 });
				setError(null);
				setFresh(0);
			})
			.catch((e) => alive && setError(errorText(e, t("activity.loadFailed"))));
		return () => {
			alive = false;
		};
	}, [search, kinds, levels, server, range, order, shown, serverName, reloads]);

	React.useEffect(
		() =>
			onLive("activity", ({ event }) => {
				if (!event || (serverName && event.server !== serverName)) return;
				// Unfiltered and newest first: it joins the top of the list. Otherwise it may or may not belong, so say there is more.
				if (!filtered) setResult((prev) => (prev ? { ...prev, total: prev.total + 1, events: [event, ...prev.events].slice(0, shown) } : prev));
				else setFresh((n) => n + 1);
			}),
		[serverName, filtered, shown],
	);

	if (!result) {
		return error ? (
			<Alert severity="error" action={<Button color="inherit" size="small" onClick={() => setReloads((n) => n + 1)}>{t("common.tryAgain")}</Button>}>
				{error}
			</Alert>
		) : (
			<Box aria-busy="true" aria-label={t("activity.loading")}>
				<Skeleton variant="rounded" height={40} sx={{ mb: 1.5, borderRadius: "12px" }} />
				{[0, 1, 2, 3, 4].map((i) => (
					<Skeleton key={i} variant="rounded" height={46} sx={{ mb: 0.75, borderRadius: "8px" }} />
				))}
			</Box>
		);
	}

	const reset = () => {
		setQ("");
		setKinds([]);
		setLevels([]);
		setServer("");
		setRange("");
		setOrder("desc");
	};

	return (
		<Box>
			{error && (
				<Alert severity="error" sx={{ mb: 1.5 }} action={<Button color="inherit" size="small" onClick={() => setReloads((n) => n + 1)}>{t("common.tryAgain")}</Button>}>
					{error}
				</Alert>
			)}
			<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mb: 1 }}>
				<TextField
					size="small"
					placeholder={t("activity.searchPlaceholder")}
					value={q}
					onChange={(e) => setQ(e.target.value)}
					sx={{ flex: "1 1 220px" }}
					slotProps={{ htmlInput: { "aria-label": t("activity.searchPlaceholder") }, input: { startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) } }}
				/>
				<Select size="small" value={range} onChange={(e) => setRange(e.target.value)} displayEmpty inputProps={{ "aria-label": t("activity.timeRange") }}>
					{RANGES.map((r) => (
						<MenuItem key={r.id} value={r.id}>
							{r.label()}
						</MenuItem>
					))}
				</Select>
				{!serverName && result.servers.length > 0 && (
					<Select size="small" value={server} onChange={(e) => setServer(e.target.value)} displayEmpty inputProps={{ "aria-label": t("activity.server") }}>
						<MenuItem value="">{t("activity.allServers")}</MenuItem>
						{result.servers.map((s) => (
							<MenuItem key={s} value={s}>
								{s}
							</MenuItem>
						))}
					</Select>
				)}
				<Select size="small" value={order} onChange={(e) => setOrder(e.target.value)} inputProps={{ "aria-label": t("activity.sortOrder") }}>
					<MenuItem value="desc">{t("activity.newestFirst")}</MenuItem>
					<MenuItem value="asc">{t("activity.oldestFirst")}</MenuItem>
				</Select>
			</Box>
			<Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
				{KINDS.map((k) => (
					<Chip key={k.id} size="small" label={k.label()} color={kinds.includes(k.id) ? "primary" : "default"} variant={kinds.includes(k.id) ? "filled" : "outlined"} onClick={() => setKinds((v) => toggle(v, k.id))} />
				))}
				<Box sx={{ width: 8 }} />
				{LEVELS.map((l) => (
					<Chip key={l.id} size="small" label={l.label()} color={levels.includes(l.id) ? COLOURS[l.id] === "default" ? "primary" : COLOURS[l.id] : "default"} variant={levels.includes(l.id) ? "filled" : "outlined"} onClick={() => setLevels((v) => toggle(v, l.id))} />
				))}
				{filtered && (
					<Button size="small" onClick={reset}>
						{t("activity.clearFilters")}
					</Button>
				)}
			</Box>
			<Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.75 }}>
				{result.total === 0 ? t("activity.nothingMatches") : filtered ? t("activity.showingMatching", { shown: result.events.length, total: result.total }) : t("activity.showing", { shown: result.events.length, total: result.total })}
				{fresh > 0 && (
					<>
						{" "}
						<Button size="small" onClick={() => setReloads((n) => n + 1)}>
							{t("activity.newRefresh", { count: fresh })}
						</Button>
					</>
				)}
			</Typography>

			{result.total === 0 && !filtered ? (
				<CompactEmpty icon={<ActivityIcon />} title={t("activity.nothingYet")}>
					{t("activity.nothingYetBody")}
				</CompactEmpty>
			) : result.events.length === 0 ? (
				<CompactEmpty icon={<SearchIcon />} title={t("activity.noMatch")} action={filtered ? <Button onClick={reset}>{t("activity.clearFilters")}</Button> : undefined}>
					{t("activity.noMatchBody")}
				</CompactEmpty>
			) : (
				<Box sx={{ border: 1, borderColor: "divider", borderRadius: "12px", overflow: "hidden", bgcolor: "background.paper" }}>
					{result.events.map((e, i) => (
						<Box
							key={`${e.t}-${i}`}
							sx={{
								position: "relative",
								display: "flex",
								gap: { xs: 0.5, sm: 1.5 },
								flexDirection: { xs: "column", sm: "row" },
								alignItems: { xs: "flex-start", sm: "center" },
								pl: 2.25,
								pr: 2,
								py: 1.1,
								borderTop: i === 0 ? 0 : 1,
								borderColor: "divider",
								"&:hover": { bgcolor: (t) => t.custom.hover },
								"&::before": { content: '""', position: "absolute", left: 0, top: 0, bottom: 0, width: 3, bgcolor: STRIPE[e.level] ?? "divider" },
							}}
						>
							<Typography variant="caption" title={Number.isFinite(Date.parse(e.t)) ? formatDate(e.t) : undefined} sx={{ color: "text.secondary", minWidth: { sm: 130 }, whiteSpace: "nowrap" }}>
								{whenText(e.t)}
							</Typography>
							<Chip size="small" variant="outlined" color={COLOURS[e.level] ?? "default"} label={label(e.type)} sx={{ minWidth: 110, bgcolor: (t) => (e.level === "error" || e.level === "warn" ? alpha(t.palette[e.level === "warn" ? "warning" : "error"].main, 0.08) : "transparent") }} />
							<Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
								{!serverName && e.server ? <strong>{e.server}: </strong> : null}
								{text(e.message)}
							</Typography>
						</Box>
					))}
				</Box>
			)}
			{result.events.length < result.total && (
				<Box sx={{ textAlign: "center", mt: 1.5 }}>
					<Button size="small" variant="outlined" onClick={() => setShown((n) => n + PAGE)}>
						{t("activity.showMore", { count: Math.min(PAGE, result.total - result.events.length) })}
					</Button>
				</Box>
			)}
		</Box>
	);
}

export default ActivityPanel;
