import React from "react";
import { Alert, Box, Button, Chip, CircularProgress, InputAdornment, MenuItem, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { Add as AddIcon, Search as SearchIcon, Dns as ServerIcon } from "@mui/icons-material";
import ServerCard from "./ServerCard";
import EmptyState from "./ui/EmptyState";
import PageHeader from "./ui/PageHeader";
import { getGameInfo } from "../gameCatalog";
import { isOperator } from "../permissions";

const UNTAGGED = "Untagged";

// Groups the flat servers map into { [type]: [{name, ...status}] }
function groupByType(servers) {
	const groups = {};
	for (const [name, status] of Object.entries(servers)) {
		const type = status.type || "unknown";
		(groups[type] ??= []).push({ name, ...status });
	}
	return groups;
}

// One group per tag; a server with several tags is listed under each, and one with none under "Untagged".
function groupByTag(servers) {
	const groups = {};
	for (const [name, status] of Object.entries(servers)) {
		const tags = status.tags?.length ? status.tags : [UNTAGGED];
		for (const tag of tags) (groups[tag] ??= []).push({ name, ...status });
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

function Tile({ label, value, sub, accent, children }) {
	return (
		<Box sx={{ position: "relative", overflow: "hidden", p: 2.25, borderRadius: 4, border: 1, borderColor: "divider", bgcolor: "background.paper" }}>
			<Box sx={{ position: "absolute", inset: "0 auto 0 0", width: 3, background: accent ?? ((t) => t.custom.gradient) }} />
			<Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 1, fontSize: 11 }}>
				{label}
			</Typography>
			<Typography variant="h4" sx={{ mt: 0.25, fontVariantNumeric: "tabular-nums" }}>
				{value}
			</Typography>
			{sub && (
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					{sub}
				</Typography>
			)}
			{children}
		</Box>
	);
}

function Gauge({ percent }) {
	const value = Math.max(0, Math.min(100, percent ?? 0));
	return (
		<Box sx={{ height: 6, borderRadius: 3, bgcolor: (t) => t.custom.hover, mt: 1, overflow: "hidden" }}>
			<Box sx={{ height: 1, width: `${value}%`, borderRadius: 3, background: value > 90 ? "#fb7185" : value > 75 ? "#fbbf24" : (t) => t.custom.gradient, transition: "width .6s ease" }} />
		</Box>
	);
}

/** A game's heading above its servers: a strip of its artwork, its name, and how many are up. */
function GroupHeader({ title, banner, gradient, online, total, players }) {
	return (
		<Box sx={{ position: "relative", display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, px: 2, height: 52, borderRadius: 3, overflow: "hidden", background: gradient }}>
			{banner && <Box sx={{ position: "absolute", inset: 0, backgroundImage: `url(${banner})`, backgroundSize: "cover", backgroundPosition: "center 30%" }} />}
			<Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(8,12,24,.88) 0%, rgba(8,12,24,.55) 55%, rgba(8,12,24,.25) 100%)" }} />
			<Typography variant="subtitle1" sx={{ position: "relative", color: "#fff", flex: 1, textShadow: "0 1px 6px rgba(0,0,0,.5)" }}>
				{title}
			</Typography>
			<Chip size="small" label={`${online}/${total} online`} color={online > 0 ? "success" : "default"} sx={{ position: "relative", height: 22, ...(online > 0 ? {} : { bgcolor: "rgba(255,255,255,.18)", color: "#fff" }) }} />
			{players > 0 && <Chip size="small" label={`${players} playing`} sx={{ position: "relative", height: 22, bgcolor: "rgba(255,255,255,.18)", color: "#fff" }} />}
		</Box>
	);
}

function DashboardPage({ servers, systemStats, serverStats, loading, apiError, userRole, appearance, allowedServers = null, onOpen, onCreateServer, onAction }) {
	const [query, setQuery] = React.useState("");
	const [status, setStatus] = React.useState(() => remembered("status", "all"));
	const [tagFilter, setTagFilter] = React.useState(() => remembered("tagFilter", []));
	const [groupBy, setGroupBy] = React.useState(() => remembered("groupBy", "game"));

	const operator = isOperator(userRole);
	const admin = userRole === "admin";

	const allTags = React.useMemo(() => [...new Set(Object.values(servers).flatMap((s) => s.tags ?? []))].sort((a, b) => a.localeCompare(b)), [servers]);
	// A remembered filter for a tag nobody has any more would hide everything with no way to see why.
	const activeTags = tagFilter.filter((t) => allTags.includes(t));
	const statsByName = React.useMemo(() => Object.fromEntries((serverStats || []).map((s) => [s.name, s])), [serverStats]);

	const visible = React.useMemo(() => {
		const out = {};
		for (const [name, s] of Object.entries(servers)) {
			if (!matchesQuery(name, s, query)) continue;
			if (status === "online" && !s.online) continue;
			if (status === "offline" && s.online) continue;
			if (activeTags.length > 0 && !activeTags.every((t) => (s.tags ?? []).includes(t))) continue;
			out[name] = s;
		}
		return out;
	}, [servers, query, status, activeTags.join("\u0000")]); // eslint-disable-line react-hooks/exhaustive-deps

	const groups = React.useMemo(() => {
		const raw = groupBy === "tag" ? groupByTag(visible) : groupByType(visible);
		// Online servers first inside each group, then by name.
		for (const list of Object.values(raw)) list.sort((a, b) => Number(Boolean(b.online)) - Number(Boolean(a.online)) || a.name.localeCompare(b.name));
		return raw;
	}, [visible, groupBy]);
	const groupKeys = Object.keys(groups).sort((a, b) => {
		if (groupBy === "tag") return (a === UNTAGGED) - (b === UNTAGGED) || a.localeCompare(b);
		const online = (k) => groups[k].filter((s) => s.online).length;
		return online(b) - online(a) || a.localeCompare(b);
	});

	const total = Object.keys(servers).length;
	const shown = Object.keys(visible).length;
	const onlineCount = Object.values(servers).filter((s) => s.online).length;
	const playerCount = Object.values(servers).reduce((n, s) => n + (s.playerCount ?? 0), 0);
	const filtering = query.trim() !== "" || activeTags.length > 0 || status !== "all";
	const canOpenServer = (name) => operator && (!allowedServers || allowedServers.includes(name));

	const toggleTag = (tag) => {
		const next = activeTags.includes(tag) ? activeTags.filter((t) => t !== tag) : [...activeTags, tag];
		setTagFilter(next);
		remember("tagFilter", next);
	};

	return (
		<>
			<PageHeader
				title="Dashboard"
				subtitle={total === 0 ? "No servers yet" : `${onlineCount} of ${total} server${total === 1 ? "" : "s"} online · ${playerCount} player${playerCount === 1 ? "" : "s"} connected`}
				actions={
					admin && (
						<Button variant="contained" startIcon={<AddIcon />} onClick={onCreateServer} data-testid="create-server">
							Create server
						</Button>
					)
				}
			/>

			{apiError && (
				<Alert severity="error" sx={{ mb: 2 }}>
					Can't reach the panel: {apiError}
				</Alert>
			)}

			{total > 0 && (
				<Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 2, mb: 3 }}>
					<Tile label="Servers online" value={`${onlineCount}/${total}`} sub={total - onlineCount > 0 ? `${total - onlineCount} offline` : "all running"} accent={onlineCount > 0 ? (t) => t.palette.status.online : undefined} />
					<Tile label="Players connected" value={playerCount} sub="across all servers" />
					<Tile label="CPU" value={systemStats ? `${systemStats.cpuPercent}%` : "…"} sub="this PC">
						<Gauge percent={systemStats?.cpuPercent} />
					</Tile>
					<Tile label="Memory" value={systemStats?.totalMemMB != null ? `${systemStats.usedMemPercent}%` : "…"} sub={systemStats?.totalMemMB != null ? `${(systemStats.usedMemMB / 1024).toFixed(1)} of ${(systemStats.totalMemMB / 1024).toFixed(1)} GB` : undefined}>
						<Gauge percent={systemStats?.usedMemPercent} />
					</Tile>
				</Box>
			)}

			{total > 1 && (
				<Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, mb: 2 }}>
					<TextField
						size="small"
						placeholder="Search servers"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						sx={{ flex: { xs: "1 1 100%", sm: "0 1 280px" } }}
						slotProps={{
							htmlInput: { "aria-label": "Search servers" },
							input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
						}}
					/>
					<ToggleButtonGroup
						exclusive
						size="small"
						value={status}
						onChange={(_, v) => {
							if (!v) return;
							setStatus(v);
							remember("status", v);
						}}
						aria-label="Show"
					>
						<ToggleButton value="all">All</ToggleButton>
						<ToggleButton value="online">Online</ToggleButton>
						<ToggleButton value="offline">Offline</ToggleButton>
					</ToggleButtonGroup>
					{allTags.length > 0 && (
						<TextField
							select
							size="small"
							label="Group by"
							value={groupBy}
							onChange={(e) => {
								setGroupBy(e.target.value);
								remember("groupBy", e.target.value);
							}}
							sx={{ minWidth: 130 }}
						>
							<MenuItem value="game">Game</MenuItem>
							<MenuItem value="tag">Tag</MenuItem>
						</TextField>
					)}
					{allTags.map((tag) => (
						<Chip key={tag} size="small" label={tag} color={activeTags.includes(tag) ? "primary" : "default"} variant={activeTags.includes(tag) ? "filled" : "outlined"} onClick={() => toggleTag(tag)} />
					))}
				</Box>
			)}

			{loading ? (
				<CircularProgress sx={{ display: "block", mx: "auto", my: 8 }} />
			) : total === 0 ? (
				<EmptyState
					icon={<ServerIcon fontSize="large" />}
					title={admin ? "Let's make your first server" : "No servers to show"}
					action={
						admin && (
							<Button variant="contained" size="large" startIcon={<AddIcon />} onClick={onCreateServer}>
								Create a server
							</Button>
						)
					}
				>
					{admin ? "Pick a game, choose a name, and the panel downloads and sets it up for you." : "When the owner adds a server it will show up here."}
				</EmptyState>
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
					{filtering && (
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							{shown === 0 ? "No servers match." : `Showing ${shown} of ${total} servers.`}
							{shown === 0 && " Try fewer words or clear the filters."}
						</Typography>
					)}
					{groupKeys.map((key) => {
						const list = groups[key];
						const info = getGameInfo(key, appearance?.[key.toLowerCase()]);
						return (
							<Box key={`${groupBy}:${key}`} component="section">
								<GroupHeader
									title={groupBy === "tag" ? key : info.title}
									banner={groupBy === "tag" ? null : info.banner}
									gradient={info.gradient}
									online={list.filter((s) => s.online).length}
									total={list.length}
									players={list.reduce((n, s) => n + (s.playerCount ?? 0), 0)}
								/>
								<Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))", gap: 2 }}>
									{list.map((srv) => (
										<ServerCard
											key={srv.name}
											name={srv.name}
											status={srv}
											stats={statsByName[srv.name]}
											appearance={appearance?.[(srv.type || "").toLowerCase()]}
											canOpen={canOpenServer(srv.name)}
											canControl={canOpenServer(srv.name)}
											onOpen={onOpen}
											onAction={onAction}
										/>
									))}
								</Box>
							</Box>
						);
					})}
				</Box>
			)}
		</>
	);
}

export default DashboardPage;
