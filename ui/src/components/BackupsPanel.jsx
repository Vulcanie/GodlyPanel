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
import { t, tn, useT, formatBytes as formatBytesText } from "../i18n";
import { ratioText, formatLabel, formatName, levelName, recompressTargets, settingsBody, limitGBFromBytes, friendlyError } from "./backupSizes";
import { useOperation, operationLabel } from "../OperationsContext";
import { useToast } from "../ToastContext";
import OffsiteCopies, { CopyChips } from "./OffsiteCopies";
import SectionCard from "./ui/SectionCard";
import ConfirmDialog from "./ui/ConfirmDialog";
import TipRow from "./TipRow";
import InfoTip from "./InfoTip";

const PHASES = {
	checking: "Checking there is room…",
	stopping: "Stopping the server…",
	saving: "Saving the world…",
	copying: "Copying files…",
	verifying: "Checking the backup reads back…",
	starting: "Starting the server again…",
	"safety-backup": "Backing up what will be replaced…",
	restoring: "Restoring files…",
};

const KIND_LABELS = {
	manual: "Manual",
	scheduled: "Scheduled",
	"pre-restore": "Before a restore",
	"pre-update": "Before an update",
	unknown: "Unknown",
};

const MODE_LABELS = {
	auto: "Automatic (recommended)",
	stop: "Stop the server for the copy",
	live: "Copy while it runs",
};

const when = (iso) => new Date(iso).toLocaleString();
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
			toast("Backup started. It is listed below when it finishes.", "info");
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
			toast("Backup deleted.");
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
	const savedText = data.savedBytes > 0 ? t("backups.saved", { size: formatBytesText(data.savedBytes) }) : null;
	const budgetText = data.maxTotalBytes ? t("backups.budget", { used: formatBytesText(data.totalBytes ?? 0), limit: formatBytesText(data.maxTotalBytes) }) : null;

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
						What is backed up
						<InfoTip id="server.backup.paths" />
					</>
				}
				icon={<FolderIcon />}
				actions={
					canManage && (
						<Button startIcon={<SettingsIcon />} variant="outlined" size="small" onClick={() => setShowSettings(true)}>
							Choose folders & rules
						</Button>
					)
				}
			>
				{data.needsSetup ? (
					<Typography variant="body2" sx={{ color: "warning.main" }}>
						Nothing is set up for this game yet.{canManage ? " Choose the folders that hold its world and settings." : " Ask an administrator to choose the folders."}
					</Typography>
				) : (
					<Box>
						{specs.map((s) => (
							<Typography key={s.path} variant="body2" sx={{ color: s.exists ? "text.secondary" : "warning.main", wordBreak: "break-all" }}>
								{s.exists ? "" : "(not there yet) "}
								{s.label ? `${s.label}: ` : ""}
								{s.path}
							</Typography>
						))}
					</Box>
				)}
				{missing.length > 0 && !data.needsSetup && (
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						Folders that don't exist yet are skipped.
					</Typography>
				)}
			</SectionCard>

			<SectionCard title="Take a backup" icon={<HistoryIcon />}>
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
					<Button variant="contained" startIcon={<AddIcon />} disabled={busy || data.needsSetup} onClick={backUp}>
						{operation === "backing up" ? "Backing up…" : "Back up now"}
					</Button>
					<TipRow id="server.backup.mode" sx={{ flex: "1 1 260px", maxWidth: 420 }}>
						<TextField select fullWidth size="small" label="While it's running" value={mode} onChange={(e) => setMode(e.target.value)}>
							<MenuItem value="default">{`Use the server's setting (${MODE_LABELS[data.mode] ?? data.mode})`}</MenuItem>
							<MenuItem value="stop">Stop it for the copy, then start it again</MenuItem>
							<MenuItem value="live">Keep it running (may be inconsistent)</MenuItem>
						</TextField>
					</TipRow>
					{(phase || (busy && operation !== "backing up")) && (
						<Chip size="small" color="info" label={phase ? PHASES[phase] ?? phase : operationLabel(operation)} icon={<CircularProgress size={12} />} />
					)}
				</Box>
				{data.effectiveMode === "stop" && running && (
					<Typography variant="caption" sx={{ display: "block", mt: 1, color: "warning.main" }}>
						This game can't be saved on command, so a backup stops the server for a minute and starts it again.
					</Typography>
				)}
				<Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary", wordBreak: "break-all" }}>
					Stored in {data.directory}
					{data.freeBytes != null ? ` · ${formatBytes(data.freeBytes)} free on that drive` : ""}
				</Typography>
			</SectionCard>

			<SectionCard
				title={`Backups (${backups.length})${data.totalBytes ? ` · ${formatBytes(data.totalBytes)}` : ""}`}
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
								Open folder
							</Button>
						)}
					</>
				}
			>
				{backups.length === 0 ? (
					<Typography variant="body2" sx={{ p: 2.5, color: "text.secondary" }}>
						No backups yet.
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
										{b.consistent === false ? " · copied while running" : ""}
									</Typography>
									{formatLabel(b) && <Chip size="small" variant="outlined" label={formatLabel(b)} />}
								</Box>
							</Box>
							<CopyChips copies={data.replication?.[b.id]} />
							<Chip size="small" label={KIND_LABELS[b.kind] ?? b.kind} color={b.kind === "manual" ? "primary" : "default"} variant={b.kind === "manual" ? "filled" : "outlined"} />
							{canManage && (
								<>
									<Button size="small" variant="outlined" color="warning" startIcon={<RestoreIcon />} disabled={busy} onClick={() => setRestoreTarget(b)}>
										{running ? "Restart and use this backup" : "Use this backup"}
									</Button>
									<Tooltip title="Delete this backup">
										<span>
											<IconButton size="small" aria-label="Delete this backup" disabled={busy} onClick={() => askDelete(b)}>
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
				title="Delete this backup?"
				confirmLabel="Delete it"
				color="error"
				onConfirm={() => remove(deleteTarget)}
				onClose={() => setDeleteOpen(false)}
			>
				{deleteTarget && `The backup from ${when(deleteTarget.createdAt)} is deleted. This can't be undone.`}
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
					onStarted={(restart) => toast(restart ? "Restoring. The server is being stopped, the backup put back, and the server started again; this page says when it is done." : "Restoring. This page says when it is done.", "info")}
				/>
			)}
			{showSettings && <BackupSettingsDialog base={base} data={data} onClose={() => setShowSettings(false)} onSaved={(next) => setData(next)} />}
		</Box>
	);
}

function RestoreDialog({ serverName, base, backup, running, players = 0, sharedFolders = [], onClose, onError, onStarted }) {
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
			<DialogTitle>{running ? `Restart ${serverName} and use this backup?` : `Use this backup for ${serverName}?`}</DialogTitle>
			<DialogContent>
				<Alert severity="warning" sx={{ mb: 2 }}>
					<strong>This erases everything newer than this backup.</strong> The server goes back to how it was on <strong>{when(backup.createdAt)}</strong>: anything done in the game since then (
					{labels.length > 0 ? labels.join(", ").toLowerCase() : "the world and settings"}) is replaced.
				</Alert>
				<DialogContentText sx={{ mb: 1 }}>
					{running ? "The panel will stop the server, put this backup back, and start it again." : "The server is stopped. The panel will put this backup back."}
					{running && players > 0 ? ` ${players} player${players === 1 ? " is" : "s are"} on it now and will be disconnected.` : ""}
				</DialogContentText>
				{backup.consistent === false && (
					<Alert severity="info" sx={{ mb: 1 }}>
						This backup was copied while the game was running, so it may be a few seconds behind and, rarely, not load. If it doesn't, use an older one.
					</Alert>
				)}
				{!running && (
					<Box>
						<TipRow id="server.backup.restore.start">
							<FormControlLabel control={<Checkbox checked={startAfter} onChange={(e) => setStartAfter(e.target.checked)} />} label="Start the server afterwards" />
						</TipRow>
					</Box>
				)}
				<Box>
					<TipRow id="server.backup.restore.safety">
						<FormControlLabel
							control={<Checkbox checked={safety} onChange={(e) => setSafety(e.target.checked)} />}
							label="Keep a safety backup of what's there now, so this can be undone (recommended)"
						/>
					</TipRow>
				</Box>
				{sharedFolders.length > 0 && (
					<Alert severity="warning" sx={{ mt: 2 }}>
						This server keeps its world in a folder every such server on this PC shares ({sharedFolders.join(", ")}). Restoring replaces <strong>their</strong> worlds too.
						<Box>
							<TipRow id="server.backup.restore.shared">
								<FormControlLabel control={<Checkbox checked={allowShared} onChange={(e) => setAllowShared(e.target.checked)} />} label="I understand, restore over the shared folder" />
							</TipRow>
						</Box>
					</Alert>
				)}
				{needsName && (
					<TextField fullWidth size="small" sx={{ mt: 2 }} label={`Without a safety backup, type ${serverName} to confirm`} value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={busy}>
					Cancel
				</Button>
				<Button color="warning" variant="contained" disabled={busy || (needsName && confirmName !== serverName) || (sharedFolders.length > 0 && !allowShared)} onClick={go}>
					{running ? "Restart and use this backup" : restart ? "Use it and start the server" : "Use this backup"}
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
		const chosen = await native()?.pickFolder?.({ title: "Choose a folder to back up", defaultPath: rows[index]?.path });
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
			<DialogTitle>Backup folders & rules</DialogTitle>
			<DialogContent>
				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}
				{data.source !== "none" || custom ? (
					<TipRow id="server.backup.paths">
						<FormControlLabel control={<Checkbox checked={useDefault} onChange={(e) => setUseDefault(e.target.checked)} />} label="Use this game's usual save folders" />
					</TipRow>
				) : (
					<Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
						The panel doesn't know where this game keeps its saves, so choose the folders.
						<InfoTip id="server.backup.paths" />
					</Typography>
				)}

				{!useDefault && (
					<Box sx={{ mt: 1 }}>
						{rows.map((row, i) => (
							<Box key={i} sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap", alignItems: "center" }}>
								<TextField size="small" label="Folder or file" value={row.path} onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, path: e.target.value } : x)))} sx={{ flex: "3 1 220px" }} />
								<TextField size="small" label="Label (optional)" value={row.label} onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} sx={{ flex: "1 1 140px" }} />
								{native()?.pickFolder && (
									<Button size="small" onClick={() => browse(i)}>
										Browse
									</Button>
								)}
								<IconButton size="small" aria-label="Remove this folder" onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>
									<DeleteIcon fontSize="small" />
								</IconButton>
							</Box>
						))}
						<Button size="small" startIcon={<AddIcon />} onClick={() => setRows((r) => [...r, { path: "", label: "" }])}>
							Add a folder
						</Button>
					</Box>
				)}

				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 3 }}>
					<TipRow id="server.backup.mode" sx={{ flex: "1 1 260px", maxWidth: 360 }}>
						<TextField select fullWidth size="small" label="While the server is running" value={mode} onChange={(e) => setMode(e.target.value)}>
							{Object.entries(MODE_LABELS).map(([value, label]) => (
								<MenuItem key={value} value={value}>
									{label}
								</MenuItem>
							))}
						</TextField>
					</TipRow>
					<TipRow id="server.backup.keepCount" sx={{ flex: "1 1 200px", maxWidth: 260 }}>
						<TextField fullWidth size="small" type="number" label="Scheduled backups to keep" value={keepCount} placeholder="panel default" onChange={(e) => setKeepCount(e.target.value)} />
					</TipRow>
					<TipRow id="server.backup.keepDays" sx={{ flex: "1 1 200px", maxWidth: 260 }}>
						<TextField fullWidth size="small" type="number" label="Delete older than (days)" value={keepDays} placeholder="panel default" onChange={(e) => setKeepDays(e.target.value)} />
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
					Cancel
				</Button>
				<Button variant="contained" onClick={save} disabled={busy}>
					Save
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export default BackupsPanel;
