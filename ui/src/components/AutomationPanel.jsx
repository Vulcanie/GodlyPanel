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
	Switch,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import {
	Autorenew as AutoIcon,
	Bookmarks as PresetIcon,
	Chat as MotdIcon,
	ContentCopy as CloneIcon,
	Delete as DeleteIcon,
	Key as KeyIcon,
	PlayArrow as ApplyIcon,
} from "@mui/icons-material";
import { api } from "../api/client";
import { onLive } from "../liveEvents";
import { formatBytes } from "../utils/format";
import { useToast } from "../ToastContext";
import SectionCard from "./ui/SectionCard";
import ConfirmDialog from "./ui/ConfirmDialog";
import InfoTip from "./InfoTip";
import TipRow from "./TipRow";

/** What a server does by itself, and how to reuse its settings: auto-restart, start with the panel, presets, cloning. */
function AutomationPanel({ serverName, serverStatus, onCloned }) {
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const [options, setOptions] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [minutes, setMinutes] = React.useState("10");
	// A reply that arrives after the person has moved to another server must not be shown on that server's page.
	const current = React.useRef(base);
	current.current = base;

	const load = React.useCallback(async () => {
		try {
			const data = await api.get(`${base}/options`);
			if (current.current === base) setOptions(data);
		} catch (e) {
			if (current.current === base) setError(e.message);
		}
	}, [base]);

	React.useEffect(() => {
		setOptions(null);
		setError(null);
		load();
		const off = onLive("activity", ({ event }) => event.server === serverName && /^server\./.test(event.type) && load());
		return off;
	}, [load, serverName]);

	const set = async (patch) => {
		try {
			const next = await api.put(`${base}/options`, patch);
			if (current.current === base) {
				setOptions(next);
				setError(null);
			}
		} catch (e) {
			setError(e.message);
		}
	};

	// The number is typed freely and saved when the field is left or Enter is pressed. Saving on every key press made it
	// impossible to clear the box to type a new number.
	const savedMinutes = options?.unresponsiveMinutes;
	React.useEffect(() => {
		if (savedMinutes !== undefined) setMinutes(String(savedMinutes));
	}, [savedMinutes]);
	const commitMinutes = () => {
		const m = Math.round(Number(minutes));
		if (minutes !== "" && m >= 1 && m <= 240) {
			if (m !== savedMinutes) set({ unresponsiveMinutes: m });
			else setMinutes(String(m));
		} else setMinutes(String(savedMinutes));
	};

	if (!options) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress size={24} />;

	const running = serverStatus?.online;
	const recovery = options.recovery ?? {};

	return (
		<Box>
			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}

			<SectionCard title="On its own" subtitle="What this server does without you" icon={<AutoIcon />}>
				<Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
					<TipRow id="server.auto.crash">
						<FormControlLabel control={<Switch checked={options.autoRestart} onChange={(e) => set({ autoRestart: e.target.checked })} />} label="Restart it if it crashes" />
					</TipRow>
					{recovery.gaveUp && (
						<Alert severity="error" sx={{ mb: 1 }}>
							The panel gave up restarting this server because it keeps going down. Check its log, then start it yourself to try again.
						</Alert>
					)}
					{recovery.unresponsive && (
						<Alert severity="warning" sx={{ mb: 1 }}>
							It is running but has stopped answering.{options.restartWhenUnresponsive ? " It will be restarted if that goes on." : " It was left alone in case it is saving."}
						</Alert>
					)}
					<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
						<TipRow id="server.auto.hang">
							<FormControlLabel
								control={<Switch checked={options.restartWhenUnresponsive} disabled={!options.autoRestart} onChange={(e) => set({ restartWhenUnresponsive: e.target.checked })} />}
								label="Also restart it if it is running but stops answering"
							/>
						</TipRow>
						<TipRow id="server.auto.hangMinutes">
							<TextField
								size="small"
								type="number"
								label="After (minutes)"
								sx={{ width: 140 }}
								disabled={!options.autoRestart || !options.restartWhenUnresponsive}
								value={minutes}
								inputProps={{ min: 1, max: 240 }}
								onChange={(e) => setMinutes(e.target.value)}
								onBlur={commitMinutes}
								onKeyDown={(e) => e.key === "Enter" && commitMinutes()}
							/>
						</TipRow>
					</Box>
					<TipRow id="server.auto.start">
						<FormControlLabel control={<Switch checked={options.autoStart} onChange={(e) => set({ autoStart: e.target.checked })} />} label="Start it when GodlyPanel starts" />
					</TipRow>
				</Box>
			</SectionCard>

			<MotdCard base={base} running={running} />
			<PresetsCard serverName={serverName} base={base} running={running} onError={setError} />
			<CloneCard serverName={serverName} base={base} running={running} onCloned={onCloned} onError={setError} />
			<RconPasswordCard serverName={serverName} base={base} running={running} />
		</Box>
	);
}

/** Replace the RCON password everywhere the game and the panel keep it. Shown only where there is one. */
function RconPasswordCard({ serverName, base, running }) {
	const toast = useToast();
	const [plan, setPlan] = React.useState(undefined); // undefined: loading, null: nothing to rotate
	const [busy, setBusy] = React.useState(false);
	const [confirming, setConfirming] = React.useState(false);
	const [result, setResult] = React.useState(null);
	const [error, setError] = React.useState(null);

	React.useEffect(() => {
		let live = true;
		setPlan(undefined);
		setResult(null);
		setError(null);
		setConfirming(false);
		api
			.get(`${base}/rcon-password/rotation`)
			.then((p) => live && setPlan(p))
			.catch(() => live && setPlan(null));
		return () => {
			live = false;
		};
	}, [base]);

	if (!plan) return null;
	const servers = plan.servers ?? [];
	const files = plan.files ?? [];
	const others = servers.filter((s) => s !== serverName);

	const rotate = async () => {
		setBusy(true);
		setError(null);
		try {
			const r = await api.post(`${base}/rcon-password/rotate`, { confirm: true });
			setConfirming(false);
			if ((r.remaining ?? []).length > 0) setResult(r);
			else {
				setResult(null);
				toast(`The RCON password is changed for ${(r.servers ?? [serverName]).join(", ")}.`);
			}
		} catch (e) {
			setConfirming(false);
			setError(e.message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<SectionCard
			title={
				<>
					Change the RCON password
					<InfoTip id="server.rcon.rotate" />
				</>
			}
			icon={<KeyIcon />}
		>
			{others.length > 0 && (
				<Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
					{others.join(", ")} share{others.length === 1 ? "s" : ""} files with it, so {others.length === 1 ? "that server changes" : "those servers change"} too.
				</Typography>
			)}
			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1.5 }}>
					{error}
				</Alert>
			)}
			{result && (
				<Alert severity="warning" onClose={() => setResult(null)} sx={{ mb: 1.5 }}>
					Changed for {(result.servers ?? []).join(", ")}. The old password is still written in {result.remaining.length} other file(s) the panel doesn't manage: {result.remaining.join(", ")}.
				</Alert>
			)}
			<Button variant="outlined" disabled={running || busy} onClick={() => setConfirming(true)}>
				Change the RCON password
			</Button>
			{running && (
				<Typography variant="caption" sx={{ display: "block", color: "warning.main", mt: 0.5 }}>
					Stop the server first.
				</Typography>
			)}
			<ConfirmDialog open={confirming} title="Change the RCON password?" confirmLabel={busy ? "Changing…" : "Change it"} onConfirm={rotate} onClose={() => !busy && setConfirming(false)}>
				{files.length} file(s) will be rewritten{others.length > 0 ? ` for ${servers.length} servers` : ""}. Anything else that uses the old password (another tool, a script) will need the new one.
			</ConfirmDialog>
		</SectionCard>
	);
}

/** The message players see in the server list or when they join, for the games that have one. */
function MotdCard({ base, running }) {
	const toast = useToast();
	const [info, setInfo] = React.useState(null);
	const [value, setValue] = React.useState("");
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState(null);

	React.useEffect(() => {
		let live = true;
		setInfo(null);
		setError(null);
		api
			.get(`${base}/motd`)
			.then((r) => {
				if (!live) return;
				setInfo(r);
				setValue(r.value ?? "");
			})
			.catch((e) => live && setError(e.message));
		return () => {
			live = false;
		};
	}, [base]);

	if (!info?.supported) {
		// A failed read is worth saying; a game with no message of the day is not.
		return error ? (
			<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
				{error}
			</Alert>
		) : null;
	}

	const save = async () => {
		setBusy(true);
		setError(null);
		try {
			const r = await api.put(`${base}/motd`, { value });
			setInfo(r);
			setValue(r.value ?? "");
			toast("Saved. It is in the settings history, so it can be undone.");
		} catch (e) {
			setError(e.message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<SectionCard
			title={
				<>
					{info.label}
					<InfoTip id="server.motd" />
				</>
			}
			icon={<MotdIcon />}
		>
			{error && (
				<Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}
			{!info.available ? (
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					{info.reason}
				</Typography>
			) : (
				<Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", flexWrap: "wrap" }}>
					<TextField
						size="small"
						fullWidth
						multiline
						minRows={2}
						value={value}
						onChange={(e) => setValue(e.target.value)}
						disabled={running || busy}
						inputProps={{ "aria-label": info.label }}
						sx={{ flex: "1 1 260px" }}
					/>
					<Button variant="outlined" disabled={running || busy || value === (info.value ?? "")} onClick={save}>
						Save
					</Button>
				</Box>
			)}
			{running && (
				<Typography variant="caption" sx={{ color: "warning.main", display: "block", mt: 0.5 }}>
					Stop the server to change it: a running game writes its settings back when it stops.
				</Typography>
			)}
		</SectionCard>
	);
}

function PresetsCard({ serverName, base, running, onError }) {
	const toast = useToast();
	const [presets, setPresets] = React.useState([]);
	const [name, setName] = React.useState("");
	const [keepIdentity, setKeepIdentity] = React.useState(true);
	// What is being asked about stays set after the dialog closes, so its text does not blank out while it fades away.
	const [confirm, setConfirm] = React.useState(null); // { kind: "apply" | "delete", preset }
	const [asking, setAsking] = React.useState(false);

	const load = React.useCallback(
		() =>
			api
				.get("/api/presets")
				.then((list) => setPresets(Array.isArray(list) ? list : []))
				.catch((e) => onError(e.message)),
		[onError],
	);
	React.useEffect(() => {
		load();
	}, [load]);

	const ask = (kind, preset) => {
		setConfirm({ kind, preset });
		setAsking(true);
	};

	const save = async () => {
		try {
			const made = await api.post(`${base}/presets`, { name });
			setName("");
			toast(`Saved this server's settings as "${made.name}".`);
			load();
		} catch (e) {
			onError(e.message);
		}
	};

	const apply = async (p) => {
		setAsking(false);
		try {
			const r = await api.post(`${base}/presets/${p.id}/apply`, { keepIdentity });
			toast(`Applied "${p.name}" (${(r.files ?? []).join(", ")}). Start the server for it to take effect.`);
		} catch (e) {
			onError(e.message);
		}
	};

	const remove = async (p) => {
		setAsking(false);
		try {
			await api.del(`/api/presets/${p.id}`);
			toast(`Deleted the preset "${p.name}".`);
			load();
		} catch (e) {
			onError(e.message);
		}
	};

	return (
		<SectionCard title="Setting presets" subtitle="Save this server's settings and reuse them on other servers of the same game" icon={<PresetIcon />}>
			<Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", mb: presets.length > 0 ? 2 : 0 }}>
				<TipRow id="server.preset.name" sx={{ flex: "1 1 260px", maxWidth: 420 }}>
					<TextField size="small" fullWidth label="Name for these settings" value={name} onChange={(e) => setName(e.target.value)} />
				</TipRow>
				<Button variant="outlined" disabled={!name.trim()} onClick={save}>
					Save this server's settings
				</Button>
			</Box>
			{presets.length > 0 && (
				<>
					<TipRow id="server.preset.keepIdentity">
						<FormControlLabel
							control={<Checkbox size="small" checked={keepIdentity} onChange={(e) => setKeepIdentity(e.target.checked)} />}
							label="Keep this server's own name, passwords and ports when applying"
						/>
					</TipRow>
					{presets.map((p) => (
						<Box key={p.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.75, borderTop: 1, borderColor: "divider" }}>
							<Box sx={{ flex: 1, minWidth: 0 }}>
								<Typography variant="body2">{p.name}</Typography>
								<Typography variant="caption" sx={{ color: "text.secondary", wordBreak: "break-word" }}>
									{p.game} · from {p.fromServer} · {Object.keys(p.files ?? {}).join(", ")}
								</Typography>
							</Box>
							<Tooltip title={running ? "Stop the server first" : "Apply to this server"}>
								<span>
									<IconButton size="small" aria-label={`Apply ${p.name}`} disabled={running} onClick={() => ask("apply", p)}>
										<ApplyIcon fontSize="small" />
									</IconButton>
								</span>
							</Tooltip>
							<Tooltip title="Delete the preset">
								<IconButton size="small" aria-label={`Delete ${p.name}`} onClick={() => ask("delete", p)}>
									<DeleteIcon fontSize="small" />
								</IconButton>
							</Tooltip>
						</Box>
					))}
				</>
			)}
			<ConfirmDialog
				open={asking && Boolean(confirm)}
				title={confirm?.kind === "delete" ? "Delete this preset?" : `Apply "${confirm?.preset.name}"?`}
				confirmLabel={confirm?.kind === "delete" ? "Delete it" : "Apply it"}
				color={confirm?.kind === "delete" ? "error" : "warning"}
				onConfirm={() => (confirm.kind === "delete" ? remove(confirm.preset) : apply(confirm.preset))}
				onClose={() => setAsking(false)}
			>
				{confirm?.kind === "delete"
					? `The preset "${confirm.preset.name}" is deleted. Servers that already use it are not changed.`
					: `Apply "${confirm?.preset.name}" to ${serverName}? Its settings files are replaced (a .bak of each is kept).`}
			</ConfirmDialog>
		</SectionCard>
	);
}

function CloneCard({ serverName, base, running, onCloned, onError }) {
	const [name, setName] = React.useState("");
	const [sessionName, setSessionName] = React.useState("");
	const [job, setJob] = React.useState(null);

	// Another server's page starts with a blank form.
	React.useEffect(() => {
		setName("");
		setSessionName("");
		setJob(null);
	}, [serverName]);

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
		<SectionCard title="Clone this server" subtitle="A full copy, world included" icon={<CloneIcon />}>
			<Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
				<TipRow id="server.clone.name" sx={{ flex: "1 1 240px", maxWidth: 360 }}>
					<TextField size="small" fullWidth label="Name for the copy" value={name} onChange={(e) => setName(e.target.value)} disabled={copying} />
				</TipRow>
				<TipRow id="server.clone.session" sx={{ flex: "1 1 240px", maxWidth: 360 }}>
					<TextField size="small" fullWidth label="Session name (optional)" value={sessionName} onChange={(e) => setSessionName(e.target.value)} disabled={copying} />
				</TipRow>
				<Button variant="outlined" disabled={copying || !name.trim() || running} onClick={start}>
					Clone {serverName}
				</Button>
			</Box>
			{running && (
				<Typography variant="caption" sx={{ color: "warning.main", display: "block", mt: 0.5 }}>
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
							{job.name} is ready. Its ports are {Object.values(job.ports ?? {}).join(", ")}; open them on your router to let people join.
						</Alert>
					)}
					{job.status === "failed" && <Alert severity="error">{job.error}</Alert>}
				</Box>
			)}
		</SectionCard>
	);
}

export default AutomationPanel;
