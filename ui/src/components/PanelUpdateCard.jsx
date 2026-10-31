import React from "react";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress, Typography } from "@mui/material";
import { api } from "../api/client";
import { onLive } from "../liveEvents";
import { formatBytes } from "../utils/format";
import { t, useT, formatDate } from "../i18n";
import InfoTip from "./InfoTip";
import SectionCard from "./ui/SectionCard";

const native = () => (typeof window !== "undefined" ? window.godlyPanel : undefined);

const WORKING = ["downloading", "verifying", "restarting"];
function stepLabel(phase) {
	switch (phase) {
		case "downloading":
			return t("panelUpdate.step.downloading");
		case "verifying":
			return t("panelUpdate.step.verifying");
		case "restarting":
			return t("panelUpdate.step.restarting");
		default:
			return phase;
	}
}

/**
 * Shown from the moment the panel hands the update to the desktop app. The panel goes away for a few seconds and comes
 * back as the new version (or as the old one, if the new one couldn't start); this waits for it, and reloads the page.
 */
function UpdatingOverlay({ onFailed }) {
	useT();
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
			<DialogTitle>{t("panelUpdate.updatingTitle")}</DialogTitle>
			<DialogContent>
				<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
					<CircularProgress size={28} />
					<Typography variant="body2">{t("panelUpdate.overlayBody")}</Typography>
				</Box>
				{slow && (
					<Alert severity="warning" sx={{ mt: 2 }}>
						{t("panelUpdate.slow")}
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
	useT();
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
		<SectionCard
			title={
				<Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
					{t("panelUpdate.title")}
					<InfoTip id="card.panelUpdate" />
				</Box>
			}
			actions={
				<>
					<Chip size="small" label={t("panelUpdate.youHave", { version: status.current })} />
					{status.available && <Chip size="small" color="primary" label={t("panelUpdate.available", { version: latest.version })} />}
					{!status.available && status.checkedAt && !status.error && <Chip size="small" color="success" label={t("panelUpdate.upToDate")} />}
				</>
			}
		>
			{last && (
				<Alert severity={last.ok ? "success" : "error"} sx={{ mt: 1 }} onClose={dismissResult} data-testid="update-result">
					{last.ok ? last.message : last.rolledBack ? t("panelUpdate.failedUndone", { version: last.version, message: last.message }) : t("panelUpdate.failed", { version: last.version, message: last.message })}
				</Alert>
			)}
			{error && (
				<Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}
			{status.error && (
				<Typography variant="body2" sx={{ color: "warning.main", mt: 1 }}>
					{t("panelUpdate.couldntCheck", { error: status.error })}
				</Typography>
			)}
			<Typography variant="body2" sx={{ color: "text.secondary", my: 1 }}>
				{status.checkedAt ? t("panelUpdate.lastChecked", { date: formatDate(status.checkedAt), repo: status.repo }) : t("panelUpdate.notChecked", { repo: status.repo })}
				{!status.enabled && ` ${t("panelUpdate.autoOff")}`}
			</Typography>

			{status.available && (
				<Box sx={{ mt: 1 }}>
					<Typography variant="body2">
						<strong>{latest.name}</strong>
						{latest.prerelease ? ` ${t("panelUpdate.prerelease")}` : ""} {latest.publishedAt ? `· ${formatDate(latest.publishedAt)}` : ""}
					</Typography>
					<Button size="small" onClick={() => setShowNotes((s) => !s)}>
						{showNotes ? t("panelUpdate.hideNotes") : t("panelUpdate.whatsNew")}
					</Button>
					{showNotes && (
						<Box component="pre" sx={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, maxHeight: 320, overflow: "auto", bgcolor: (t) => t.custom.hover, p: 1.5, borderRadius: 2, mt: 1 }}>
							{latest.notes}
						</Box>
					)}

					{working && (
						<Box sx={{ mt: 1 }} data-testid="update-progress">
							<LinearProgress variant={install.phase === "downloading" && install.total ? "determinate" : "indeterminate"} value={install.total ? Math.min(100, (install.received / install.total) * 100) : 0} />
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								{stepLabel(install.phase)}
								{install.phase === "downloading" && install.total ? ` ${t("panelUpdate.progressOf", { received: formatBytes(install.received), total: formatBytes(install.total) })}` : ""}
							</Typography>
						</Box>
					)}
					{install?.phase === "failed" && (
						<Alert severity="error" sx={{ mt: 1 }} data-testid="update-failed">
							{t("panelUpdate.notGoAhead", { error: install.error })}
						</Alert>
					)}
					{selfUpdate && !selfUpdate.support.ok && (
						<Alert severity="info" sx={{ mt: 1 }}>
							{selfUpdate.support.reason}
						</Alert>
					)}
					{selfUpdate?.support?.ok && !selfUpdate.plan && (
						<Alert severity={selfUpdate.signature === "invalid" ? "error" : "info"} sx={{ mt: 1 }} data-testid="update-unsigned">
							{selfUpdate.signature === "invalid"
								? t("panelUpdate.sigInvalid")
								: selfUpdate.signature === "missing"
									? t("panelUpdate.sigMissing")
									: t("panelUpdate.sigNoChecksum")}
						</Alert>
					)}
					{selfUpdate?.plan && selfUpdate.signature === "valid" && (
						<Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }} data-testid="update-signed">
							{t("panelUpdate.signed")}
						</Typography>
					)}

					{dl?.status === "downloading" && (
						<Box sx={{ mt: 1 }}>
							<LinearProgress variant="determinate" value={dl.total ? Math.min(100, (dl.received / dl.total) * 100) : 0} />
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								{t("panelUpdate.downloadingOf", { received: formatBytes(dl.received), total: formatBytes(dl.total) })}
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
							{t("panelUpdate.downloaded", { name: dl.name, folder: status.downloadFolder })}{" "}
							{dl.verified ? (dl.signed ? t("panelUpdate.verifiedSigned") : t("panelUpdate.verifiedNotes")) : t("panelUpdate.unverified")} {t("panelUpdate.byHandBefore")} <code>data</code> {t("panelUpdate.byHandAfter")}
							{native()?.openFolder && (
								<Button size="small" sx={{ ml: 1 }} onClick={() => native().openFolder(status.downloadFolder)}>
									{t("panelUpdate.showFile")}
								</Button>
							)}
						</Alert>
					)}
				</Box>
			)}

			<Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
				<Button size="small" variant="outlined" disabled={checking || working} onClick={check}>
					{checking ? t("panelUpdate.checking") : t("panelUpdate.checkNow")}
				</Button>
				{status.available && canInstall && (
					<Button size="small" variant="contained" disabled={working || starting} onClick={() => setConfirming(true)}>
						{t("panelUpdate.updateNowSize", { size: formatBytes(selfUpdate.plan.size) })}
					</Button>
				)}
				{status.available && latest.asset && dl?.status !== "downloading" && !working && (
					<Button size="small" variant={canInstall ? "text" : "contained"} onClick={download}>
						{canInstall ? t("panelUpdate.downloadWhole") : t("panelUpdate.downloadSize", { size: formatBytes(latest.asset.size) })}
					</Button>
				)}
			</Box>

			{confirming && (
				<Dialog open onClose={starting ? undefined : () => setConfirming(false)} fullWidth maxWidth="sm">
					<DialogTitle>{t("panelUpdate.confirmTitle", { version: latest.version })}</DialogTitle>
					<DialogContent>
						<DialogContentText sx={{ mb: 1 }}>
							{selfUpdate.plan.kind === "app"
								? t("panelUpdate.onlyChanged", { size: formatBytes(selfUpdate.plan.size) })
								: t("panelUpdate.wholePackage", { size: formatBytes(selfUpdate.plan.size) })}{" "}
							{t("panelUpdate.checkedAgainst")}
						</DialogContentText>
						<Alert severity="info" sx={{ mb: 1 }}>
							<strong>{t("panelUpdate.keepRunning")}</strong>{t("panelUpdate.keepRunningRest")}
						</Alert>
						<DialogContentText>{t("panelUpdate.ifNotStart")}</DialogContentText>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setConfirming(false)} disabled={starting}>
							{t("common.cancel")}
						</Button>
						<Button variant="contained" onClick={updateNow} disabled={starting}>
							{t("panelUpdate.yesUpdate")}
						</Button>
					</DialogActions>
				</Dialog>
			)}

			{install?.phase === "restarting" && <UpdatingOverlay onFailed={setStatus} />}
		</SectionCard>
	);
}

export default PanelUpdateCard;
