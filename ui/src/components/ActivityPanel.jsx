import React from "react";
import { Alert, Box, Button, Chip, InputAdornment, MenuItem, Select, Skeleton, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Search as SearchIcon, Timeline as ActivityIcon } from "@mui/icons-material";
import CompactEmpty from "./CompactEmpty";
import { api } from "../api/client";
import { onLive } from "../liveEvents";

const COLOURS = { info: "default", warn: "warning", error: "error" };
// The colour of the stripe down the left of each event, as a theme path.
const STRIPE = { info: "divider", warn: "warning.main", error: "error.main" };

const TYPE_LABELS = {
	"server.crashed": "Crashed",
	"server.restarted.auto": "Auto-restart",
	"server.restarted.scheduled": "Scheduled restart",
	"server.recovered": "Recovered",
	"server.gave_up": "Gave up",
	"server.unresponsive": "Not answering",
	"server.autostarted": "Started with panel",
	"server.cloned": "Cloned",
	"backup.completed": "Backup",
	"backup.failed": "Backup failed",
	"backup.restored": "Restored",
	"backup.restart_failed": "Restart failed",
	"backup.deleted": "Backup deleted",
	"schedule.ran": "Schedule",
	"schedule.failed": "Schedule failed",
	"schedule.skipped": "Schedule skipped",
	"disk.low": "Disk space",
	"panel.update_available": "Update available",
	"panel.updating": "Updating",
	"panel.updated": "Updated",
	"panel.update_failed": "Update failed",
	"mods.installed": "Mods",
	"mods.removed": "Mods",
	"preset.saved": "Preset",
	"preset.applied": "Preset",
	"admin.action": "Change",
	"auth.signed_in": "Signed in",
	"auth.signed_out": "Signed out",
	"auth.failed": "Sign-in failed",
	"auth.password_changed": "Password",
	"community.staff-signin": "Staff sign-in",
	"backup.copy_failed": "Copy failed",
	"backup.copied": "Copied",
	"backup.destination_stale": "Copy overdue",
	"backup.destination_recovered": "Copies caught up",
	"player.op_level": "Operator level",
};

const label = (type) => TYPE_LABELS[type] ?? type;

// The kinds of event someone looks for, as the start of the event's type.
const KINDS = [
	{ id: "servers", label: "Servers", prefixes: ["server."] },
	{ id: "backups", label: "Backups", prefixes: ["backup."] },
	{ id: "players", label: "Players", prefixes: ["player."] },
	{ id: "signins", label: "Sign-ins", prefixes: ["auth.", "community."] },
	{ id: "changes", label: "Changes", prefixes: ["admin.", "preset.", "mods.", "motd."] },
	{ id: "schedules", label: "Schedules", prefixes: ["schedule."] },
	{ id: "panel", label: "Panel", prefixes: ["panel.", "disk."] },
];
const LEVELS = [
	{ id: "error", label: "Errors" },
	{ id: "warn", label: "Warnings" },
	{ id: "info", label: "Information" },
];
const RANGES = [
	{ id: "", label: "All time", ms: 0 },
	{ id: "1h", label: "Last hour", ms: 3_600_000 },
	{ id: "24h", label: "Last 24 hours", ms: 86_400_000 },
	{ id: "7d", label: "Last 7 days", ms: 7 * 86_400_000 },
	{ id: "30d", label: "Last 30 days", ms: 30 * 86_400_000 },
];
const PAGE = 100;

const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

// Messages are text, but an event written by an older version might carry something else; never show it as "[object Object]".
const text = (value) => (typeof value === "string" ? value : value == null ? "" : typeof value === "object" ? String(value.message ?? JSON.stringify(value)) : String(value));

const WHEN = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
/** "5 minutes ago" for anything recent, the date and time for the rest. */
function whenText(iso) {
	const then = Date.parse(iso);
	if (!Number.isFinite(then)) return "";
	const seconds = Math.round((then - Date.now()) / 1000);
	const abs = Math.abs(seconds);
	if (abs < 45) return "just now";
	if (abs < 3600) return WHEN.format(Math.round(seconds / 60), "minute");
	if (abs < 86400) return WHEN.format(Math.round(seconds / 3600), "hour");
	if (abs < 7 * 86400) return WHEN.format(Math.round(seconds / 86400), "day");
	return new Date(then).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

/**
 * What has happened, newest first by default, and updating live. One server, or all of them. It can be searched, narrowed by
 * kind, level, server and time, and sorted either way; the search covers the whole log, not only what is shown.
 */
function ActivityPanel({ serverName = null, limit = PAGE }) {
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
			.catch((e) => alive && setError(e?.message || "The activity could not be loaded."));
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
			<Alert severity="error" action={<Button color="inherit" size="small" onClick={() => setReloads((n) => n + 1)}>Try again</Button>}>
				{error}
			</Alert>
		) : (
			<Box aria-busy="true" aria-label="Loading activity">
				<Skeleton variant="rounded" height={40} sx={{ mb: 1.5, borderRadius: 3 }} />
				{[0, 1, 2, 3, 4].map((i) => (
					<Skeleton key={i} variant="rounded" height={46} sx={{ mb: 0.75, borderRadius: 2 }} />
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
				<Alert severity="error" sx={{ mb: 1.5 }} action={<Button color="inherit" size="small" onClick={() => setReloads((n) => n + 1)}>Try again</Button>}>
					{error}
				</Alert>
			)}
			<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mb: 1 }}>
				<TextField
					size="small"
					placeholder="Search the whole log"
					value={q}
					onChange={(e) => setQ(e.target.value)}
					sx={{ flex: "1 1 220px" }}
					slotProps={{ htmlInput: { "aria-label": "Search the whole log" }, input: { startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) } }}
				/>
				<Select size="small" value={range} onChange={(e) => setRange(e.target.value)} displayEmpty inputProps={{ "aria-label": "Time range" }}>
					{RANGES.map((r) => (
						<MenuItem key={r.id} value={r.id}>
							{r.label}
						</MenuItem>
					))}
				</Select>
				{!serverName && result.servers.length > 0 && (
					<Select size="small" value={server} onChange={(e) => setServer(e.target.value)} displayEmpty inputProps={{ "aria-label": "Server" }}>
						<MenuItem value="">All servers</MenuItem>
						{result.servers.map((s) => (
							<MenuItem key={s} value={s}>
								{s}
							</MenuItem>
						))}
					</Select>
				)}
				<Select size="small" value={order} onChange={(e) => setOrder(e.target.value)} inputProps={{ "aria-label": "Sort order" }}>
					<MenuItem value="desc">Newest first</MenuItem>
					<MenuItem value="asc">Oldest first</MenuItem>
				</Select>
			</Box>
			<Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
				{KINDS.map((k) => (
					<Chip key={k.id} size="small" label={k.label} color={kinds.includes(k.id) ? "primary" : "default"} variant={kinds.includes(k.id) ? "filled" : "outlined"} onClick={() => setKinds((v) => toggle(v, k.id))} />
				))}
				<Box sx={{ width: 8 }} />
				{LEVELS.map((l) => (
					<Chip key={l.id} size="small" label={l.label} color={levels.includes(l.id) ? COLOURS[l.id] === "default" ? "primary" : COLOURS[l.id] : "default"} variant={levels.includes(l.id) ? "filled" : "outlined"} onClick={() => setLevels((v) => toggle(v, l.id))} />
				))}
				{filtered && (
					<Button size="small" onClick={reset}>
						Clear filters
					</Button>
				)}
			</Box>
			<Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.75 }}>
				{result.total === 0 ? "Nothing matches." : `Showing ${result.events.length} of ${result.total}${filtered ? " matching" : ""}.`}
				{fresh > 0 && (
					<>
						{" "}
						<Button size="small" onClick={() => setReloads((n) => n + 1)}>
							{fresh} new, refresh
						</Button>
					</>
				)}
			</Typography>

			{result.total === 0 && !filtered ? (
				<CompactEmpty icon={<ActivityIcon />} title="Nothing has happened yet">
					Crashes, restarts, backups, updates, sign-ins, changes and scheduled tasks are listed here.
				</CompactEmpty>
			) : result.events.length === 0 ? (
				<CompactEmpty icon={<SearchIcon />} title="No events match" action={filtered ? <Button onClick={reset}>Clear filters</Button> : undefined}>
					Try fewer filters, a different word, or a longer time range.
				</CompactEmpty>
			) : (
				<Box sx={{ border: 1, borderColor: "divider", borderRadius: 3, overflow: "hidden", bgcolor: "background.paper" }}>
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
							<Typography variant="caption" title={Number.isFinite(Date.parse(e.t)) ? new Date(e.t).toLocaleString() : undefined} sx={{ color: "text.secondary", minWidth: { sm: 130 }, whiteSpace: "nowrap" }}>
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
						Show {Math.min(PAGE, result.total - result.events.length)} more
					</Button>
				</Box>
			)}
		</Box>
	);
}

export default ActivityPanel;
