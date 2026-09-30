import React from "react";
import { Alert, Box, Chip, CircularProgress, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { api } from "../api/client";
import PlayerAdminCard from "./PlayerAdminCard";

const ago = (iso) => {
	const seconds = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
	if (seconds < 90) return "just now";
	if (seconds < 5400) return `${Math.round(seconds / 60)} min ago`;
	if (seconds < 172800) return `${Math.round(seconds / 3600)} h ago`;
	return `${Math.round(seconds / 86400)} days ago`;
};

const minutes = (m) => (m >= 120 ? `${(m / 60).toFixed(1)} h` : `${m} min`);

/** Who is on the server, who has come and gone, and everyone the panel has seen. */
function PlayersPanel({ serverName }) {
	const [data, setData] = React.useState(null);
	const [error, setError] = React.useState(null);

	React.useEffect(() => {
		let alive = true;
		const load = () =>
			api
				.get(`/api/server/${encodeURIComponent(serverName)}/players`)
				.then((d) => alive && (setData(d), setError(null)))
				.catch((e) => alive && setError(e.message));
		load();
		const timer = setInterval(load, 8000);
		return () => {
			alive = false;
			clearInterval(timer);
		};
	}, [serverName]);

	if (!data) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress size={24} />;

	return (
		<Box>
			<Paper sx={{ p: 2, mb: 2 }}>
				<Typography variant="subtitle1" sx={{ mb: 1 }}>
					On now ({data.online.length})
				</Typography>
				{data.online.length === 0 ? (
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						Nobody right now. (Only games that report their players can be tracked.)
					</Typography>
				) : (
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
						{data.online.map((p) => (
							<Chip key={p.name} color="success" variant="outlined" label={`${p.name} · on since ${new Date(p.since).toLocaleTimeString()}`} />
						))}
					</Box>
				)}
			</Paper>

			<PlayerAdminCard serverName={serverName} online={data.online} />

			<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
				<Paper sx={{ flex: "1 1 320px", p: 2 }}>
					<Typography variant="subtitle1" sx={{ mb: 1 }}>
						Coming and going
					</Typography>
					{data.recent.length === 0 ? (
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							Nothing yet. Joins and leaves are recorded from the moment the panel starts watching.
						</Typography>
					) : (
						data.recent.slice(0, 40).map((e, i) => (
							<Box key={i} sx={{ display: "flex", justifyContent: "space-between", py: 0.4, gap: 2 }}>
								<Typography variant="body2" sx={{ color: e.type === "join" ? "success.light" : "text.secondary" }}>
									{e.type === "join" ? "▲" : "▼"} {e.name} {e.type === "join" ? "joined" : "left"}
									{e.reason ? ` (${e.reason})` : ""}
								</Typography>
								<Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }} title={new Date(e.t).toLocaleString()}>
									{ago(e.t)}
								</Typography>
							</Box>
						))
					)}
				</Paper>

				<Paper sx={{ flex: "2 1 420px", p: 2 }}>
					<Typography variant="subtitle1" sx={{ mb: 1 }}>
						Everyone the panel has seen
					</Typography>
					{data.people.length === 0 ? (
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							No one yet.
						</Typography>
					) : (
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Player</TableCell>
									<TableCell align="right">Visits</TableCell>
									<TableCell align="right">Time on</TableCell>
									<TableCell align="right">Last seen</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{data.people.map((p) => (
									<TableRow key={p.name}>
										<TableCell>
											{p.name} {p.online && <Chip size="small" color="success" label="online" sx={{ ml: 0.5 }} />}
										</TableCell>
										<TableCell align="right">{p.sessions}</TableCell>
										<TableCell align="right">{minutes(p.totalMinutes)}</TableCell>
										<TableCell align="right">{p.online ? "now" : ago(p.lastSeen)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
					<Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
						Names as the game reports them, kept on this PC. Time on counts from when the panel first saw a player.
					</Typography>
				</Paper>
			</Box>
		</Box>
	);
}

export default PlayersPanel;
