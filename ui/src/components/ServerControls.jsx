import React from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, Typography } from "@mui/material";
import { api } from "../api/client";
import RconConsole from "./RconConsole";
import { useOperation, operationLabel } from "../OperationsContext";

/**
 * Start, stop, restart and update, and the console: what a moderator needs to run
 * a server. (Administrators get the same buttons on their Settings tab, next to
 * the settings themselves.)
 */
function ServerControls({ serverName, serverStatus }) {
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const [info, setInfo] = React.useState(null);
	const [message, setMessage] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [confirm, setConfirm] = React.useState(null); // "update" | "update-reboot" | "stop" | "restart"
	const operation = useOperation(serverName);
	const online = Boolean(serverStatus?.online);

	React.useEffect(() => {
		api.get(`${base}/overview`).then(setInfo).catch((e) => setError(e.message));
	}, [base]);

	const send = async (action) => {
		setConfirm(null);
		setMessage(null);
		setError(null);
		try {
			const r = await api.post(`/api/control/${encodeURIComponent(serverName)}/${action}`);
			setMessage(r.message ?? "Done.");
		} catch (e) {
			setError(e.message);
		}
	};

	const busy = Boolean(operation);
	const confirmText = {
		stop: `Stop ${serverName}? Players will be disconnected. It is saved first where the game allows.`,
		restart: `Restart ${serverName}? Players are disconnected while it restarts.`,
		update: `Update ${serverName}? This stops it, runs the SteamCMD update, and leaves it stopped.`,
		"update-reboot": `Update and restart ${serverName}? This stops it, runs the SteamCMD update, then starts it again.`,
	};

	return (
		<Box>
			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}
			{message && (
				<Alert severity="info" onClose={() => setMessage(null)} sx={{ mb: 2 }}>
					{message}
				</Alert>
			)}
			<Paper sx={{ p: 2, mb: 2 }}>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
					<Chip label={online ? "ONLINE" : "OFFLINE"} color={online ? "success" : "default"} />
					{busy && <Chip color="info" variant="outlined" label={operationLabel(operation)} />}
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{serverStatus?.playerCount ?? 0} player{(serverStatus?.playerCount ?? 0) === 1 ? "" : "s"}
						{serverStatus?.ping != null && online ? ` · ${serverStatus.ping} ms` : ""}
					</Typography>
				</Box>
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
					<Button variant="contained" color="success" disabled={busy || online} onClick={() => send("start")}>
						Start
					</Button>
					<Button variant="contained" color="error" disabled={busy || !online} onClick={() => setConfirm("stop")}>
						Stop
					</Button>
					<Button variant="contained" disabled={busy || !online} onClick={() => setConfirm("restart")}>
						Restart
					</Button>
					{info?.hasUpdate && (
						<>
							<Button variant="outlined" color="warning" disabled={busy} onClick={() => setConfirm("update")}>
								Update
							</Button>
							<Button variant="outlined" color="warning" disabled={busy} onClick={() => setConfirm("update-reboot")}>
								Update and restart
							</Button>
						</>
					)}
				</Box>
			</Paper>

			{info?.hasRcon && <RconConsole serverName={serverName} />}

			<Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)}>
				<DialogTitle>Are you sure?</DialogTitle>
				<DialogContent>
					<DialogContentText>{confirm ? confirmText[confirm] : ""}</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirm(null)}>Cancel</Button>
					<Button variant="contained" color="warning" onClick={() => send(confirm)}>
						Yes
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}

export default ServerControls;
