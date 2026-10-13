import React from "react";
import { Alert, Avatar, Box, Button, Chip, Skeleton, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Groups as PlayersIcon, Login as JoinIcon, Logout as LeaveIcon } from "@mui/icons-material";
import PlayerAdminCard from "./PlayerAdminCard";
import SectionCard from "./ui/SectionCard";
import CompactEmpty from "./CompactEmpty";
import LiveDot from "./ui/LiveDot";
import { api } from "../api/client";

const ago = (iso) => {
	const then = Date.parse(iso);
	if (!Number.isFinite(then)) return "a while ago";
	const seconds = Math.max(0, (Date.now() - then) / 1000);
	if (seconds < 90) return "just now";
	if (seconds < 5400) return `${Math.round(seconds / 60)} min ago`;
	if (seconds < 172800) return `${Math.round(seconds / 3600)} h ago`;
	return `${Math.round(seconds / 86400)} days ago`;
};

const clock = (iso) => {
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString();
};

const minutes = (m) => (m >= 120 ? `${(m / 60).toFixed(1)} h` : `${m} min`);

const list = (value) => (Array.isArray(value) ? value : []);

/** Who is on the server, who has come and gone, and everyone the panel has seen. */
function PlayersPanel({ serverName }) {
	const [data, setData] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [reloads, setReloads] = React.useState(0);

	React.useEffect(() => {
		let alive = true;
		// Another server's players must not linger while this one's are on the way.
		setData(null);
		setError(null);
		const load = () =>
			api
				.get(`/api/server/${encodeURIComponent(serverName)}/players`)
				.then((d) => alive && (setData(d), setError(null)))
				.catch((e) => alive && setError(e?.message || "The player list could not be loaded."));
		load();
		const timer = setInterval(load, 8000);
		return () => {
			alive = false;
			clearInterval(timer);
		};
	}, [serverName, reloads]);

	if (!data) {
		return error ? (
			<Alert severity="error" action={<Button color="inherit" size="small" onClick={() => setReloads((n) => n + 1)}>Try again</Button>}>
				{error}
			</Alert>
		) : (
			<Box aria-busy="true" aria-label="Loading players">
				<Skeleton variant="rounded" height={96} sx={{ mb: 2, borderRadius: "16px" }} />
				<Skeleton variant="rounded" height={220} sx={{ borderRadius: "16px" }} />
			</Box>
		);
	}

	const online = list(data.online);
	const recent = list(data.recent);
	const people = list(data.people);
	const unnamed = Number(data.unnamed) || 0;

	return (
		<Box>
			{error && (
				<Alert severity="warning" sx={{ mb: 2 }}>
					{error} Showing what was loaded last.
				</Alert>
			)}
			<SectionCard
				title={`On now (${online.length})`}
				icon={<LiveDot state={online.length > 0 ? "online" : "offline"} size={10} />}
				contentSx={{ py: 2 }}
			>
				{online.length === 0 ? (
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{unnamed > 0
							? `${unnamed} player${unnamed === 1 ? " is" : "s are"} on, but this game doesn't say who. (Valheim only gives names through its log file: the Launch options on the Settings tab can switch -logFile on.)`
							: "Nobody right now. (Only games that report their players can be tracked.)"}
					</Typography>
				) : (
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
						{online.map((p) => (
							<Chip
								key={p.name}
								color="success"
								variant="outlined"
								avatar={<Avatar sx={{ bgcolor: (t) => alpha(t.palette.success.main, 0.2), color: "success.main", fontWeight: 700 }}>{String(p.name ?? "?").charAt(0).toUpperCase()}</Avatar>}
								label={`${p.name} · on since ${clock(p.since)}`}
							/>
						))}
					</Box>
				)}
			</SectionCard>

			<PlayerAdminCard serverName={serverName} online={online} />

			<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
				<SectionCard title="Coming and going" sx={{ flex: "1 1 320px", mb: 0 }} contentSx={{ py: 1.5 }}>
					{recent.length === 0 ? (
						<CompactEmpty icon={<PlayersIcon />} title="Nothing yet">
							Joins and leaves are recorded from the moment the panel starts watching.
						</CompactEmpty>
					) : (
						recent.slice(0, 40).map((e, i) => {
							const joined = e.type === "join";
							const Icon = joined ? JoinIcon : LeaveIcon;
							return (
								<Box key={`${e.t}-${i}`} sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.6 }}>
									<Icon sx={{ fontSize: 16, color: joined ? "success.main" : "text.disabled", flexShrink: 0 }} />
									<Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0, color: joined ? "text.primary" : "text.secondary" }}>
										<strong>{e.name}</strong> {joined ? "joined" : "left"}
										{e.reason ? ` (${typeof e.reason === "string" ? e.reason : JSON.stringify(e.reason)})` : ""}
									</Typography>
									<Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }} title={Number.isFinite(Date.parse(e.t)) ? new Date(e.t).toLocaleString() : undefined}>
										{ago(e.t)}
									</Typography>
								</Box>
							);
						})
					)}
				</SectionCard>

				<SectionCard title="Everyone the panel has seen" sx={{ flex: "2 1 420px", mb: 0 }} contentSx={{ p: 0 }}>
					{people.length === 0 ? (
						<CompactEmpty icon={<PlayersIcon />} title="No one yet">
							Players show up here the first time the panel sees them on this server.
						</CompactEmpty>
					) : (
						<Box sx={{ overflowX: "auto" }}>
							<Table size="small" sx={{ "& td, & th": { px: 2.5 } }}>
								<TableHead>
									<TableRow>
										<TableCell>Player</TableCell>
										<TableCell align="right">Visits</TableCell>
										<TableCell align="right">Time on</TableCell>
										<TableCell align="right">Last seen</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{people.map((p) => (
										<TableRow key={p.name} hover>
											<TableCell>
												{p.name} {p.online && <Chip size="small" color="success" label="online" sx={{ ml: 0.5 }} />}
											</TableCell>
											<TableCell align="right">{p.sessions}</TableCell>
											<TableCell align="right">{minutes(p.totalMinutes ?? 0)}</TableCell>
											<TableCell align="right">{p.online ? "now" : ago(p.lastSeen)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Box>
					)}
					<Typography variant="caption" sx={{ display: "block", p: 2, pt: 1.5, color: "text.secondary" }}>
						Names as the game reports them, kept on this PC. Time on counts from when the panel first saw a player.
					</Typography>
				</SectionCard>
			</Box>
		</Box>
	);
}

export default PlayersPanel;
