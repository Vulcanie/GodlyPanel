import React from "react";
import { Alert, Box, Button, Chip, LinearProgress, Paper, Typography } from "@mui/material";
import { api } from "../api/client";
import { onLive } from "../liveEvents";
import { formatBytes } from "../utils/format";

const native = () => (typeof window !== "undefined" ? window.godlyPanel : undefined);

/**
 * "Is there a newer GodlyPanel?" The panel asks GitHub's public releases list,
 * shows the release notes, and can download the new zip and check it against the
 * checksum in those notes. Replacing the app is unzipping it over the old folder.
 */
function PanelUpdateCard() {
	const [status, setStatus] = React.useState(null);
	const [checking, setChecking] = React.useState(false);
	const [error, setError] = React.useState(null);
	const [showNotes, setShowNotes] = React.useState(false);

	const load = React.useCallback(() => api.get("/api/updates/panel").then(setStatus).catch((e) => setError(e.message)), []);
	React.useEffect(() => {
		load();
	}, [load]);

	React.useEffect(() => {
		const off = onLive("panel_update_progress", () => load());
		return off;
	}, [load]);

	React.useEffect(() => {
		if (status?.download?.status !== "downloading") return undefined;
		const timer = setInterval(load, 1500);
		return () => clearInterval(timer);
	}, [status, load]);

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

	if (!status) return null;
	const { latest, download: dl } = status;

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
				{status.checkedAt ? `Last checked ${new Date(status.checkedAt).toLocaleString()}.` : "Not checked yet."} Looks at the public releases on GitHub ({status.repo}); nothing about you or your servers is sent. It never installs anything by itself.
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
						<Box component="pre" sx={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, maxHeight: 320, overflow: "auto", bgcolor: "rgba(255,255,255,0.04)", p: 1.5, borderRadius: 1, mt: 1 }}>
							{latest.notes}
						</Box>
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
							{dl.verified ? "It matches the checksum in the release notes." : "The release notes gave no checksum to compare it with, so it is unverified."} To update: quit GodlyPanel, unzip it over the old folder (keeping your <code>data</code> folder), and start it again.
							{native()?.openFolder && (
								<Button size="small" sx={{ ml: 1 }} onClick={() => native().openFolder(status.downloadFolder)}>
									Show the file
								</Button>
							)}
						</Alert>
					)}
				</Box>
			)}

			<Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
				<Button size="small" variant="outlined" disabled={checking} onClick={check}>
					{checking ? "Checking…" : "Check now"}
				</Button>
				{status.available && latest.asset && dl?.status !== "downloading" && (
					<Button size="small" variant="contained" onClick={download}>
						Download {formatBytes(latest.asset.size)}
					</Button>
				)}
			</Box>
		</Paper>
	);
}

export default PanelUpdateCard;
