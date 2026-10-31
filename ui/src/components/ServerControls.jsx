import React from "react";
import { Box, Button, Chip, FormControlLabel, Switch, Typography } from "@mui/material";
import { PlayArrow as StartIcon, Stop as StopIcon, RestartAlt as RestartIcon, SystemUpdateAlt as UpdateIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { useOperation, operationLabel } from "../OperationsContext";
import { useToast } from "../ToastContext";
import { t, useT, errorText } from "../i18n";
import ConfirmDialog from "./ui/ConfirmDialog";
import SectionCard from "./ui/SectionCard";
import InfoTip from "./InfoTip";
import { needsBackupOverride, updateBody } from "./updateRules.js";

/**
 * Start, stop, restart and update: what is needed to run a server. Administrators also get the switch that has the server follow
 * Steam's updates by itself.
 */
function ServerControls({ serverName, serverStatus, isAdmin = false }) {
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const toast = useToast();
	// Re-renders this panel when the language changes, so the t() text below switches with it.
	useT();
	const [info, setInfo] = React.useState(null);
	const [autoUpdate, setAutoUpdate] = React.useState(false);
	const [autoBusy, setAutoBusy] = React.useState(false);
	const [confirm, setConfirm] = React.useState(null); // "update" | "update-reboot" | "stop" | "restart"
	const [backupFailed, setBackupFailed] = React.useState(null); // { action, message } when the backup before an update failed
	const operation = useOperation(serverName);
	const online = Boolean(serverStatus?.online);
	const busy = Boolean(operation);

	React.useEffect(() => {
		let alive = true;
		api
			.get(`${base}/overview`)
			.then((r) => alive && setInfo(r))
			.catch((e) => alive && toast(errorText(e), "error"));
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

	const send = async (action, body) => {
		setConfirm(null);
		try {
			const r = await api.post(`/api/control/${encodeURIComponent(serverName)}/${action}`, body);
			toast(r.message ?? t("common.done"), "success");
		} catch (e) {
			// The backup before an update failed. The server refuses the update until the user says to go ahead without one, so ask.
			if ((action === "update" || action === "update-reboot") && needsBackupOverride(e)) {
				setBackupFailed({ action, message: e.message });
				return;
			}
			toast(errorText(e), "error");
		}
	};

	const toggleAutoUpdate = async () => {
		setAutoBusy(true);
		try {
			const r = await api.post(`${base}/auto-update`, { enabled: !autoUpdate });
			setAutoUpdate(r.autoUpdateEnabled);
			toast(r.autoUpdateEnabled ? t("server.autoUpdateOn", { server: serverName }) : t("server.autoUpdateOff", { server: serverName }), "success");
		} catch (e) {
			toast(errorText(e), "error");
		} finally {
			setAutoBusy(false);
		}
	};

	const text = {
		stop: t("server.confirmStop", { server: serverName }),
		restart: t("server.confirmRestart", { server: serverName }),
		update: t("server.confirmUpdate", { server: serverName }),
		"update-reboot": t("server.confirmUpdateRestart", { server: serverName }),
	};

	return (
		<SectionCard
			title={t("server.controls")}
			actions={
				<>
					{busy && <Chip size="small" color="warning" label={operationLabel(operation)} />}
					<Chip size="small" color={online ? "success" : "default"} label={online ? t("common.online") : t("common.offline")} />
				</>
			}
		>
			<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
				<Button variant="contained" color="success" size="large" startIcon={<StartIcon />} disabled={busy || online} onClick={() => send("start")} data-testid="ctl-start">
					{t("common.start")}
				</Button>
				<Button variant="contained" color="error" size="large" startIcon={<StopIcon />} disabled={operation === "starting" ? false : busy || !online} onClick={() => setConfirm("stop")} data-testid="ctl-stop">
					{t("common.stop")}
				</Button>
				<Button variant="contained" color="warning" size="large" startIcon={<RestartIcon />} disabled={busy || !online} onClick={() => setConfirm("restart")} data-testid="ctl-restart">
					{t("common.restart")}
				</Button>
				{info?.hasUpdate && (
					<>
						<Button variant="outlined" color="warning" size="large" startIcon={<UpdateIcon />} disabled={busy} onClick={() => setConfirm("update")}>
							{t("server.update")}
						</Button>
						<Button variant="outlined" color="warning" size="large" startIcon={<UpdateIcon />} disabled={busy} onClick={() => setConfirm("update-reboot")}>
							{t("server.updateAndRestart")}
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
								{t("server.autoUpdate")}
							</Typography>
						}
					/>
					<InfoTip id="server.autoUpdate" />
				</Box>
			)}

			<ConfirmDialog open={Boolean(confirm)} title={t("common.areYouSure")} confirmLabel={t("common.yes")} onClose={() => setConfirm(null)} onConfirm={() => send(confirm)}>
				{confirm ? text[confirm] : ""}
			</ConfirmDialog>

			<ConfirmDialog
				open={Boolean(backupFailed)}
				title={t("update.backupFailedTitle")}
				confirmLabel={t("update.withoutBackup")}
				onClose={() => setBackupFailed(null)}
				onConfirm={() => {
					const { action } = backupFailed;
					setBackupFailed(null);
					// Only here, after the user has confirmed, is the server told to skip the backup.
					send(action, updateBody(true));
				}}
			>
				{backupFailed ? t("update.backupFailedBody", { message: backupFailed.message }) : ""}
			</ConfirmDialog>
		</SectionCard>
	);
}

export default ServerControls;
