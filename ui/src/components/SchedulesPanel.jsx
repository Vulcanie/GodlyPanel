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
	DialogTitle,
	FormControlLabel,
	IconButton,
	MenuItem,
	Paper,
	Switch,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, PlayArrow as RunIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { onLive } from "../liveEvents";

const KIND_LABELS = { backup: "Back up", restart: "Restart", update: "Update game", command: "Console command", announce: "Announce in game" };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function describeWhen(when) {
	if (when.type === "daily") {
		const days = when.days ? when.days.map((d) => DAYS[d]).join(", ") : "every day";
		return `${days} at ${when.time}`;
	}
	if (when.type === "interval") {
		const m = when.everyMinutes;
		return m % 1440 === 0 ? `every ${m / 1440} day${m === 1440 ? "" : "s"}` : m % 60 === 0 ? `every ${m / 60} hour${m === 60 ? "" : "s"}` : `every ${m} minutes`;
	}
	return `once, ${new Date(when.at).toLocaleString()}`;
}

const statusColour = { ok: "success", failed: "error", skipped: "warning" };

/** Scheduled backups, restarts, updates and commands for one server. Moderators can see them; admins change them. */
function SchedulesPanel({ serverName, serverNames, canManage }) {
	const [tasks, setTasks] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [editing, setEditing] = React.useState(null); // a task, or {} for a new one

	const load = React.useCallback(async () => {
		try {
			const all = await api.get("/api/schedules");
			setTasks(all.filter((t) => t.servers.includes(serverName)));
			setError(null);
		} catch (e) {
			setError(e.message);
		}
	}, [serverName]);

	React.useEffect(() => {
		load();
		const off = onLive("activity", ({ event }) => {
			if (/^(schedule|server\.restarted\.scheduled|backup)\./.test(event.type)) load();
		});
		const timer = setInterval(load, 30000);
		return () => {
			off();
			clearInterval(timer);
		};
	}, [load]);

	const act = async (fn) => {
		try {
			await fn();
			await load();
		} catch (e) {
			setError(e.message);
		}
	};

	if (!tasks) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress size={24} />;

	return (
		<Box>
			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}
			{canManage && (
				<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing({})} sx={{ mb: 2 }}>
					Add a schedule
				</Button>
			)}
			{tasks.length === 0 ? (
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					Nothing is scheduled for this server. Schedules run while GodlyPanel is running; one that comes due while it is closed is skipped.
				</Typography>
			) : (
				<Paper>
					{tasks.map((t, i) => (
						<Box key={t.id} sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, px: 2, py: 1.5, borderTop: i === 0 ? 0 : (t) => `1px solid ${t.palette.divider}`, opacity: t.enabled ? 1 : 0.55 }}>
							<Box sx={{ flex: 1, minWidth: 240 }}>
								<Typography variant="body1">
									{t.name || KIND_LABELS[t.kind]} <Chip size="small" label={KIND_LABELS[t.kind]} sx={{ ml: 1 }} />
									{t.servers.length > 1 && <Chip size="small" variant="outlined" label={`+${t.servers.length - 1} more server${t.servers.length > 2 ? "s" : ""}`} sx={{ ml: 0.5 }} />}
								</Typography>
								<Typography variant="body2" sx={{ color: "text.secondary" }}>
									{describeWhen(t.when)}
									{t.kind === "command" ? ` · ${t.options.command}` : ""}
									{t.kind === "announce" ? ` · ${t.options.messages.length} message${t.options.messages.length === 1 ? "" : "s"}, one each time` : ""}
									{(t.kind === "restart" || t.kind === "update") && t.options.warnMinutes?.length ? ` · warns ${t.options.warnMinutes.join(", ")} min before` : ""}
								</Typography>
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									{t.enabled && t.nextRunAt ? `Next: ${new Date(t.nextRunAt).toLocaleString()}` : t.enabled ? "Finished" : "Turned off"}
									{t.running ? " · running now" : ""}
								</Typography>
							</Box>
							{t.lastStatus && (
								<Tooltip title={`${t.lastRunAt ? new Date(t.lastRunAt).toLocaleString() : ""} ${t.lastMessage ?? ""}`}>
									<Chip size="small" color={statusColour[t.lastStatus] ?? "default"} label={`Last: ${t.lastStatus}`} />
								</Tooltip>
							)}
							{canManage && (
								<>
									<Tooltip title="Run it now">
										<span>
											<IconButton size="small" disabled={t.running} onClick={() => act(() => api.post(`/api/schedules/${t.id}/run`))}>
												<RunIcon fontSize="small" />
											</IconButton>
										</span>
									</Tooltip>
									<Switch size="small" checked={t.enabled} onChange={(e) => act(() => api.put(`/api/schedules/${t.id}`, { enabled: e.target.checked }))} />
									<IconButton size="small" onClick={() => setEditing(t)}>
										<EditIcon fontSize="small" />
									</IconButton>
									<IconButton size="small" onClick={() => window.confirm("Delete this schedule?") && act(() => api.del(`/api/schedules/${t.id}`))}>
										<DeleteIcon fontSize="small" />
									</IconButton>
								</>
							)}
						</Box>
					))}
				</Paper>
			)}
			{editing && <ScheduleDialog task={editing} serverName={serverName} serverNames={serverNames} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
		</Box>
	);
}

function ScheduleDialog({ task, serverName, serverNames, onClose, onSaved }) {
	const isNew = !task.id;
	const when = task.when ?? { type: "daily", time: "04:00", days: null };
	const [kind, setKind] = React.useState(task.kind ?? "backup");
	const [name, setName] = React.useState(task.name ?? "");
	const [whenType, setWhenType] = React.useState(when.type);
	const [time, setTime] = React.useState(when.time ?? "04:00");
	const [days, setDays] = React.useState(when.days ?? [0, 1, 2, 3, 4, 5, 6]);
	const [every, setEvery] = React.useState(when.type === "interval" ? when.everyMinutes / 60 : 6);
	const [at, setAt] = React.useState(when.type === "once" ? new Date(when.at).toISOString().slice(0, 16) : "");
	const [warn, setWarn] = React.useState((task.options?.warnMinutes ?? [10, 5, 1]).join(", "));
	const [command, setCommand] = React.useState(task.options?.command ?? "");
	const [messages, setMessages] = React.useState((task.options?.messages ?? []).join("\n"));
	const [mode, setMode] = React.useState(task.options?.mode ?? "");
	const [servers, setServers] = React.useState(task.servers ?? [serverName]);
	const [error, setError] = React.useState(null);
	const [busy, setBusy] = React.useState(false);

	const save = async () => {
		setBusy(true);
		setError(null);
		try {
			const whenBody =
				whenType === "daily"
					? { type: "daily", time, days: days.length === 7 ? null : days }
					: whenType === "interval"
						? { type: "interval", everyMinutes: Math.round(Number(every) * 60) }
						: { type: "once", at: new Date(at).toISOString() };
			const options = {};
			if (kind === "restart" || kind === "update") options.warnMinutes = warn.split(/[,\s]+/).filter(Boolean).map(Number);
			if (kind === "command") options.command = command;
			if (kind === "announce") options.messages = messages.split(/\r?\n/).map((m) => m.trim()).filter(Boolean);
			if (kind === "backup" && mode) options.mode = mode;
			const body = { kind, name, servers, when: whenBody, options };
			if (isNew) await api.post("/api/schedules", body);
			else await api.put(`/api/schedules/${task.id}`, body);
			onSaved();
		} catch (e) {
			setError(e.message);
			setBusy(false);
		}
	};

	return (
		<Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
			<DialogTitle>{isNew ? "Add a schedule" : "Edit schedule"}</DialogTitle>
			<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
				{error && <Alert severity="error">{error}</Alert>}
				<Box sx={{ display: "flex", gap: 2 }}>
					<TextField select size="small" label="What to do" value={kind} onChange={(e) => setKind(e.target.value)} sx={{ minWidth: 200 }}>
						{Object.entries(KIND_LABELS).map(([value, text]) => (
							<MenuItem key={value} value={value}>
								{text}
							</MenuItem>
						))}
					</TextField>
					<TextField size="small" fullWidth label="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
				</Box>

				<TextField select size="small" label="When" value={whenType} onChange={(e) => setWhenType(e.target.value)}>
					<MenuItem value="daily">At a time of day</MenuItem>
					<MenuItem value="interval">Every so many hours</MenuItem>
					<MenuItem value="once">Once</MenuItem>
				</TextField>
				{whenType === "daily" && (
					<>
						<TextField size="small" type="time" label="Time (this PC's clock)" value={time} onChange={(e) => setTime(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 220 }} />
						<ToggleButtonGroup size="small" value={days} onChange={(_, v) => v.length > 0 && setDays(v)}>
							{DAYS.map((d, i) => (
								<ToggleButton key={d} value={i} sx={{ px: 1.5 }}>
									{d}
								</ToggleButton>
							))}
						</ToggleButtonGroup>
					</>
				)}
				{whenType === "interval" && <TextField size="small" type="number" label="Every (hours)" value={every} onChange={(e) => setEvery(e.target.value)} inputProps={{ min: 0.1, step: 0.5 }} sx={{ width: 200 }} />}
				{whenType === "once" && <TextField size="small" type="datetime-local" label="Date and time" value={at} onChange={(e) => setAt(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 260 }} />}

				{(kind === "restart" || kind === "update") && (
					<TextField size="small" label="Warn players this many minutes before" value={warn} onChange={(e) => setWarn(e.target.value)} helperText="Comma-separated, e.g. 10, 5, 1. Blank for no warning. Only games that can broadcast show it." />
				)}
				{kind === "announce" && (
					<TextField
						size="small"
						multiline
						minRows={3}
						label="Messages (one per line)"
						value={messages}
						onChange={(e) => setMessages(e.target.value)}
						helperText="Each time it runs it says the next message, then starts over. Only games with a chat command can show them."
					/>
				)}
				{kind === "command" && <TextField size="small" label="Console command" value={command} onChange={(e) => setCommand(e.target.value)} helperText="Sent over RCON when the server is running." />}
				{kind === "backup" && (
					<TextField select size="small" label="While it's running" value={mode} onChange={(e) => setMode(e.target.value)}>
						<MenuItem value="">Use the server's backup setting</MenuItem>
						<MenuItem value="stop">Stop it for the copy</MenuItem>
						<MenuItem value="live">Keep it running</MenuItem>
					</TextField>
				)}

				{serverNames.length > 1 && (
					<Box>
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							Also run on
						</Typography>
						<Box sx={{ display: "flex", flexWrap: "wrap" }}>
							{serverNames.filter((n) => n !== serverName).map((n) => (
								<FormControlLabel key={n} control={<Checkbox size="small" checked={servers.includes(n)} onChange={(e) => setServers((s) => (e.target.checked ? [...s, n] : s.filter((x) => x !== n)))} />} label={n} />
							))}
						</Box>
					</Box>
				)}
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

export default SchedulesPanel;
