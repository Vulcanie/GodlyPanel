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
	Paper,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import {
	Add as AddIcon,
	Delete as DeleteIcon,
	FolderOpen as FolderOpenIcon,
	Restore as RestoreIcon,
	Settings as SettingsIcon,
} from "@mui/icons-material";
import { api } from "../api/client";
import { onLive } from "../liveEvents";
import { formatBytes } from "../utils/format";
import { useOperation, operationLabel } from "../OperationsContext";

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
	const [data, setData] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [notice, setNotice] = React.useState(null);
	const [phase, setPhase] = React.useState(null);
	const [mode, setMode] = React.useState("default");
	const [restoreTarget, setRestoreTarget] = React.useState(null);
	const [showSettings, setShowSettings] = React.useState(false);
	const operation = useOperation(serverName);

	const load = React.useCallback(async () => {
		try {
			setData(await api.get(`${base}/backups`));
			setError(null);
		} catch (e) {
			setError(e.message);
		}
	}, [base]);

	React.useEffect(() => {
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
				if (e.event.type === "backup.failed" || e.event.type === "backup.restore_failed") setError(e.event.message);
			}
		});
		return () => {
			offProgress();
			offActivity();
		};
	}, [serverName, load]);

	const busy = Boolean(operation);

	const backUp = async () => {
		setError(null);
		setNotice(null);
		try {
			await api.post(`${base}/backups`, mode === "default" ? {} : { mode });
			setNotice("Backup started. It is listed below when it finishes.");
		} catch (e) {
			setError(e.message);
		}
	};

	const remove = async (b) => {
		if (!window.confirm(`Delete the backup from ${when(b.createdAt)}? This can't be undone.`)) return;
		try {
			await api.del(`${base}/backups/${encodeURIComponent(b.id)}`);
			load();
		} catch (e) {
			setError(e.message);
		}
	};

	if (!data) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress size={24} />;

	const running = serverStatus?.online;
	const missing = data.specs.filter((s) => !s.exists);

	return (
		<Box>
			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}
			{notice && (
				<Alert severity="info" onClose={() => setNotice(null)} sx={{ mb: 2 }}>
					{notice}
				</Alert>
			)}

			<Paper sx={{ p: 2, mb: 2 }}>
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
					<Box sx={{ flex: 1, minWidth: 240 }}>
						<Typography variant="subtitle1">What is backed up</Typography>
						{data.needsSetup ? (
							<Typography variant="body2" sx={{ color: "warning.main" }}>
								Nothing is set up for this game yet.{canManage ? " Choose the folders that hold its world and settings." : " Ask an administrator to choose the folders."}
							</Typography>
						) : (
							<Box sx={{ mt: 0.5 }}>
								{data.specs.map((s) => (
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
					</Box>
					{canManage && (
						<Button startIcon={<SettingsIcon />} variant="outlined" size="small" onClick={() => setShowSettings(true)}>
							Choose folders & rules
						</Button>
					)}
				</Box>
			</Paper>

			<Paper sx={{ p: 2, mb: 2 }}>
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
					<Button variant="contained" startIcon={<AddIcon />} disabled={busy || data.needsSetup} onClick={backUp}>
						{operation === "backing up" ? "Backing up…" : "Back up now"}
					</Button>
					<TextField select size="small" label="While it's running" value={mode} onChange={(e) => setMode(e.target.value)} sx={{ minWidth: 260 }}>
						<MenuItem value="default">{`Use the server's setting (${MODE_LABELS[data.mode] ?? data.mode})`}</MenuItem>
						<MenuItem value="stop">Stop it for the copy, then start it again</MenuItem>
						<MenuItem value="live">Keep it running (may be inconsistent)</MenuItem>
					</TextField>
					{(phase || (busy && operation !== "backing up")) && (
						<Chip size="small" color="info" label={phase ? PHASES[phase] ?? phase : operationLabel(operation)} icon={<CircularProgress size={12} />} />
					)}
				</Box>
				<Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
					{data.effectiveMode === "stop" && running
						? "This game can't be saved on command, so a backup stops the server for a minute and starts it again."
						: data.canSaveOnCommand
							? "The panel tells the game to save, then copies its files while it keeps running."
							: "Stored in " + data.directory}
					{data.freeBytes != null ? ` · ${formatBytes(data.freeBytes)} free on that drive` : ""}
				</Typography>
			</Paper>

			<Paper>
				<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, pt: 2 }}>
					<Typography variant="subtitle1">
						Backups ({data.backups.length}){data.totalBytes ? ` · ${formatBytes(data.totalBytes)}` : ""}
					</Typography>
					{native()?.openFolder && (
						<Button size="small" startIcon={<FolderOpenIcon />} onClick={() => native().openFolder(data.directory)}>
							Open folder
						</Button>
					)}
				</Box>
				{data.backups.length === 0 ? (
					<Typography variant="body2" sx={{ p: 2, color: "text.secondary" }}>
						No backups yet.
					</Typography>
				) : (
					data.backups.map((b) => (
						<Box key={b.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.25, borderTop: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap" }}>
							<Box sx={{ flex: 1, minWidth: 200 }}>
								<Typography variant="body2">{when(b.createdAt)}</Typography>
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									{formatBytes(b.sizeBytes)}
									{b.reason ? ` · ${b.reason}` : ""}
									{b.consistent === false ? " · copied while running" : ""}
								</Typography>
							</Box>
							<Chip size="small" label={KIND_LABELS[b.kind] ?? b.kind} color={b.kind === "manual" ? "primary" : "default"} variant={b.kind === "manual" ? "filled" : "outlined"} />
							{canManage && (
								<>
									<Tooltip title={running ? "Stop the server to restore" : "Restore this backup"}>
										<span>
											<IconButton size="small" disabled={busy || running} onClick={() => setRestoreTarget(b)}>
												<RestoreIcon fontSize="small" />
											</IconButton>
										</span>
									</Tooltip>
									<Tooltip title="Delete this backup">
										<span>
											<IconButton size="small" disabled={busy} onClick={() => remove(b)}>
												<DeleteIcon fontSize="small" />
											</IconButton>
										</span>
									</Tooltip>
								</>
							)}
						</Box>
					))
				)}
			</Paper>

			{restoreTarget && <RestoreDialog serverName={serverName} base={base} backup={restoreTarget} sharedFolders={data.specs.filter((s) => s.shared).map((s) => s.path)} onClose={() => setRestoreTarget(null)} onError={setError} onStarted={() => setNotice("Restore started.")} />}
			{showSettings && <BackupSettingsDialog base={base} data={data} onClose={() => setShowSettings(false)} onSaved={(next) => setData(next)} />}
		</Box>
	);
}

function RestoreDialog({ serverName, base, backup, sharedFolders = [], onClose, onError, onStarted }) {
	const [confirmName, setConfirmName] = React.useState("");
	const [allowShared, setAllowShared] = React.useState(false);
	const [safety, setSafety] = React.useState(true);
	const [busy, setBusy] = React.useState(false);

	const go = async () => {
		setBusy(true);
		try {
			await api.post(`${base}/backups/${encodeURIComponent(backup.id)}/restore`, { confirmName, safety, allowShared });
			onStarted();
			onClose();
		} catch (e) {
			onError(e.message);
			onClose();
		}
	};

	return (
		<Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
			<DialogTitle>Restore {serverName}?</DialogTitle>
			<DialogContent>
				<DialogContentText sx={{ mb: 2 }}>
					This replaces the world and settings on disk with the backup from <strong>{when(backup.createdAt)}</strong>. Anything done since then is lost, unless you keep the safety backup below.
				</DialogContentText>
				<FormControlLabel control={<Checkbox checked={safety} onChange={(e) => setSafety(e.target.checked)} />} label="Back up what is there now first (recommended)" />
				{sharedFolders.length > 0 && (
					<Alert severity="warning" sx={{ mt: 2 }}>
						This server keeps its world in a folder every such server on this PC shares ({sharedFolders.join(", ")}). Restoring replaces <strong>their</strong> worlds too.
						<FormControlLabel control={<Checkbox checked={allowShared} onChange={(e) => setAllowShared(e.target.checked)} />} label="I understand, restore over the shared folder" />
					</Alert>
				)}
				<TextField fullWidth size="small" sx={{ mt: 2 }} label={`Type ${serverName} to confirm`} value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={busy}>
					Cancel
				</Button>
				<Button color="warning" variant="contained" disabled={busy || confirmName !== serverName || (sharedFolders.length > 0 && !allowShared)} onClick={go}>
					Restore
				</Button>
			</DialogActions>
		</Dialog>
	);
}

function BackupSettingsDialog({ base, data, onClose, onSaved }) {
	const custom = data.source === "custom";
	const [useDefault, setUseDefault] = React.useState(!custom && data.source !== "none");
	const [rows, setRows] = React.useState(() => data.specs.map((s) => ({ path: s.path, label: s.label ?? "" })));
	const [mode, setMode] = React.useState(data.mode ?? "auto");
	const [keepCount, setKeepCount] = React.useState(data.keepCount ?? "");
	const [keepDays, setKeepDays] = React.useState(data.keepDays ?? "");
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
			const body = {
				paths: useDefault ? null : rows.filter((r) => r.path.trim()).map((r) => ({ path: r.path.trim(), ...(r.label.trim() ? { label: r.label.trim() } : {}) })),
				mode,
				keepCount: toNumber(keepCount),
				keepDays: toNumber(keepDays),
			};
			onSaved(await api.put(`${base}/backups/settings`, body));
			onClose();
		} catch (e) {
			setError(e.message);
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
					<FormControlLabel control={<Checkbox checked={useDefault} onChange={(e) => setUseDefault(e.target.checked)} />} label="Use this game's usual save folders" />
				) : (
					<Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
						The panel doesn't know where this game keeps its saves, so choose the folders.
					</Typography>
				)}

				{!useDefault && (
					<Box sx={{ mt: 1 }}>
						{rows.map((row, i) => (
							<Box key={i} sx={{ display: "flex", gap: 1, mb: 1 }}>
								<TextField size="small" fullWidth label="Folder or file" value={row.path} onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, path: e.target.value } : x)))} />
								<TextField size="small" sx={{ width: 200 }} label="Label (optional)" value={row.label} onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
								{native()?.pickFolder && (
									<Button size="small" onClick={() => browse(i)}>
										Browse
									</Button>
								)}
								<IconButton size="small" onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>
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
					<TextField select size="small" label="While the server is running" value={mode} onChange={(e) => setMode(e.target.value)} sx={{ minWidth: 280 }}>
						{Object.entries(MODE_LABELS).map(([value, label]) => (
							<MenuItem key={value} value={value}>
								{label}
							</MenuItem>
						))}
					</TextField>
					<TextField size="small" type="number" label="Scheduled backups to keep" value={keepCount} placeholder="panel default" onChange={(e) => setKeepCount(e.target.value)} sx={{ width: 220 }} helperText="Blank uses the Settings value" />
					<TextField size="small" type="number" label="Delete older than (days)" value={keepDays} placeholder="panel default" onChange={(e) => setKeepDays(e.target.value)} sx={{ width: 220 }} helperText="0 = never by age" />
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
