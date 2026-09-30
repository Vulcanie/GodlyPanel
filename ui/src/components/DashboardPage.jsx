import React from "react";
import {
	Box,
	Typography,
	FormControlLabel,
	Switch,
	Button,
	Chip,
	CircularProgress,
	InputAdornment,
	MenuItem,
	TextField,
} from "@mui/material";
import { Add as AddIcon, Search as SearchIcon } from "@mui/icons-material";
import { grey } from "@mui/material/colors";
import GameCard from "./GameCard";
import SystemStatsBar from "./SystemStatsBar";

const UNTAGGED = "Untagged";

// Groups the flat servers map into { [type]: [{name, ...status}] }
function groupByType(servers) {
	const groups = {};
	for (const [name, status] of Object.entries(servers)) {
		const type = status.type || "unknown";
		if (!groups[type]) groups[type] = [];
		groups[type].push({ name, ...status });
	}
	return groups;
}

// One group per tag; a server with several tags is listed under each, and one with
// none under "Untagged".
function groupByTag(servers) {
	const groups = {};
	for (const [name, status] of Object.entries(servers)) {
		const tags = status.tags?.length ? status.tags : [UNTAGGED];
		for (const tag of tags) {
			(groups[tag] ??= []).push({ name, ...status });
		}
	}
	return groups;
}

const remembered = (key, fallback) => {
	try {
		const v = localStorage.getItem(`gp.dash.${key}`);
		return v === null ? fallback : JSON.parse(v);
	} catch {
		return fallback;
	}
};
const remember = (key, value) => {
	try {
		localStorage.setItem(`gp.dash.${key}`, JSON.stringify(value));
	} catch {
		// Remembering the view is a convenience.
	}
};

/** Does this server match what was typed? Name, game, session name and tags are searched. */
export function matchesQuery(name, status, query) {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	return q.split(/\s+/).every((word) => [name, status.type, status.sessionName, ...(status.tags ?? [])].some((field) => String(field ?? "").toLowerCase().includes(word)));
}

// This component displays the main list of game sections, each collapsible
// and listing its server instances.
function DashboardPage({
	servers,
	systemStats,
	serverStats,
	loading,
	onNavigate,
	onCreateServer,
	apiError,
	userRole,
	appearance,
	allowedServers = null,
}) {
	const [showOffline, setShowOffline] = React.useState(() => remembered("showOffline", true));
	const [query, setQuery] = React.useState("");
	const [tagFilter, setTagFilter] = React.useState(() => remembered("tagFilter", []));
	const [groupBy, setGroupBy] = React.useState(() => remembered("groupBy", "game"));
	// Only ever set by an explicit user click — see isGroupOpen below for how
	// an unset entry's default is derived instead of stored, so newly-added
	// game types and live online/offline changes are picked up for free.
	const [openGroups, setOpenGroups] = React.useState({});

	const allTags = React.useMemo(() => [...new Set(Object.values(servers).flatMap((s) => s.tags ?? []))].sort((a, b) => a.localeCompare(b)), [servers]);
	// A remembered filter for a tag nobody has any more would hide everything with no way to see why.
	const activeTags = tagFilter.filter((t) => allTags.includes(t));

	// What is shown: what matches the search and every chosen tag.
	const visible = React.useMemo(() => {
		const out = {};
		for (const [name, status] of Object.entries(servers)) {
			if (!matchesQuery(name, status, query)) continue;
			if (activeTags.length > 0 && !activeTags.every((t) => (status.tags ?? []).includes(t))) continue;
			out[name] = status;
		}
		return out;
	}, [servers, query, activeTags.join("\u0000")]); // eslint-disable-line react-hooks/exhaustive-deps

	// groupByType previously recomputed on every render, including
	// systemStats/serverStats-only SSE ticks where `servers` itself hadn't
	// changed at all. Memoizing it means those ticks return the exact same
	// object/array references, which — combined with React.memo on GameCard —
	// lets a systemStats-only tick skip re-rendering every card entirely.
	const groups = React.useMemo(() => (groupBy === "tag" ? groupByTag(visible) : groupByType(visible)), [visible, groupBy]);
	const gameTypes = Object.keys(groups)
		.filter((type) => (showOffline ? true : groups[type].some((s) => s.online)))
		.sort((a, b) => (groupBy === "tag" ? (a === UNTAGGED) - (b === UNTAGGED) || a.localeCompare(b) : 0));
	const filtering = query.trim() !== "" || activeTags.length > 0;
	const total = Object.keys(servers).length;
	const shown = Object.keys(visible).length;

	// A group with any online instance defaults open (useful at a glance
	// without a wall of expanded empty sections); fully-offline groups
	// default closed. A manual toggle always wins once made. While searching,
	// everything that matched is open, since the point is to see it.
	const isGroupOpen = (type) => (type in openGroups ? openGroups[type] : filtering || groups[type].some((s) => s.online));

	const toggleGroup = (type) => {
		setOpenGroups((prev) => ({ ...prev, [type]: !isGroupOpen(type) }));
	};

	const expandAll = () => {
		setOpenGroups(Object.fromEntries(gameTypes.map((t) => [t, true])));
	};

	const collapseAll = () => {
		setOpenGroups(Object.fromEntries(gameTypes.map((t) => [t, false])));
	};

	const toggleTag = (tag) => {
		const next = activeTags.includes(tag) ? activeTags.filter((t) => t !== tag) : [...activeTags, tag];
		setTagFilter(next);
		remember("tagFilter", next);
	};

	return (
		<>
			{apiError ? (
				<Typography align="center" color="error" sx={{ mb: 2 }}>
					API error: {apiError}
				</Typography>
			) : null}

			<Typography align="center" sx={{ color: grey[500], mb: 2 }}>
				Live updates enabled (SSE)
			</Typography>

			<SystemStatsBar stats={systemStats} />

			<Box
				sx={{
					display: "flex",
					flexWrap: "wrap",
					justifyContent: "flex-end",
					alignItems: "center",
					gap: { xs: 1, sm: 2 },
					mb: 2,
				}}
			>
				{total > 1 && (
					<TextField
						size="small"
						placeholder="Search servers"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						inputProps={{ "aria-label": "Search servers" }}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon fontSize="small" />
								</InputAdornment>
							),
						}}
						sx={{ flex: { xs: "1 1 100%", sm: "0 1 260px" }, mr: "auto" }}
					/>
				)}
				{allTags.length > 0 && (
					<TextField select size="small" label="Group by" value={groupBy} onChange={(e) => { setGroupBy(e.target.value); remember("groupBy", e.target.value); }} sx={{ minWidth: 120 }}>
						<MenuItem value="game">Game</MenuItem>
						<MenuItem value="tag">Tag</MenuItem>
					</TextField>
				)}
				{userRole === "admin" && (
					<Button
						variant="contained"
						color="success"
						startIcon={<AddIcon />}
						onClick={onCreateServer}
					>
						Create Server
					</Button>
				)}
				<Button size="small" onClick={expandAll}>
					Expand All
				</Button>
				<Button size="small" onClick={collapseAll}>
					Collapse All
				</Button>
				<FormControlLabel
					control={
						<Switch
							checked={showOffline}
							onChange={(e) => {
								setShowOffline(e.target.checked);
								remember("showOffline", e.target.checked);
							}}
						/>
					}
					label="Show Offline"
				/>
			</Box>

			{allTags.length > 0 && (
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 2, alignItems: "center" }}>
					<Typography variant="caption" sx={{ color: "text.secondary", mr: 0.5 }}>
						Tags:
					</Typography>
					{allTags.map((tag) => (
						<Chip key={tag} size="small" label={tag} color={activeTags.includes(tag) ? "primary" : "default"} variant={activeTags.includes(tag) ? "filled" : "outlined"} onClick={() => toggleTag(tag)} />
					))}
					{activeTags.length > 0 && (
						<Button size="small" onClick={() => { setTagFilter([]); remember("tagFilter", []); }}>
							Clear
						</Button>
					)}
				</Box>
			)}

			{loading ? (
				<CircularProgress sx={{ display: "block", mx: "auto" }} />
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 1.5, sm: 2 } }}>
					{filtering && (
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							{shown === 0 ? "No servers match." : `Showing ${shown} of ${total} servers.`}
							{shown === 0 && " Try fewer words or clear the tag filter."}
						</Typography>
					)}
					{gameTypes.map((type) => (
						<GameCard
							key={`${groupBy}:${type}`}
							gameType={type}
							plainTitle={groupBy === "tag" ? type : null}
							instances={groups[type]}
							onNavigate={onNavigate}
							userRole={userRole}
							allowedServers={allowedServers}
							showOffline={showOffline}
							serverStats={serverStats}
							isOpen={isGroupOpen(type)}
							onToggle={() => toggleGroup(type)}
							appearance={groupBy === "tag" ? undefined : appearance?.[type.toLowerCase()]}
						/>
					))}
				</Box>
			)}
		</>
	);
}

export default DashboardPage;
