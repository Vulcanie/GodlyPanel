import React from "react";
import {
	Alert,
	Box,
	Button,
	Checkbox,
	CircularProgress,
	FormControlLabel,
	IconButton,
	LinearProgress,
	Paper,
	Switch,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Delete as DeleteIcon, PlayArrow as ApplyIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { onLive } from "../liveEvents";
import { formatBytes } from "../utils/format";

/** What a server does by itself, and how to reuse its settings: auto-restart, start with the panel, presets, cloning. */
function AutomationPanel({ serverName, serverStatus, onCloned }) {
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const [options, setOptions] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [notice, setNotice] = React.useState(null);

	const load = React.useCallback(async () => {
		try {
			setOptions(await api.get(`${base}/options`));
		} catch (e) {
			setError(e.message);
		}
	}, [base]);

	React.useEffect(() => {
		load();
		const off = onLive("activity", ({ event }) => event.server === serverName && /^server\./.test(event.type) && load());
		return off;
	}, [load, serverName]);

	const set = async (patch) => {
		try {
			setOptions(await api.put(`${base}/options`, patch));
			setError(null);
		} catch (e) {
			setError(e.message);
		}
	};

	if (!options) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress size={24} />;

	return (
		<Box>
			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}
			{notice && (
				<Alert severity="success" onClose={() => setNotice(null)} sx={{ mb: 2 }}>
					{notice}
				</Alert>
			)}

			<Paper sx={{ p: 2, mb: 2 }}>
				<Typography variant="subtitle1">On its own</Typography>
				<FormControlLabel
					sx={{ display: "block", mt: 1 }}
					control={<Switch checked={options.autoRestart} onChange={(e) => set({ autoRestart: e.target.checked })} />}
					label="Restart it if it crashes"
				/>
				<Typography variant="caption" sx={{ display: "block", ml: 6, mb: 1, color: "text.secondary" }}>
					Only when it goes down without you stopping it. After a few restarts in a short time the panel stops and tells you, rather than looping. Times are in Settings → Crash recovery.
				</Typography>
				{options.recovery.gaveUp && (
					<Alert severity="error" sx={{ ml: 6, mb: 1 }}>
						The panel gave up restarting this server because it keeps going down. Check its log, then start it yourself to try again.
					</Alert>
				)}
				{options.recovery.unresponsive && (
					<Alert severity="warning" sx={{ ml: 6, mb: 1 }}>
						It is running but has stopped answering. It was left alone in case it is saving.
					</Alert>
				)}
				<FormControlLabel
					sx={{ display: "block" }}
					control={<Switch checked={options.autoStart} onChange={(e) => set({ autoStart: e.target.checked })} />}
					label="Start it when GodlyPanel starts"
				/>
				<Typography variant="caption" sx={{ display: "block", ml: 6, color: "text.secondary" }}>
					With "Start GodlyPanel when I sign in to Windows" (Settings), this brings the server up when the PC does.
				</Typography>
			</Paper>

			<PresetsCard serverName={serverName} base={base} running={serverStatus?.online} onNotice={setNotice} onError={setError} />
			<CloneCard serverName={serverName} base={base} running={serverStatus?.online} onCloned={onCloned} onError={setError} />
		</Box>
	);
}

function PresetsCard({ serverName, base, running, onNotice, onError }) {
	const [presets, setPresets] = React.useState([]);
	const [name, setName] = React.useState("");
	const [keepIdentity, setKeepIdentity] = React.useState(true);

	const load = React.useCallback(() => api.get("/api/presets").then(setPresets).catch((e) => onError(e.message)), [onError]);
	React.useEffect(() => {
		load();
	}, [load]);

	const save = async () => {
		try {
			const made = await api.post(`${base}/presets`, { name });
			setName("");
			onNotice(`Saved this server's settings as "${made.name}".`);
			load();
		} catch (e) {
			onError(e.message);
		}
	};

	const apply = async (p) => {
		if (!window.confirm(`Apply "${p.name}" to ${serverName}? Its settings files are replaced (a .bak of each is kept).`)) return;
		try {
			const r = await api.post(`${base}/presets/${p.id}/apply`, { keepIdentity });
			onNotice(`Applied "${p.name}" (${r.files.join(", ")}). Start the server for it to take effect.`);
		} catch (e) {
			onError(e.message);
		}
	};

	return (
		<Paper sx={{ p: 2, mb: 2 }}>
			<Typography variant="subtitle1">Setting presets</Typography>
			<Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
				Save this server's settings under a name ("PvE", "hardcore", "event weekend") and apply them to any server of the same game.
			</Typography>
			<Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
				<TextField size="small" label="Name for these settings" value={name} onChange={(e) => setName(e.target.value)} sx={{ minWidth: 260 }} />
				<Button variant="outlined" disabled={!name.trim()} onClick={save}>
					Save this server's settings
				</Button>
			</Box>
			{presets.length > 0 && (
				<>
					<FormControlLabel
						control={<Checkbox size="small" checked={keepIdentity} onChange={(e) => setKeepIdentity(e.target.checked)} />}
						label="Keep this server's own name, passwords and ports when applying"
					/>
					{presets.map((p) => (
						<Box key={p.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.75, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
							<Box sx={{ flex: 1 }}>
								<Typography variant="body2">{p.name}</Typography>
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									{p.game} · from {p.fromServer} · {Object.keys(p.files).join(", ")}
								</Typography>
							</Box>
							<Tooltip title={running ? "Stop the server first" : "Apply to this server"}>
								<span>
									<IconButton size="small" disabled={running} onClick={() => apply(p)}>
										<ApplyIcon fontSize="small" />
									</IconButton>
								</span>
							</Tooltip>
							<Tooltip title="Delete the preset">
								<IconButton size="small" onClick={() => window.confirm(`Delete the preset "${p.name}"?`) && api.del(`/api/presets/${p.id}`).then(load)}>
									<DeleteIcon fontSize="small" />
								</IconButton>
							</Tooltip>
						</Box>
					))}
				</>
			)}
		</Paper>
	);
}

function CloneCard({ serverName, base, running, onCloned, onError }) {
	const [name, setName] = React.useState("");
	const [sessionName, setSessionName] = React.useState("");
	const [job, setJob] = React.useState(null);

	React.useEffect(() => {
		if (!job || ["done", "failed"].includes(job.status)) return undefined;
		const poll = async () => {
			try {
				setJob(await api.get(`/api/clone-jobs/${job.id}`));
			} catch {
				// Try again next beat.
			}
		};
		const off = onLive("clone_progress", (e) => e.jobId === job.id && setJob((j) => ({ ...j, ...e })));
		const timer = setInterval(poll, 3000);
		return () => {
			off();
			clearInterval(timer);
		};
	}, [job]);

	const start = async () => {
		try {
			setJob(await api.post(`${base}/clone`, { name: name.trim(), ...(sessionName.trim() ? { sessionName: sessionName.trim() } : {}) }));
		} catch (e) {
			onError(e.message);
		}
	};

	const copying = job && !["done", "failed"].includes(job.status);

	return (
		<Paper sx={{ p: 2 }}>
			<Typography variant="subtitle1">Clone this server</Typography>
			<Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
				Makes a full copy, world included, with its own name, ports and RCON password. Only for servers the panel created. The server must be stopped, and the copy uses as much disk as the original.
			</Typography>
			<Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
				<TextField size="small" label="Name for the copy" value={name} onChange={(e) => setName(e.target.value)} disabled={copying} sx={{ minWidth: 240 }} />
				<TextField size="small" label="Session name (optional)" value={sessionName} onChange={(e) => setSessionName(e.target.value)} disabled={copying} sx={{ minWidth: 240 }} />
				<Button variant="outlined" disabled={copying || !name.trim() || running} onClick={start}>
					Clone {serverName}
				</Button>
			</Box>
			{running && (
				<Typography variant="caption" sx={{ color: "warning.main" }}>
					Stop the server first.
				</Typography>
			)}
			{job && (
				<Box sx={{ mt: 2 }}>
					{copying && (
						<>
							<Typography variant="body2">{job.status === "copying" ? `Copying ${formatBytes(job.bytes)}…` : "Setting up the copy…"}</Typography>
							<LinearProgress sx={{ mt: 1 }} />
						</>
					)}
					{job.status === "done" && (
						<Alert severity="success" action={<Button color="inherit" size="small" onClick={() => onCloned?.(job.name)}>Open it</Button>}>
							{job.name} is ready. Its ports are {Object.values(job.ports).join(", ")}; open them on your router to let people join.
						</Alert>
					)}
					{job.status === "failed" && <Alert severity="error">{job.error}</Alert>}
				</Box>
			)}
		</Paper>
	);
}

export default AutomationPanel;
