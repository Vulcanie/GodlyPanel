import React from "react";
import {
	Alert,
	Box,
	Button,
	Checkbox,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	FormControlLabel,
	IconButton,
	MenuItem,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import {
	Add as AddIcon,
	Delete as DeleteIcon,
	Folder as FolderIcon,
	FolderOpen as FolderOpenIcon,
	History as HistoryIcon,
	Restore as RestoreIcon,
	Settings as SettingsIcon,
} from "@mui/icons-material";
import { api } from "../api/client";
import { onLive } from "../liveEvents";
import { formatBytes } from "../utils/format";
import { t, tn, useT, formatDate } from "../i18n";
import { ratioText, formatLabel, formatName, levelName, recompressTargets, settingsBody, limitGBFromBytes, friendlyError } from "./backupSizes";
import { useOperation, operationLabel } from "../OperationsContext";
import { useToast } from "../ToastContext";
import OffsiteCopies, { CopyChips, kindLabel } from "./OffsiteCopies";
import SectionCard from "./ui/SectionCard";
import ConfirmDialog from "./ui/ConfirmDialog";
import TipRow from "./TipRow";
import InfoTip from "./InfoTip";

// Each label is a literal t() call, so the translation check can see every key.
function phaseLabel(phase) {
	switch (phase) {
		case "checking":
			return t("backups.phase.checking");
		case "stopping":
			return t("backups.phase.stopping");
		case "saving":
			return t("backups.phase.saving");
		case "copying":
			return t("backups.phase.copying");
		case "verifying":
			return t("backups.phase.verifying");
		case "starting":
			return t("backups.phase.starting");
		case "safety-backup":
			return t("backups.phase.safetyBackup");
		case "restoring":
			return t("backups.phase.restoring");
		default:
			return phase;
	}
}

function modeLabel(mode) {
	switch (mode) {
		case "auto":
			return t("backups.mode.auto");
		case "stop":
			return t("backups.mode.stop");
		case "live":
			return t("backups.mode.live");
		default:
			return mode;
	}
}

const MODE_VALUES = ["auto", "stop", "live"];

const when = (iso) => formatDate(iso);
const native = () => (typeof window !== "undefined" ? window.godlyPanel : undefined);


/**
 * Backups for one server: take one, see what there is, restore or delete, and
 * choose what is backed up. Restoring and the settings are for administrators;
 * a moderator can take and look at backups.
 */
function BackupsPanel({ serverName, serverStatus, canManage }) {
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const toast = useToast();
	// Re-renders this panel when the language changes, so the t() text below switches with it.
	useT();
	const [data, setData] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [phase, setPhase] = React.useState(null);
	const [mode, setMode] = React.useState("default");
	const [restoreTarget, setRestoreTarget] = React.useState(null);
	// The backup being asked about stays set after the dialog closes, so its text does not blank out while it fades away.
	const [deleteTarget, setDeleteTarget] = React.useState(null);
	const [deleteOpen, setDeleteOpen] = React.useState(false);
	const [recompressOpen, setRecompressOpen] = React.useState(false);
	const [showSettings, setShowSettings] = React.useState(false);
	const operation = useOperation(serverName);
	// A reply that lands after the person has moved to another server must not be shown on that server's page.
	const current = React.useRef(base);
	current.current = base;

	const load = React.useCallback(async () => {
		try {
			const next = await api.get(`${base}/backups`);
			if (current.current !== base) return;
			setData(next);
			setError(null);
		} catch (e) {
			if (current.current === base) setError(e.message);
		}
	}, [base]);

	React.useEffect(() => {
		setData(null);
		setError(null);
		setPhase(null);
		setMode("default");
		setRestoreTarget(null);
		setDeleteOpen(false);
		setRecompressOpen(false);
		load();
	}, [load]);

	React.useEffect(() => {
		const offProgress = onLive("backup_progress", (e) => {
			if (e.serverName !== serverName) return;
			if (e.phase === "done") {
				setPhase(null);
				load();
			} else setPhase(e.phase);
		});
		const offActivity = onLive("activity", (e) => {
			if (e.event?.server === serverName && /^backup\./.test(e.event.type)) {
				load();
				if (e.event.type === "backup.failed" || e.event.type === "backup.restore_failed" || e.event.type === "backup.restart_failed") setError(e.event.message);
				if (e.event.type === "backup.restored") toast(e.event.message);
			}
		});
		return () => {
			offProgress();
			offActivity();
		};
	}, [serverName, load, toast]);

	const busy = Boolean(operation);

	const backUp = async () => {
		setError(null);
		try {
			await api.post(`${base}/backups`, mode === "default" ? {} : { mode });
			toast(t("backups.started"), "info");
		} catch (e) {
			setError(e.message);
		}
	};

	const askDelete = (b) => {
		setDeleteTarget(b);
		setDeleteOpen(true);
	};

	const remove = async (b) => {
		setDeleteOpen(false);
		try {
			await api.del(`${base}/backups/${encodeURIComponent(b.id)}`);
			toast(t("backups.deleted"));
			load();
		} catch (e) {
			setError(e.message);
		}
	};

	// Rewrites the backups that are not already in this server's format and level. The server does the work and reports progress
	// through the live events, which reload this list.
	const recompress = async () => {
		setRecompressOpen(false);
		setError(null);
		try {
			await api.post(`${base}/backups/recompress`, { format: data.effectiveFormat, level: data.effectiveLevel });
			toast(t("backups.recompressStarted"));
		} catch (e) {
			setError(friendlyError(e));
		}
	};

	if (!data) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress size={24} />;

	const running = serverStatus?.online;
	const specs = data.specs ?? [];
	const backups = data.backups ?? [];
	const missing = specs.filter((s) => !s.exists);
	// Only offered when there is something to rewrite. An older server that does not report its effective format gets no button.
	const recompressIds = data.effectiveFormat && data.effectiveLevel ? recompressTargets(backups, data.effectiveFormat, data.effectiveLevel) : [];
	const savedText = data.savedBytes > 0 ? t("backups.saved", { size: formatBytes(data.savedBytes) }) : null;
const budgetText = data.maxTotalBytes ? t("backups.budget", { used: formatBytes(data.totalBytes ?? 0), limit: formatBytes(data.maxTotalBytes) }) : null;

	return (
		<Box>
			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}

			<SectionCard
				title={
					<>
						{t("backups.whatIsBackedUp")}
								<InfoTip id="server.backup.paths" />
					</>
				}
				icon={<FolderIcon />}
				actions={
					canManage && (
						<Button startIcon={<SettingsIcon />} variant="outlined" size="small" onClick={() => setShowSettings(true)}>
							{t("backups.chooseFolders")}
						</Button>
					)
				}
			>
				{data.needsSetup ? (
					<Typography variant="body2" sx={{ color: "warning.main" }}>
						{canManage ? t("backups.setupNeeded") : t("backups.setupNeededAsk")}
					</Typography>
				) : (
					<Box>
						{specs.map((s) => (
							<Typography key={s.path} variant="body2" sx={{ color: s.exists ? "text.secondary" : "warning.main", wordBreak: "break-all" }}>
								{s.exists ? "" : t("backups.notThereYet") + " "}
								{s.label ? `${s.label}: ` : ""}
								{s.path}
							</Typography>
						))}
					</Box>
				)}
				{missing.length > 0 && !data.needsSetup && (
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						{t("backups.missingSkipped")}
					</Typography>
				)}
			</SectionCard>

			<SectionCard title={t("backups.takeBackup")} icon={<HistoryIcon />}>
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
					<Button variant="contained" startIcon={<AddIcon />} disabled={busy || data.needsSetup} onClick={backUp}>
						{operation === "backing up" ? t("backups.backingUp") : t("backups.backUpNow")}
					</Button>
					<TipRow id="server.backup.mode" sx={{ flex: "1 1 260px", maxWidth: 420 }}>
						<TextField select fullWidth size="small" label={t("common.whileRunning")} value={mode} onChange={(e) => setMode(e.target.value)}>
							<MenuItem value="default">{t("backups.modeDefault", { mode: modeLabel(data.mode) })}</MenuItem>
							<MenuItem value="stop">{t("backups.modeStopThenStart")}</MenuItem>
							<MenuItem value="live">{t("backups.modeLiveRisky")}</MenuItem>
						</TextField>
					</TipRow>
					{(phase || (busy && operation !== "backing up")) && (
						<Chip size="small" color="info" label={phase ? phaseLabel(phase) : operationLabel(operation)} icon={<CircularProgress size={12} />} />
					)}
				</Box>
				{data.effectiveMode === "stop" && running && (
					<Typography variant="caption" sx={{ display: "block", mt: 1, color: "warning.main" }}>
						{t("backups.stopsForBackup")}
					</Typography>
				)}
				<Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary", wordBreak: "break-all" }}>
					{data.freeBytes != null ? t("backups.storedInFree", { directory: data.directory, free: formatBytes(data.freeBytes) }) : t("backups.storedIn", { directory: data.directory })}
				</Typography>
			</SectionCard>

			<SectionCard
				title={data.totalBytes ? t("backups.titleWithSize", { count: backups.length, size: formatBytes(data.totalBytes) }) : t("backups.title", { count: backups.length })}
				subtitle={[savedText, budgetText].filter(Boolean).join(" · ") || undefined}
				contentSx={{ p: 0 }}
				actions={
					<>
						{canManage && !busy && recompressIds.length > 0 && (
							<Button size="small" onClick={() => setRecompressOpen(true)}>
								{t("backups.recompress")}
							</Button>
						)}
						{native()?.openFolder && (
							<Button size="small" startIcon={<FolderOpenIcon />} onClick={() => native().openFolder(data.directory)}>
								{t("backups.openFolder")}
							</Button>
						)}
					</>
				}
			>
				{backups.length === 0 ? (
					<Typography variant="body2" sx={{ p: 2.5, color: "text.secondary" }}>
						{t("backups.none")}
					</Typography>
				) : (
					backups.map((b, i) => (
						<Box key={b.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1.25, borderTop: i === 0 ? 0 : 1, borderColor: "divider", flexWrap: "wrap" }}>
							<Box sx={{ flex: 1, minWidth: 200 }}>
								<Typography variant="body2">{when(b.createdAt)}</Typography>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
									<Typography variant="caption" sx={{ color: "text.secondary" }}>
										{formatBytes(b.sizeBytes)}
										{ratioText(b) ? ` · ${ratioText(b)}` : ""}
										{b.reason ? ` · ${b.reason}` : ""}
										{b.consistent === false ? ` · ${t("backups.copiedWhileRunning")}` : ""}
									</Typography>
									{formatLabel(b) && <Chip size="small" variant="outlined" label={formatLabel(b)} />}
								</Box>
							</Box>
							<CopyChips copies={data.replication?.[b.id]} />
							<Chip size="small" label={kindLabel(b.kind)} color={b.kind === "manual" ? "primary" : "default"} variant={b.kind === "manual" ? "filled" : "outlined"} />
							{canManage && (
								<>
									<Button size="small" variant="outlined" color="warning" startIcon={<RestoreIcon />} disabled={busy} onClick={() => setRestoreTarget(b)}>
										{running ? t("backups.restartAndUse") : t("backups.useThis")}
									</Button>
									<Tooltip title={t("backups.deleteThis")}>
										<span>
											<IconButton size="small" aria-label={t("backups.deleteThis")} disabled={busy} onClick={() => askDelete(b)}>
												<DeleteIcon fontSize="small" />
											</IconButton>
										</span>
									</Tooltip>
								</>
							)}
						</Box>
					))
				)}
			</SectionCard>

			<OffsiteCopies base={base} data={data} canManage={canManage} busy={busy} onError={setError} onChanged={load} />

			<ConfirmDialog
				open={deleteOpen && Boolean(deleteTarget)}
				title={t("backups.deleteTitle")}
				confirmLabel={t("common.deleteIt")}
				color="error"
				onConfirm={() => remove(deleteTarget)}
				onClose={() => setDeleteOpen(false)}
			>
				{deleteTarget && t("backups.deleteBody", { date: when(deleteTarget.createdAt) })}
			</ConfirmDialog>

			<ConfirmDialog
				open={recompressOpen}
				title={t("backups.recompressTitle")}
				confirmLabel={t("backups.recompressConfirm")}
				color="warning"
				onConfirm={recompress}
				onClose={() => setRecompressOpen(false)}
			>
				{tn("backups.recompressBody", recompressIds.length, { format: formatName(data.effectiveFormat) ?? data.effectiveFormat, level: levelName(data.effectiveLevel) ?? data.effectiveLevel })}
			</ConfirmDialog>

			{restoreTarget && (
				<RestoreDialog
					serverName={serverName}
					base={base}
					backup={restoreTarget}
					running={Boolean(running)}
					players={serverStatus?.playerCount ?? 0}
					sharedFolders={specs.filter((s) => s.shared).map((s) => s.path)}
					onClose={() => setRestoreTarget(null)}
					onError={setError}
					onStarted={(restart) => toast(restart ? t("backups.restoringRestart") : t("backups.restoringDone"), "info")}
				/>
			)}
			{showSettings && <BackupSettingsDialog base={base} data={data} onClose={() => setShowSettings(false)} onSaved={(next) => setData(next)} />}
		</Box>
	);
}

function RestoreDialog({ serverName, base, backup, running, players = 0, sharedFolders = [], onClose, onError, onStarted }) {
	useT();
	const [confirmName, setConfirmName] = React.useState("");
	const [allowShared, setAllowShared] = React.useState(false);
	const [safety, setSafety] = React.useState(true);
	const [startAfter, setStartAfter] = React.useState(true);
	const [busy, setBusy] = React.useState(false);

	// A running server is always restarted (it has to be stopped for this); a stopped one is started if asked.
	const restart = running || startAfter;
	// Without the safety backup there is no undo, so the server's name has to be typed.
	const needsName = !safety;
	const labels = [...new Set((backup.entries ?? []).map((e) => e.label).filter(Boolean))];

	const go = async () => {
		setBusy(true);
		try {
			await api.post(`${base}/backups/${encodeURIComponent(backup.id)}/restore`, { confirm: true, ...(needsName ? { confirmName } : {}), safety, allowShared, restart });
			onStarted(restart);
			onClose();
		} catch (e) {
			onError(e.message);
			onClose();
		}
	};

	return (
		<Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
			<DialogTitle>{running ? t("backups.restartUseTitle", { name: serverName }) : t("backups.useForTitle", { name: serverName })}</DialogTitle>
			<DialogContent>
				<Alert severity="warning" sx={{ mb: 2 }}>
					<strong>{t("backups.erases")}</strong> {t("backups.goesBack", { date: when(backup.createdAt), changes: labels.length > 0 ? labels.join(", ").toLowerCase() : t("backups.theWorldAndSettings") })}
				</Alert>
				<DialogContentText sx={{ mb: 1 }}>
					{running ? t("backups.willStopRestart") : t("backups.willPutBack")}
					{running && players > 0 ? ` ${tn("backups.playersOn", players)}` : ""}
				</DialogContentText>
				{backup.consistent === false && (
					<Alert severity="info" sx={{ mb: 1 }}>
						{t("backups.copiedRunningWarn")}
					</Alert>
				)}
				{!running && (
					<Box>
						<TipRow id="server.backup.restore.start">
							<FormControlLabel control={<Checkbox checked={startAfter} onChange={(e) => setStartAfter(e.target.checked)} />} label={t("backups.startAfter")} />
						</TipRow>
					</Box>
				)}
				<Box>
					<TipRow id="server.backup.restore.safety">
						<FormControlLabel
							control={<Checkbox checked={safety} onChange={(e) => setSafety(e.target.checked)} />}
							label={t("backups.keepSafety")}
						/>
					</TipRow>
				</Box>
				{sharedFolders.length > 0 && (
					<Alert severity="warning" sx={{ mt: 2 }}>
						{t("backups.sharedFolder", { folders: sharedFolders.join(", ") })}
						<Box>
							<TipRow id="server.backup.restore.shared">
								<FormControlLabel control={<Checkbox checked={allowShared} onChange={(e) => setAllowShared(e.target.checked)} />} label={t("backups.understandShared")} />
							</TipRow>
						</Box>
					</Alert>
				)}
				{needsName && (
					<TextField fullWidth size="small" sx={{ mt: 2 }} label={t("backups.typeToConfirm", { name: serverName })} value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={busy}>
					{t("common.cancel")}
					</Button>
					<Button color="warning" variant="contained" disabled={busy || (needsName && confirmName !== serverName) || (sharedFolders.length > 0 && !allowShared)} onClick={go}>
					{running ? t("backups.restartAndUse") : restart ? t("backups.useAndStart") : t("backups.useThis")}
				</Button>
			</DialogActions>
		</Dialog>
	);
}

function BackupSettingsDialog({ base, data, onClose, onSaved }) {
	useT();
	const custom = data.source === "custom";
	const [useDefault, setUseDefault] = React.useState(!custom && data.source !== "none");
	const [rows, setRows] = React.useState(() => (data.specs ?? []).map((s) => ({ path: s.path, label: s.label ?? "" })));
	const [mode, setMode] = React.useState(data.mode ?? "auto");
	const [keepCount, setKeepCount] = React.useState(data.keepCount ?? "");
	const [keepDays, setKeepDays] = React.useState(data.keepDays ?? "");
	// The server's overrides for this server. A blank field means "follow the panel setting" and is sent as null.
	const [format, setFormat] = React.useState(data.format ?? "");
	const [level, setLevel] = React.useState(data.level ?? "");
	const [keepDaily, setKeepDaily] = React.useState(data.keepDaily ?? "");
	const [keepWeekly, setKeepWeekly] = React.useState(data.keepWeekly ?? "");
	const [keepMonthly, setKeepMonthly] = React.useState(data.keepMonthly ?? "");
	const [keepManual, setKeepManual] = React.useState(data.keepManual ?? "");
	const [skipUnchanged, setSkipUnchanged] = React.useState(data.skipUnchanged == null ? "" : data.skipUnchanged ? "yes" : "no");
	const [limitGB, setLimitGB] = React.useState(limitGBFromBytes(data.maxTotalBytes));
	const [error, setError] = React.useState(null);
	const [busy, setBusy] = React.useState(false);

	const browse = async (index) => {
		const chosen = await native()?.pickFolder?.({ title: t("backups.pickTitle"), defaultPath: rows[index]?.path });
		if (chosen) setRows((r) => r.map((row, i) => (i === index ? { ...row, path: chosen } : row)));
	};

	const toNumber = (v) => (v === "" ? null : Number(v));

	const save = async () => {
		setBusy(true);
		setError(null);
		try {
			const overrides = settingsBody({ format, level, keepDaily, keepWeekly, keepMonthly, keepManual, skipUnchanged, limitGB });
			// The limit is shown rounded to two decimals of a GB. If it was not touched, send the exact bytes back, so saving some other
			// setting does not quietly round it.
			if (limitGB === limitGBFromBytes(data.maxTotalBytes)) overrides.maxTotalBytes = data.maxTotalBytes ?? null;
			const body = {
				paths: useDefault ? null : rows.filter((r) => r.path.trim()).map((r) => ({ path: r.path.trim(), ...(r.label.trim() ? { label: r.label.trim() } : {}) })),
				mode,
				keepCount: toNumber(keepCount),
				keepDays: toNumber(keepDays),
				...overrides,
			};
			onSaved(await api.put(`${base}/backups/settings`, body));
			onClose();
		} catch (e) {
			setError(friendlyError(e));
			setBusy(false);
		}
	};

	return (
		<Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
			<DialogTitle>{t("backups.settingsTitle")}</DialogTitle>
			<DialogContent>
				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}
				{data.source !== "none" || custom ? (
					<TipRow id="server.backup.paths">
						<FormControlLabel control={<Checkbox checked={useDefault} onChange={(e) => setUseDefault(e.target.checked)} />} label={t("backups.useUsual")} />
					</TipRow>
				) : (
					<Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
						{t("backups.unknownSaves")}
						<InfoTip id="server.backup.paths" />
					</Typography>
				)}

				{!useDefault && (
					<Box sx={{ mt: 1 }}>
						{rows.map((row, i) => (
							<Box key={i} sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap", alignItems: "center" }}>
								<TextField size="small" label={t("backups.folderOrFile")} value={row.path} onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, path: e.target.value } : x)))} sx={{ flex: "3 1 220px" }} />
								<TextField size="small" label={t("backups.labelOptional")} value={row.label} onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} sx={{ flex: "1 1 140px" }} />
								{native()?.pickFolder && (
									<Button size="small" onClick={() => browse(i)}>
										{t("common.browse")}
									</Button>
								)}
								<IconButton size="small" aria-label={t("backups.removeFolder")} onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>
									<DeleteIcon fontSize="small" />
								</IconButton>
							</Box>
						))}
						<Button size="small" startIcon={<AddIcon />} onClick={() => setRows((r) => [...r, { path: "", label: "" }])}>
							{t("backups.addFolder")}
						</Button>
					</Box>
				)}

				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 3 }}>
					<TipRow id="server.backup.mode" sx={{ flex: "1 1 260px", maxWidth: 360 }}>
						<TextField select fullWidth size="small" label={t("backups.whileServerRunning")} value={mode} onChange={(e) => setMode(e.target.value)}>
							{MODE_VALUES.map((value) => (
								<MenuItem key={value} value={value}>
									{modeLabel(value)}
								</MenuItem>
							))}
						</TextField>
					</TipRow>
					<TipRow id="server.backup.keepCount" sx={{ flex: "1 1 200px", maxWidth: 260 }}>
						<TextField fullWidth size="small" type="number" label={t("backups.keepCountLabel")} value={keepCount} placeholder={t("backups.panelDefault")} onChange={(e) => setKeepCount(e.target.value)} />
					</TipRow>
					<TipRow id="server.backup.keepDays" sx={{ flex: "1 1 200px", maxWidth: 260 }}>
						<TextField fullWidth size="small" type="number" label={t("common.deleteOlderDays")} value={keepDays} placeholder={t("backups.panelDefault")} onChange={(e) => setKeepDays(e.target.value)} />
					</TipRow>
				</Box>
				<Box sx={{ mt: 3 }}>
					<Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>{t("backups.compression")}</Typography>
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
						<TextField select size="small" label={t("backups.format")} value={format} onChange={(e) => setFormat(e.target.value)} sx={{ flex: "1 1 200px", maxWidth: 260 }}>
							<MenuItem value="">{t("backups.panelSetting")}</MenuItem>
							{["zip", "zstd", "xz"].map((f) => (
								<MenuItem key={f} value={f}>
									{formatName(f)}
								</MenuItem>
							))}
						</TextField>
						<TextField select size="small" label={t("backups.level")} value={level} onChange={(e) => setLevel(e.target.value)} sx={{ flex: "1 1 200px", maxWidth: 260 }}>
							<MenuItem value="">{t("backups.panelSetting")}</MenuItem>
							{["fast", "balanced", "max"].map((l) => (
								<MenuItem key={l} value={l}>
									{levelName(l)}
								</MenuItem>
							))}
						</TextField>
					</Box>
				</Box>

				<Box sx={{ mt: 3 }}>
					<Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>{t("backups.keepSpread")}</Typography>
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
						<TextField fullWidth size="small" type="number" label={t("backups.keepDaily")} value={keepDaily} placeholder={t("backups.panelSetting")} onChange={(e) => setKeepDaily(e.target.value)} sx={{ flex: "1 1 160px", maxWidth: 200 }} />
						<TextField fullWidth size="small" type="number" label={t("backups.keepWeekly")} value={keepWeekly} placeholder={t("backups.panelSetting")} onChange={(e) => setKeepWeekly(e.target.value)} sx={{ flex: "1 1 160px", maxWidth: 200 }} />
						<TextField fullWidth size="small" type="number" label={t("backups.keepMonthly")} value={keepMonthly} placeholder={t("backups.panelSetting")} onChange={(e) => setKeepMonthly(e.target.value)} sx={{ flex: "1 1 160px", maxWidth: 200 }} />
					</Box>
					<Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>{t("backups.keepSpreadHint")}</Typography>
				</Box>

				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 3 }}>
					<TextField size="small" type="number" label={t("backups.keepManual")} value={keepManual} placeholder={t("backups.neverRemoved")} onChange={(e) => setKeepManual(e.target.value)} sx={{ flex: "1 1 200px", maxWidth: 260 }} />
					<TextField select size="small" label={t("backups.skipUnchanged")} value={skipUnchanged} onChange={(e) => setSkipUnchanged(e.target.value)} sx={{ flex: "1 1 260px", maxWidth: 360 }}>
						<MenuItem value="">{t("backups.panelSetting")}</MenuItem>
						<MenuItem value="yes">{t("backups.yes")}</MenuItem>
						<MenuItem value="no">{t("backups.no")}</MenuItem>
					</TextField>
					<TextField size="small" type="number" label={t("backups.limit")} helperText={t("backups.limitHint")} value={limitGB} onChange={(e) => setLimitGB(e.target.value)} slotProps={{ htmlInput: { min: 0, step: "any" } }} sx={{ flex: "1 1 200px", maxWidth: 260 }} />
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={busy}>
					{t("common.cancel")}
					</Button>
					<Button variant="contained" onClick={save} disabled={busy}>
					{t("common.save")}
					</Button>
				</DialogActions>
		</Dialog>
	);
}

export default BackupsPanel;
