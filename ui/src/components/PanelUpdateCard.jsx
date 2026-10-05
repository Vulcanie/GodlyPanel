import React from "react";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress, Paper, Typography } from "@mui/material";
import { api } from "../api/client";
import { onLive } from "../liveEvents";
import { formatBytes } from "../utils/format";

const native = () => (typeof window !== "undefined" ? window.godlyPanel : undefined);

const WORKING = ["downloading", "verifying", "restarting"];
const STEPS = { downloading: "Downloading the update…", verifying: "Checking it…", restarting: "Restarting GodlyPanel…" };

/**
 * Shown from the moment the panel hands the update to the desktop app. The panel goes away for a few seconds and comes
 * back as the new version (or as the old one, if the new one couldn't start); this waits for it, and reloads the page.
 */
function UpdatingOverlay({ onFailed }) {
	const [slow, setSlow] = React.useState(false);

	React.useEffect(() => {
		let alive = true;
		let sawDown = false;
		const started = Date.now();
		const tick = async () => {
			if (!alive) return;
			let up = false;
			try {
				up = (await fetch("/api/setup/status", { cache: "no-store" })).ok;
			} catch {
				up = false;
			}
			if (!alive) return;
			if (!up) sawDown = true;
			else if (sawDown) {
				// Back: reload to pick up the new interface.
				window.location.reload();
				return;
			} else {
				// Still the same process: the update may have been refused, which the panel reports.
				const status = await api.get("/api/updates/panel").catch(() => null);
				if (alive && status?.selfUpdate?.install?.phase === "failed") {
					onFailed(status);
					return;
				}
			}
			if (Date.now() - started > 3 * 60_000) setSlow(true);
			setTimeout(tick, 1500);
		};
		const first = setTimeout(tick, 1500);
		return () => {
			alive = false;
			clearTimeout(first);
		};
	}, [onFailed]);

	return (
		<Dialog open fullWidth maxWidth="xs">
			<DialogTitle>Updating GodlyPanel</DialogTitle>
			<DialogContent>
				<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
					<CircularProgress size={28} />
					<Typography variant="body2">This takes about half a minute. This page reloads by itself when GodlyPanel is back. Your game servers keep running.</Typography>
				</Box>
				{slow && (
					<Alert severity="warning" sx={{ mt: 2 }}>
						This is taking longer than usual. If GodlyPanel doesn't come back, start it from its folder: if the new version can't start, the old one is put back automatically.
					</Alert>
				)}
			</DialogContent>
		</Dialog>
	);
}

/**
 * "Is there a newer GodlyPanel?" The panel asks GitHub's public releases list, shows the release notes, and (in the
 * installed app) can install the update itself: a few MB of the app's own files, then a restart. Anywhere else, or if you
 * prefer, it can download the whole package and check it against the checksum in the release notes.
 */
function PanelUpdateCard() {
	const [status, setStatus] = React.useState(null);
	const [checking, setChecking] = React.useState(false);
	const [error, setError] = React.useState(null);
	const [showNotes, setShowNotes] = React.useState(false);
	const [confirming, setConfirming] = React.useState(false);
	const [starting, setStarting] = React.useState(false);

	const load = React.useCallback(() => api.get("/api/updates/panel").then(setStatus).catch((e) => setError(e.message)), []);
	React.useEffect(() => {
		load();
	}, [load]);

	React.useEffect(() => {
		const off = onLive("panel_update_progress", () => load());
		return off;
	}, [load]);

	const install = status?.selfUpdate?.install;
	const working = WORKING.includes(install?.phase);
	React.useEffect(() => {
		if (status?.download?.status !== "downloading" && !working) return undefined;
		const timer = setInterval(load, 1000);
		return () => clearInterval(timer);
	}, [status, working, load]);

	const check = async () => {
		setChecking(true);
		setError(null);
		try {
			setStatus(await api.post("/api/updates/panel/check", {}));
		} catch (e) {
			setError(e.message);
		} finally {
			setChecking(false);
		}
	};

	const download = async () => {
		setError(null);
		try {
			await api.post("/api/updates/panel/download", {});
			load();
		} catch (e) {
			setError(e.message);
		}
	};

	const updateNow = async () => {
		setStarting(true);
		setError(null);
		try {
			await api.post("/api/updates/panel/install", {});
			try {
				// So the page that loads when the panel is back keeps looking for how it went.
				sessionStorage.setItem("gp.updateExpected", String(Date.now()));
			} catch {
				// Only a convenience.
			}
			setConfirming(false);
			await load();
		} catch (e) {
			setConfirming(false);
			setError(e.message);
		} finally {
			setStarting(false);
		}
	};

	const dismissResult = async () => {
		await api.post("/api/updates/panel/update-result/dismiss", {}).catch(() => {});
		load();
	};

	if (!status) return null;
	const { latest, download: dl, selfUpdate } = status;
	const canInstall = Boolean(selfUpdate?.support?.ok && selfUpdate?.plan);
	const last = selfUpdate?.lastUpdate;

	return (
		<Paper sx={{ p: 2, mb: 2 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
				<Typography variant="subtitle2" sx={{ flex: 1 }}>
					GodlyPanel version
				</Typography>
				<Chip size="small" label={`You have ${status.current}`} />
				{status.available && <Chip size="small" color="primary" label={`${latest.version} available`} />}
				{!status.available && status.checkedAt && !status.error && <Chip size="small" color="success" label="Up to date" />}
			</Box>

			{last && (
				<Alert severity={last.ok ? "success" : "error"} sx={{ mt: 1 }} onClose={dismissResult} data-testid="update-result">
					{last.ok ? last.message : `The update to ${last.version} didn't work${last.rolledBack ? " and was undone" : ""}. ${last.message}`}
				</Alert>
			)}
			{error && (
				<Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}
			{status.error && (
				<Typography variant="body2" sx={{ color: "warning.main", mt: 1 }}>
					Couldn't check: {status.error}
				</Typography>
			)}
			<Typography variant="body2" sx={{ color: "text.secondary", my: 1 }}>
				{status.checkedAt ? `Last checked ${new Date(status.checkedAt).toLocaleString()}.` : "Not checked yet."} Looks at the public releases on GitHub ({status.repo}); nothing about you or your servers is sent. It never installs anything unless you press Update now.
				{!status.enabled && " Automatic checks are turned off in the settings below."}
			</Typography>

			{status.available && (
				<Box sx={{ mt: 1 }}>
					<Typography variant="body2">
						<strong>{latest.name}</strong>
						{latest.prerelease ? " (pre-release)" : ""} {latest.publishedAt ? `· ${new Date(latest.publishedAt).toLocaleDateString()}` : ""}
					</Typography>
					<Button size="small" onClick={() => setShowNotes((s) => !s)}>
						{showNotes ? "Hide what's new" : "What's new"}
					</Button>
					{showNotes && (
						<Box component="pre" sx={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, maxHeight: 320, overflow: "auto", bgcolor: "action.hover", p: 1.5, borderRadius: 1, mt: 1 }}>
							{latest.notes}
						</Box>
					)}

					{working && (
						<Box sx={{ mt: 1 }} data-testid="update-progress">
							<LinearProgress variant={install.phase === "downloading" && install.total ? "determinate" : "indeterminate"} value={install.total ? Math.min(100, (install.received / install.total) * 100) : 0} />
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								{STEPS[install.phase]}
								{install.phase === "downloading" && install.total ? ` ${formatBytes(install.received)} of ${formatBytes(install.total)}` : ""}
							</Typography>
						</Box>
					)}
					{install?.phase === "failed" && (
						<Alert severity="error" sx={{ mt: 1 }} data-testid="update-failed">
							The update didn't go ahead: {install.error} Nothing was changed.
						</Alert>
					)}
					{selfUpdate && !selfUpdate.support.ok && (
						<Alert severity="info" sx={{ mt: 1 }}>
							{selfUpdate.support.reason}
						</Alert>
					)}
					{selfUpdate?.support?.ok && !selfUpdate.plan && (
						<Alert severity="info" sx={{ mt: 1 }}>
							This release doesn't publish a checksum the panel can verify, so it won't install it by itself. Download the package and unzip it instead.
						</Alert>
					)}

					{dl?.status === "downloading" && (
						<Box sx={{ mt: 1 }}>
							<LinearProgress variant="determinate" value={dl.total ? Math.min(100, (dl.received / dl.total) * 100) : 0} />
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								Downloading {formatBytes(dl.received)} of {formatBytes(dl.total)}
							</Typography>
						</Box>
					)}
					{dl?.status === "failed" && (
						<Alert severity="error" sx={{ mt: 1 }}>
							{dl.error}
						</Alert>
					)}
					{dl?.status === "done" && (
						<Alert severity={dl.verified ? "success" : "warning"} sx={{ mt: 1 }}>
							Downloaded {dl.name} to {status.downloadFolder}.{" "}
							{dl.verified ? "It matches the checksum in the release notes." : "The release notes gave no checksum to compare it with, so it is unverified."} To update by hand: quit GodlyPanel, unzip it over the old folder (keeping your <code>data</code> folder), and start it again.
							{native()?.openFolder && (
								<Button size="small" sx={{ ml: 1 }} onClick={() => native().openFolder(status.downloadFolder)}>
									Show the file
								</Button>
							)}
						</Alert>
					)}
				</Box>
			)}

			<Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
				<Button size="small" variant="outlined" disabled={checking || working} onClick={check}>
					{checking ? "Checking…" : "Check now"}
				</Button>
				{status.available && canInstall && (
					<Button size="small" variant="contained" disabled={working || starting} onClick={() => setConfirming(true)}>
						Update now ({formatBytes(selfUpdate.plan.size)})
					</Button>
				)}
				{status.available && latest.asset && dl?.status !== "downloading" && !working && (
					<Button size="small" variant={canInstall ? "text" : "contained"} onClick={download}>
						{canInstall ? "Or download the whole package" : `Download ${formatBytes(latest.asset.size)}`}
					</Button>
				)}
			</Box>

			{confirming && (
				<Dialog open onClose={starting ? undefined : () => setConfirming(false)} fullWidth maxWidth="sm">
					<DialogTitle>Update GodlyPanel to {latest.version}?</DialogTitle>
					<DialogContent>
						<DialogContentText sx={{ mb: 1 }}>
							{selfUpdate.plan.kind === "app"
								? `Only what changed is downloaded (${formatBytes(selfUpdate.plan.size)}, not the whole package).`
								: `This version needs a newer Electron, so the whole package is downloaded (${formatBytes(selfUpdate.plan.size)}).`}{" "}
							It is checked against the checksum the release publishes, then GodlyPanel closes, swaps the files and starts the new version. That takes about half a minute.
						</DialogContentText>
						<Alert severity="info" sx={{ mb: 1 }}>
							<strong>Your game servers keep running</strong>, and your settings, accounts and backups are not touched. The panel itself is unavailable for those seconds: anyone using it is disconnected and the page reloads when it's back.
						</Alert>
						<DialogContentText>If the new version doesn't start, the old one is put back automatically.</DialogContentText>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setConfirming(false)} disabled={starting}>
							Cancel
						</Button>
						<Button variant="contained" onClick={updateNow} disabled={starting}>
							Yes, update now
						</Button>
					</DialogActions>
				</Dialog>
			)}

			{install?.phase === "restarting" && <UpdatingOverlay onFailed={setStatus} />}
		</Paper>
	);
}

export default PanelUpdateCard;
