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
import { t, useT } from "../i18n";
import SectionCard from "./ui/SectionCard";
import ConfirmDialog from "./ui/ConfirmDialog";
import InfoTip from "./InfoTip";
import TipRow from "./TipRow";

/** What a server does by itself, and how to reuse its settings: auto-restart, start with the panel, presets, cloning. */
function AutomationPanel({ serverName, serverStatus, onCloned }) {
	useT();
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

			<SectionCard title={t("automation.onItsOwn")} subtitle={t("automation.onItsOwnSub")} icon={<AutoIcon />}>
				<Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
					<TipRow id="server.auto.crash">
						<FormControlLabel control={<Switch checked={options.autoRestart} onChange={(e) => set({ autoRestart: e.target.checked })} />} label={t("automation.restartCrash")} />
					</TipRow>
					{recovery.gaveUp && (
						<Alert severity="error" sx={{ mb: 1 }}>
							{t("automation.gaveUp")}
						</Alert>
					)}
					{recovery.unresponsive && (
						<Alert severity="warning" sx={{ mb: 1 }}>
							{options.restartWhenUnresponsive ? t("automation.unresponsiveRestart") : t("automation.unresponsiveWait")}
						</Alert>
					)}
					<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
						<TipRow id="server.auto.hang">
							<FormControlLabel
								control={<Switch checked={options.restartWhenUnresponsive} disabled={!options.autoRestart} onChange={(e) => set({ restartWhenUnresponsive: e.target.checked })} />}
								label={t("automation.restartHang")}
							/>
						</TipRow>
						<TipRow id="server.auto.hangMinutes">
							<TextField
								size="small"
								type="number"
								label={t("automation.afterMinutes")}
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
						<FormControlLabel control={<Switch checked={options.autoStart} onChange={(e) => set({ autoStart: e.target.checked })} />} label={t("automation.startWithPanel")} />
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
	useT();
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
				toast(t("automation.rconToast", { servers: (r.servers ?? [serverName]).join(", ") }));
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
					{t("automation.rconTitle")}
<InfoTip id="server.rcon.rotate" />
				</>
			}
			icon={<KeyIcon />}
		>
			{others.length > 0 && (
				<Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
					{others.length === 1 ? t("automation.sharesOne", { servers: others.join(", ") }) : t("automation.sharesMany", { servers: others.join(", ") })}
				</Typography>
			)}
			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1.5 }}>
					{error}
				</Alert>
			)}
			{result && (
				<Alert severity="warning" onClose={() => setResult(null)} sx={{ mb: 1.5 }}>
					{t("automation.rconChanged", { servers: (result.servers ?? []).join(", "), count: result.remaining.length, files: result.remaining.join(", ") })}
				</Alert>
			)}
			<Button variant="outlined" disabled={running || busy} onClick={() => setConfirming(true)}>
				{t("automation.rconTitle")}
</Button>
			{running && (
				<Typography variant="caption" sx={{ display: "block", color: "warning.main", mt: 0.5 }}>
{t("automation.stopFirstDot")}
				</Typography>
			)}
			<ConfirmDialog open={confirming} title={t("automation.rconConfirmTitle")} confirmLabel={busy ? t("automation.changing") : t("automation.changeIt")} onConfirm={rotate} onClose={() => !busy && setConfirming(false)}>
				{others.length > 0 ? t("automation.rconBodyServers", { files: files.length, servers: servers.length }) : t("automation.rconBody", { files: files.length })}
			</ConfirmDialog>
		</SectionCard>
	);
}

/** The message players see in the server list or when they join, for the games that have one. */
function MotdCard({ base, running }) {
	useT();
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
			toast(t("automation.motdSaved"));
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
						{t("common.save")}
</Button>
</Box>
			)}
			{running && (
				<Typography variant="caption" sx={{ color: "warning.main", display: "block", mt: 0.5 }}>
					{t("automation.motdStop")}
				</Typography>
			)}
		</SectionCard>
	);
}

function PresetsCard({ serverName, base, running, onError }) {
	useT();
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
			toast(t("automation.presetSaved", { name: made.name }));
			load();
		} catch (e) {
			onError(e.message);
		}
	};

	const apply = async (p) => {
		setAsking(false);
		try {
			const r = await api.post(`${base}/presets/${p.id}/apply`, { keepIdentity });
			toast(t("automation.presetApplied", { name: p.name, files: (r.files ?? []).join(", ") }));
		} catch (e) {
			onError(e.message);
		}
	};

	const remove = async (p) => {
		setAsking(false);
		try {
			await api.del(`/api/presets/${p.id}`);
			toast(t("automation.presetDeleted", { name: p.name }));
			load();
		} catch (e) {
			onError(e.message);
		}
	};

	return (
		<SectionCard title={t("automation.presets")} subtitle={t("automation.presetsSub")} icon={<PresetIcon />}>
			<Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", mb: presets.length > 0 ? 2 : 0 }}>
				<TipRow id="server.preset.name" sx={{ flex: "1 1 260px", maxWidth: 420 }}>
					<TextField size="small" fullWidth label={t("automation.presetName")} value={name} onChange={(e) => setName(e.target.value)} />
				</TipRow>
				<Button variant="outlined" disabled={!name.trim()} onClick={save}>
					{t("automation.savePreset")}
</Button>
			</Box>
			{presets.length > 0 && (
				<>
					<TipRow id="server.preset.keepIdentity">
						<FormControlLabel
							control={<Checkbox size="small" checked={keepIdentity} onChange={(e) => setKeepIdentity(e.target.checked)} />}
							label={t("automation.keepIdentity")}
						/>
					</TipRow>
					{presets.map((p) => (
						<Box key={p.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.75, borderTop: 1, borderColor: "divider" }}>
							<Box sx={{ flex: 1, minWidth: 0 }}>
								<Typography variant="body2">{p.name}</Typography>
								<Typography variant="caption" sx={{ color: "text.secondary", wordBreak: "break-word" }}>
									{p.game} · {t("automation.fromServer", { server: p.fromServer })} · {Object.keys(p.files ?? {}).join(", ")}
								</Typography>
							</Box>
							<Tooltip title={running ? t("automation.stopFirst") : t("automation.applyHere")}>
								<span>
									<IconButton size="small" aria-label={t("automation.applyAria", { name: p.name })} disabled={running} onClick={() => ask("apply", p)}>
										<ApplyIcon fontSize="small" />
									</IconButton>
								</span>
							</Tooltip>
							<Tooltip title={t("automation.deletePreset")}>
								<IconButton size="small" aria-label={t("automation.deleteAria", { name: p.name })} onClick={() => ask("delete", p)}>
									<DeleteIcon fontSize="small" />
								</IconButton>
							</Tooltip>
						</Box>
					))}
				</>
			)}
			<ConfirmDialog
				open={asking && Boolean(confirm)}
				title={confirm?.kind === "delete" ? t("automation.deletePresetTitle") : t("automation.applyTitle", { name: confirm?.preset.name ?? "" })}
				confirmLabel={confirm?.kind === "delete" ? t("common.deleteIt") : t("automation.applyIt")}
				color={confirm?.kind === "delete" ? "error" : "warning"}
				onConfirm={() => (confirm.kind === "delete" ? remove(confirm.preset) : apply(confirm.preset))}
				onClose={() => setAsking(false)}
			>
				{confirm?.kind === "delete"
					? t("automation.deleteBody", { name: confirm.preset.name })
					: t("automation.applyBody", { name: confirm?.preset.name ?? "", server: serverName })}
			</ConfirmDialog>
		</SectionCard>
	);
}

function CloneCard({ serverName, base, running, onCloned, onError }) {
	useT();
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
		<SectionCard title={t("automation.clone")} subtitle={t("automation.cloneSub")} icon={<CloneIcon />}>
			<Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
				<TipRow id="server.clone.name" sx={{ flex: "1 1 240px", maxWidth: 360 }}>
					<TextField size="small" fullWidth label={t("automation.copyName")} value={name} onChange={(e) => setName(e.target.value)} disabled={copying} />
				</TipRow>
				<TipRow id="server.clone.session" sx={{ flex: "1 1 240px", maxWidth: 360 }}>
					<TextField size="small" fullWidth label={t("automation.sessionName")} value={sessionName} onChange={(e) => setSessionName(e.target.value)} disabled={copying} />
				</TipRow>
				<Button variant="outlined" disabled={copying || !name.trim() || running} onClick={start}>
					{t("automation.cloneButton", { name: serverName })}
				</Button>
			</Box>
			{running && (
				<Typography variant="caption" sx={{ color: "warning.main", display: "block", mt: 0.5 }}>
{t("automation.stopFirstDot")}
				</Typography>
			)}
			{job && (
				<Box sx={{ mt: 2 }}>
					{copying && (
						<>
							<Typography variant="body2">{job.status === "copying" ? t("automation.copyingSize", { size: formatBytes(job.bytes) }) : t("automation.settingUp")}</Typography>
							<LinearProgress sx={{ mt: 1 }} />
						</>
					)}
					{job.status === "done" && (
						<Alert severity="success" action={<Button color="inherit" size="small" onClick={() => onCloned?.(job.name)}>{t("automation.openIt")}</Button>}>
							{t("automation.ready", { name: job.name, ports: Object.values(job.ports ?? {}).join(", ") })}
						</Alert>
					)}
					{job.status === "failed" && <Alert severity="error">{job.error}</Alert>}
				</Box>
			)}
		</SectionCard>
	);
}

export default AutomationPanel;
