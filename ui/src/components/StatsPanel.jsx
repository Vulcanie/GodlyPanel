import React from "react";
import { Alert, Box, CircularProgress, MenuItem, Paper, TextField, Typography } from "@mui/material";
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

const Stat = ({ label, value, sub }) => (
	<Paper sx={{ p: 1.5, flex: "1 1 150px" }}>
		<Typography variant="caption" sx={{ color: "text.secondary" }}>
			{label}
		</Typography>
		<Typography variant="h6">{value}</Typography>
		{sub && (
			<Typography variant="caption" sx={{ color: "text.secondary" }}>
				{sub}
			</Typography>
		)}
	</Paper>
);

/** How busy the server has been (CPU, memory, players) and when people play. */
function StatsPanel({ serverName }) {
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const [range, setRange] = React.useState("24h");
	const [metrics, setMetrics] = React.useState(null);
	const [stats, setStats] = React.useState(null);
	const [error, setError] = React.useState(null);
	const days = RANGES.find((r) => r.value === range).days;

	React.useEffect(() => {
		let alive = true;
		setMetrics(null);
		Promise.all([api.get(`${base}/metrics?range=${range}`), api.get(`${base}/player-stats?days=${Math.max(days, 1)}`)])
			.then(([m, s]) => {
				if (!alive) return;
				setMetrics(m);
				setStats(s);
				setError(null);
			})
			.catch((e) => alive && setError(e.message));
		const timer = setInterval(() => {
			api.get(`${base}/metrics?range=${range}`).then((m) => alive && setMetrics(m)).catch(() => {});
		}, 30000);
		return () => {
			alive = false;
			clearInterval(timer);
		};
	}, [base, range, days]);

	if (error) return <Alert severity="error">{error}</Alert>;
	if (!metrics || !stats) return <CircularProgress size={24} />;

	const pts = metrics.points;
	const line = (key, scale = 1) => pts.map((p) => ({ t: p.t, v: p[key] === undefined ? null : p[key] * scale }));

	return (
		<Box>
			<TextField select size="small" label="Range" value={range} onChange={(e) => setRange(e.target.value)} sx={{ minWidth: 200, mb: 2 }}>
				{RANGES.map((r) => (
					<MenuItem key={r.value} value={r.value}>
						{r.label}
					</MenuItem>
				))}
			</TextField>

			<Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
				<Stat label="Most players at once" value={stats.peak.players} sub={stats.peak.at ? new Date(stats.peak.at).toLocaleString() : "none recorded"} />
				<Stat label="Average crowd while up" value={stats.averageWhileUp} sub="players" />
				<Stat label="Time online" value={stats.uptimePercent === null ? "—" : `${stats.uptimePercent}%`} sub={`of the last ${days} day${days === 1 ? "" : "s"}`} />
				<Stat label="Player hours" value={stats.playerHours} sub="total time played by everyone" />
			</Box>

			<Paper sx={{ p: 2, mb: 2 }}>
				<LineChart title="Players" series={[{ label: "Peak", color: "#ffb74d", points: line("playersMax") }, { label: "Average", color: "#26c6da", points: line("players") }]} format={(v) => String(Math.round(v))} />
			</Paper>
			<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
				<Paper sx={{ p: 2, flex: "1 1 360px" }}>
					<LineChart title="CPU (% of the whole PC)" unit="%" series={[{ label: "CPU", color: "#66bb6a", points: line("cpu") }]} max={100} />
				</Paper>
				<Paper sx={{ p: 2, flex: "1 1 360px" }}>
					<LineChart title="Memory" series={[{ label: "RAM", color: "#ab47bc", points: line("ramMB", 1) }]} format={(v) => formatBytes(v * 1024 * 1024)} />
				</Paper>
			</Box>

			{stats.hours && (
				<Paper sx={{ p: 2, mb: 2 }}>
					<Typography variant="subtitle2" sx={{ mb: 1 }}>
						When people play (average players, by weekday and hour, this PC's time)
					</Typography>
					<HourGrid grid={stats.hours} />
				</Paper>
			)}

			<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
				{stats.daily.length > 1 && (
					<Paper sx={{ p: 2, flex: "2 1 360px" }}>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							Busiest moment each day
						</Typography>
						<BarChart bars={stats.daily.map((d) => ({ label: d.date, value: d.peak }))} unit=" players" />
					</Paper>
				)}
				<Paper sx={{ p: 2, flex: "1 1 260px" }}>
					<Typography variant="subtitle2" sx={{ mb: 1 }}>
						Who plays most
					</Typography>
					{stats.topPlayers.length === 0 ? (
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							Nobody yet.
						</Typography>
					) : (
						stats.topPlayers.map((p) => (
							<Box key={p.name} sx={{ display: "flex", justifyContent: "space-between", py: 0.25 }}>
								<Typography variant="body2">{p.name}</Typography>
								<Typography variant="body2" sx={{ color: "text.secondary" }}>
									{p.minutes >= 120 ? `${(p.minutes / 60).toFixed(1)} h` : `${p.minutes} min`} · {p.sessions} visit{p.sessions === 1 ? "" : "s"}
								</Typography>
							</Box>
						))
					)}
				</Paper>
			</Box>
		</Box>
	);
}

export default StatsPanel;
