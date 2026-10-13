import React from "react";
import { Alert, Box, Button, MenuItem, Skeleton, TextField, Typography } from "@mui/material";
import { api } from "../api/client";
import { LineChart, HourGrid, BarChart } from "./charts";
import { formatBytes } from "../utils/format";

const RANGES = [
	{ value: "1h", label: "Last hour", days: 1 },
	{ value: "6h", label: "Last 6 hours", days: 1 },
	{ value: "24h", label: "Last 24 hours", days: 1 },
	{ value: "7d", label: "Last 7 days", days: 7 },
	{ value: "30d", label: "Last 30 days", days: 30 },
	{ value: "90d", label: "Last 90 days", days: 90 },
];

// A number with a small label, and an accent bar down its left edge. Wraps with its neighbours on a phone.
const Stat = ({ label, value, sub }) => (
	<Box sx={{ position: "relative", overflow: "hidden", flex: "1 1 150px", minWidth: 0, p: 1.5, pl: 2, borderRadius: 3, border: 1, borderColor: "divider", bgcolor: (t) => t.custom.hover }}>
		<Box aria-hidden sx={{ position: "absolute", inset: "0 auto 0 0", width: 3, background: (t) => t.custom.gradient }} />
		<Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
			{label}
		</Typography>
		<Typography variant="h6" sx={{ lineHeight: 1.3 }}>
			{value}
		</Typography>
		{sub && (
			<Typography variant="caption" sx={{ color: "text.secondary" }}>
				{sub}
			</Typography>
		)}
	</Box>
);

// A framed area for one chart. It adds no card of its own around the whole panel: the page already puts the panel in one.
const Frame = ({ title, children, sx }) => (
	<Box sx={{ p: 1.75, borderRadius: 3, border: 1, borderColor: "divider", minWidth: 0, ...sx }}>
		{title && (
			<Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary", fontWeight: 600 }}>
				{title}
			</Typography>
		)}
		{children}
	</Box>
);

const duration = (minutes) => (minutes >= 120 ? `${(minutes / 60).toFixed(1)} h` : `${minutes} min`);

function Loading() {
	return (
		<Box aria-busy="true" aria-label="Loading performance">
			<Skeleton variant="rounded" height={40} width={200} sx={{ mb: 2 }} />
			<Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
				{[0, 1, 2, 3].map((i) => (
					<Skeleton key={i} variant="rounded" height={74} sx={{ flex: "1 1 150px", borderRadius: 3 }} />
				))}
			</Box>
			<Skeleton variant="rounded" height={190} sx={{ borderRadius: 3 }} />
		</Box>
	);
}

/** How busy the server has been (CPU, memory, players) and when people play. */
function StatsPanel({ serverName }) {
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const [range, setRange] = React.useState("24h");
	const [metrics, setMetrics] = React.useState(null);
	const [stats, setStats] = React.useState(null);
	// Either half can be refused (a limited moderator may see one and not the other), so each says so on its own.
	const [metricsError, setMetricsError] = React.useState(null);
	const [statsError, setStatsError] = React.useState(null);
	const [loaded, setLoaded] = React.useState(false);
	const [reloads, setReloads] = React.useState(0);
	const days = RANGES.find((r) => r.value === range)?.days ?? 1;

	React.useEffect(() => {
		let alive = true;
		setLoaded(false);
		setMetrics(null);
		setStats(null);
		Promise.allSettled([api.get(`${base}/metrics?range=${range}`), api.get(`${base}/player-stats?days=${Math.max(days, 1)}`)]).then(([m, s]) => {
			if (!alive) return;
			setMetrics(m.status === "fulfilled" ? m.value : null);
			setMetricsError(m.status === "rejected" ? m.reason?.message || "Could not load the readings." : null);
			setStats(s.status === "fulfilled" ? s.value : null);
			setStatsError(s.status === "rejected" ? s.reason?.message || "Could not load the player statistics." : null);
			setLoaded(true);
		});
		const timer = setInterval(() => {
			api.get(`${base}/metrics?range=${range}`).then((m) => alive && setMetrics(m)).catch(() => {});
		}, 30000);
		return () => {
			alive = false;
			clearInterval(timer);
		};
	}, [base, range, days, reloads]);

	if (!loaded) return <Loading />;
	if (!metrics && !stats) {
		return (
			<Alert severity="error" action={<Button color="inherit" size="small" onClick={() => setReloads((n) => n + 1)}>Try again</Button>}>
				{metricsError || statsError}
			</Alert>
		);
	}

	const pts = Array.isArray(metrics?.points) ? metrics.points : [];
	const line = (key, scale = 1) => pts.map((p) => ({ t: p.t, v: p[key] === undefined || p[key] === null ? null : p[key] * scale }));
	const daily = Array.isArray(stats?.daily) ? stats.daily : [];
	const topPlayers = Array.isArray(stats?.topPlayers) ? stats.topPlayers : [];

	return (
		<Box>
			<TextField select size="small" label="Range" value={range} onChange={(e) => setRange(e.target.value)} sx={{ minWidth: 200, mb: 2 }}>
				{RANGES.map((r) => (
					<MenuItem key={r.value} value={r.value}>
						{r.label}
					</MenuItem>
				))}
			</TextField>

			{statsError && (
				<Alert severity="info" sx={{ mb: 2 }}>
					{statsError}
				</Alert>
			)}
			{stats && (
				<Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
					<Stat label="Most players at once" value={stats.peak?.players ?? 0} sub={stats.peak?.at ? new Date(stats.peak.at).toLocaleString() : "none recorded"} />
					<Stat label="Average crowd while up" value={stats.averageWhileUp ?? 0} sub="players" />
					<Stat label="Time online" value={stats.uptimePercent == null ? "—" : `${stats.uptimePercent}%`} sub={`of the last ${days} day${days === 1 ? "" : "s"}`} />
					<Stat label="Player hours" value={stats.playerHours ?? 0} sub="total time played by everyone" />
				</Box>
			)}

			{metricsError && (
				<Alert severity="info" sx={{ mb: 2 }}>
					{metricsError}
				</Alert>
			)}
			{metrics && (
				<>
					<Frame sx={{ mb: 2 }}>
						<LineChart title="Players" series={[{ label: "Peak", color: "warning.main", points: line("playersMax") }, { label: "Average", color: "secondary.main", points: line("players") }]} format={(v) => String(Math.round(v))} />
					</Frame>
					<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
						<Frame sx={{ flex: "1 1 320px" }}>
							<LineChart title="CPU (% of the whole PC)" unit="%" series={[{ label: "CPU", color: "success.main", points: line("cpu") }]} max={100} />
						</Frame>
						<Frame sx={{ flex: "1 1 320px" }}>
							<LineChart title="Memory" series={[{ label: "RAM", color: "primary.main", points: line("ramMB", 1) }]} format={(v) => formatBytes(v * 1024 * 1024)} />
						</Frame>
					</Box>
				</>
			)}

			{stats?.hours && (
				<Frame title="When people play (average players, by weekday and hour, this PC's time)" sx={{ mb: 2 }}>
					<HourGrid grid={stats.hours} />
				</Frame>
			)}

			{stats && (
				<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
					{daily.length > 1 && (
						<Frame title="Busiest moment each day" sx={{ flex: "2 1 320px" }}>
							<BarChart bars={daily.map((d) => ({ label: d.date, value: d.peak }))} unit=" players" />
						</Frame>
					)}
					<Frame title="Who plays most" sx={{ flex: "1 1 240px" }}>
						{topPlayers.length === 0 ? (
							<Typography variant="body2" sx={{ color: "text.secondary" }}>
								Nobody yet.
							</Typography>
						) : (
							topPlayers.map((p, i) => (
								<Box key={p.name} sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1, py: 0.35 }}>
									<Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
										<Box component="span" sx={{ color: "text.disabled", mr: 1, fontVariantNumeric: "tabular-nums" }}>
											{i + 1}
										</Box>
										{p.name}
									</Typography>
									<Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
										{duration(p.minutes)} · {p.sessions} visit{p.sessions === 1 ? "" : "s"}
									</Typography>
								</Box>
							))
						)}
					</Frame>
				</Box>
			)}
		</Box>
	);
}

export default StatsPanel;
