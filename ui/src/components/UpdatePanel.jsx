import React from "react";
import { Box, Button, Checkbox, Chip, FormControlLabel, Switch, Typography } from "@mui/material";
import { Restore as RestoreIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { useOperation } from "../OperationsContext";
import { useToast } from "../ToastContext";
import { t, useT } from "../i18n";
import ConfirmDialog from "./ui/ConfirmDialog";
import SectionCard from "./ui/SectionCard";
import InfoTip from "./InfoTip";
import { outcomeLabel, outcomeColor, buildChange, rollbackHint, rollbackBody, shouldPoll } from "./updatePanel.js";

const POLL_MS = 10000; // how often to ask while an update is still waiting to be seen to come back online
const HISTORY_SHOWN = 5;

// One update record: its outcome as a chip, the build change, and when it happened.
function UpdateRow({ record }) {
	const label = outcomeLabel(record.outcome);
	const change = buildChange(record);
	const when = new Date(record.at);
	return (
		<Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, py: 0.5 }}>
			{label && <Chip size="small" color={outcomeColor(record.outcome)} label={label} />}
			{change && (
				<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
					{change}
				</Typography>
			)}
			{!Number.isNaN(when.getTime()) && (
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					{when.toLocaleString()}
				</Typography>
			)}
		</Box>
	);
}

/**
 * The game update history for one server, with a way to roll back its save files. Administrators also get the switch that backs a
 * server up before every game update. The whole panel is hidden for anyone who may not see updates.
 */
function UpdatePanel({ serverName, isAdmin = false }) {
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const statusPath = `/api/control/${encodeURIComponent(serverName)}/update/status`;
	const toast = useToast();
	// Re-renders this panel when the language changes, so the t() text below switches with it.
	useT();
	const operation = useOperation(serverName);
	const busy = Boolean(operation);

	const [status, setStatus] = React.useState(null); // null while loading, or when the panel is hidden
	const [beforeUpdate, setBeforeUpdate] = React.useState(null); // this server's effective backup-before-update, null when not shown
	const [beforeBusy, setBeforeBusy] = React.useState(false);
	const [rollbackOpen, setRollbackOpen] = React.useState(false);
	const [restart, setRestart] = React.useState(false);

	// Stops a late answer from updating the panel after it has been closed.
	const mounted = React.useRef(false);
	// So a server that keeps failing shows one message, not one per poll.
	const errorShown = React.useRef(false);

	React.useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	const loadStatus = React.useCallback(async () => {
		try {
			const r = await api.get(statusPath);
			if (!mounted.current) return;
			errorShown.current = false;
			setStatus(r);
		} catch (e) {
			if (!mounted.current) return;
			// 403 and 404 mean this user may not see updates, so the panel stays away rather than showing an error.
			if (e.status === 403 || e.status === 404) {
				setStatus(null);
				return;
			}
			if (!errorShown.current) {
				errorShown.current = true;
				toast(e.message, "error");
			}
		}
	}, [statusPath, toast]);

	React.useEffect(() => {
		loadStatus();
	}, [loadStatus]);

	// An update or rollback that just finished has changed the history, so look again.
	const wasBusy = React.useRef(busy);
	React.useEffect(() => {
		if (wasBusy.current && !busy) loadStatus();
		wasBusy.current = busy;
	}, [busy, loadStatus]);

	const latest = status?.latest ?? status?.history?.[0] ?? null;
	const polling = shouldPoll(latest);
	React.useEffect(() => {
		if (!polling) return undefined;
		const id = setInterval(loadStatus, POLL_MS);
		return () => clearInterval(id);
	}, [polling, loadStatus]);

	React.useEffect(() => {
		if (!isAdmin) return undefined;
		let alive = true;
		api
			.get(`${base}/backups`)
			.then((r) => {
				// Only a real yes or no is shown. If the value is missing, the switch stays hidden.
				if (alive && typeof r?.effectiveBeforeUpdate === "boolean") setBeforeUpdate(r.effectiveBeforeUpdate);
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, [base, isAdmin]);

	const toggleBeforeUpdate = async (checked) => {
		setBeforeBusy(true);
		try {
			const r = await api.put(`${base}/backups/settings`, { beforeUpdate: checked });
			if (mounted.current) setBeforeUpdate(typeof r?.effectiveBeforeUpdate === "boolean" ? r.effectiveBeforeUpdate : checked);
		} catch (e) {
			toast(e.message, "error");
		} finally {
			if (mounted.current) setBeforeBusy(false);
		}
	};

	const rollback = status?.rollback ?? null;
	const canRollback = Boolean(rollback?.available) && !busy;
	// The reason the button is off. While something is running a rollback could be possible, so say why it is not offered.
	const hint = canRollback ? null : busy && rollback?.available ? t("update.waitBusy") : rollbackHint(rollback);

	const openRollback = () => {
		setRestart(false);
		setRollbackOpen(true);
	};

	const doRollback = async () => {
		setRollbackOpen(false);
		try {
			await api.post(`/api/control/${encodeURIComponent(serverName)}/update/rollback`, rollbackBody(restart));
			toast(t("update.rollbackStarted", { server: serverName }), "info");
			loadStatus();
		} catch (e) {
			toast(e.message, "error");
		}
	};

	// Nothing to show until the status has loaded, and nothing at all for anyone who may not see updates.
	if (!status) return null;

	const history = (status.history ?? []).slice(0, HISTORY_SHOWN);

	return (
		<SectionCard title={t("update.title")}>
			{latest ? (
				<>
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						{t("update.latest")}
					</Typography>
					<UpdateRow record={latest} />
				</>
			) : (
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					{t("update.none")}
				</Typography>
			)}

			{history.length > 0 && (
				<Box component="ul" sx={{ listStyle: "none", m: 0, mt: 1, p: 0 }}>
					{history.map((record, i) => (
						<Box component="li" key={`${record.at}-${i}`}>
							<UpdateRow record={record} />
						</Box>
					))}
				</Box>
			)}

			<Box sx={{ mt: 2 }}>
				<Button variant="outlined" color="warning" startIcon={<RestoreIcon />} disabled={!canRollback} onClick={openRollback} data-testid="update-rollback">
					{t("update.rollbackButton")}
				</Button>
				{hint && (
					<Typography variant="caption" component="p" sx={{ color: "text.secondary", mt: 0.5, mb: 0 }}>
						{hint}
					</Typography>
				)}
			</Box>

			{isAdmin && beforeUpdate !== null && (
				<Box sx={{ mt: 2, display: "flex", alignItems: "center" }}>
					<FormControlLabel
						control={<Switch checked={beforeUpdate} disabled={beforeBusy} onChange={(e) => toggleBeforeUpdate(e.target.checked)} />}
						label={
							<Typography variant="body2" component="span">
								{t("update.beforeUpdate")}
							</Typography>
						}
					/>
					<InfoTip id="backups.beforeUpdate" />
				</Box>
			)}

			<ConfirmDialog open={rollbackOpen} title={t("update.rollbackTitle")} confirmLabel={t("update.rollbackConfirm")} onClose={() => setRollbackOpen(false)} onConfirm={doRollback}>
				<Box component="span" sx={{ display: "block" }}>
					{t("update.rollbackBody", { server: serverName })}
				</Box>
				<FormControlLabel
					sx={{ mt: 1.5 }}
					control={<Checkbox checked={restart} onChange={(e) => setRestart(e.target.checked)} />}
					label={t("update.rollbackRestart")}
				/>
			</ConfirmDialog>
		</SectionCard>
	);
}

export default UpdatePanel;
