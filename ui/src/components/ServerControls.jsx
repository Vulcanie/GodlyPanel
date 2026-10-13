import React from "react";
import { Box, Button, Chip, FormControlLabel, Switch, Typography } from "@mui/material";
import { PlayArrow as StartIcon, Stop as StopIcon, RestartAlt as RestartIcon, SystemUpdateAlt as UpdateIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { useOperation, operationLabel } from "../OperationsContext";
import { useToast } from "../ToastContext";
import ConfirmDialog from "./ui/ConfirmDialog";
import SectionCard from "./ui/SectionCard";
import InfoTip from "./InfoTip";

/**
 * Start, stop, restart and update: what is needed to run a server. Administrators also get the switch that has the server follow
 * Steam's updates by itself.
 */
function ServerControls({ serverName, serverStatus, isAdmin = false }) {
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const toast = useToast();
	const [info, setInfo] = React.useState(null);
	const [autoUpdate, setAutoUpdate] = React.useState(false);
	const [autoBusy, setAutoBusy] = React.useState(false);
	const [confirm, setConfirm] = React.useState(null); // "update" | "update-reboot" | "stop" | "restart"
	const operation = useOperation(serverName);
	const online = Boolean(serverStatus?.online);
	const busy = Boolean(operation);

	React.useEffect(() => {
		let alive = true;
		api
			.get(`${base}/overview`)
			.then((r) => alive && setInfo(r))
			.catch((e) => alive && toast(e.message, "error"));
		if (isAdmin) {
			api
				.get(base)
				.then((r) => alive && setAutoUpdate(Boolean(r.autoUpdateEnabled)))
				.catch(() => {});
		}
		return () => {
			alive = false;
		};
	}, [base, isAdmin, toast]);

	const send = async (action) => {
		setConfirm(null);
		try {
			const r = await api.post(`/api/control/${encodeURIComponent(serverName)}/${action}`);
			toast(r.message ?? "Done.", "success");
		} catch (e) {
			toast(e.message, "error");
		}
	};

	const toggleAutoUpdate = async () => {
		setAutoBusy(true);
		try {
			const r = await api.post(`${base}/auto-update`, { enabled: !autoUpdate });
			setAutoUpdate(r.autoUpdateEnabled);
			toast(`Auto-update turned ${r.autoUpdateEnabled ? "on" : "off"} for ${serverName}.`, "success");
		} catch (e) {
			toast(e.message, "error");
		} finally {
			setAutoBusy(false);
		}
	};

	const text = {
		stop: `Stop ${serverName}? Players will be disconnected. It is saved first where the game allows.`,
		restart: `Restart ${serverName}? Players are disconnected while it restarts.`,
		update: `Update ${serverName}? This stops it, runs the SteamCMD update, and leaves it stopped.`,
		"update-reboot": `Update and restart ${serverName}? This stops it, runs the SteamCMD update, then starts it again.`,
	};

	return (
		<SectionCard
			title="Controls"
			actions={
				<>
					{busy && <Chip size="small" color="warning" label={operationLabel(operation)} />}
					<Chip size="small" color={online ? "success" : "default"} label={online ? "Online" : "Offline"} />
				</>
			}
		>
			<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
				<Button variant="contained" color="success" size="large" startIcon={<StartIcon />} disabled={busy || online} onClick={() => send("start")} data-testid="ctl-start">
					Start
				</Button>
				<Button variant="contained" color="error" size="large" startIcon={<StopIcon />} disabled={operation === "starting" ? false : busy || !online} onClick={() => setConfirm("stop")} data-testid="ctl-stop">
					Stop
				</Button>
				<Button variant="contained" color="warning" size="large" startIcon={<RestartIcon />} disabled={busy || !online} onClick={() => setConfirm("restart")} data-testid="ctl-restart">
					Restart
				</Button>
				{info?.hasUpdate && (
					<>
						<Button variant="outlined" color="warning" size="large" startIcon={<UpdateIcon />} disabled={busy} onClick={() => setConfirm("update")}>
							Update
						</Button>
						<Button variant="outlined" color="warning" size="large" startIcon={<UpdateIcon />} disabled={busy} onClick={() => setConfirm("update-reboot")}>
							Update and restart
						</Button>
					</>
				)}
			</Box>

			{isAdmin && info?.hasUpdate && (
				<Box sx={{ mt: 2, display: "flex", alignItems: "center" }}>
					<FormControlLabel
						control={<Switch checked={autoUpdate} disabled={autoBusy} onChange={toggleAutoUpdate} />}
						label={
							<Typography variant="body2" component="span">
								Update this server automatically when Steam has a new version
							</Typography>
						}
					/>
					<InfoTip id="server.autoUpdate" />
				</Box>
			)}

			<ConfirmDialog open={Boolean(confirm)} title="Are you sure?" confirmLabel="Yes" onClose={() => setConfirm(null)} onConfirm={() => send(confirm)}>
				{confirm ? text[confirm] : ""}
			</ConfirmDialog>
		</SectionCard>
	);
}

export default ServerControls;
