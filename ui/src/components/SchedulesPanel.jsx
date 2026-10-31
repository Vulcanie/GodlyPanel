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
	Switch,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, PlayArrow as RunIcon, Schedule as ScheduleIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { onLive } from "../liveEvents";
import { useToast } from "../ToastContext";
import { t, tn, useT, formatDate } from "../i18n";
import SectionCard from "./ui/SectionCard";
import ConfirmDialog from "./ui/ConfirmDialog";
import InfoTip from "./InfoTip";
import TipRow from "./TipRow";

// The words for each kind of task. A kind not listed here is shown as it is.
function kindLabel(kind) {
	switch (kind) {
		case "backup":
			return t("schedules.kind.backup");
		case "restart":
			return t("schedules.kind.restart");
		case "update":
			return t("schedules.kind.update");
		case "command":
			return t("schedules.kind.command");
		case "announce":
			return t("schedules.kind.announce");
		default:
			return kind;
	}
}

const KIND_VALUES = ["backup", "restart", "update", "command", "announce"];
// The short day names, Sunday first, so the index is the day number.
function dayNames() {
	return [t("schedules.day.sun"), t("schedules.day.mon"), t("schedules.day.tue"), t("schedules.day.wed"), t("schedules.day.thu"), t("schedules.day.fri"), t("schedules.day.sat")];
}

export function describeWhen(when) {
	if (when.type === "daily") {
		const days = when.days ? when.days.map((d) => dayNames()[d] ?? d).join(", ") : t("schedules.everyDay");
		return t("schedules.dailyAt", { days, time: when.time });
	}
	if (when.type === "interval") {
		const m = when.everyMinutes;
		return m % 1440 === 0 ? tn("schedules.everyDays", m / 1440) : m % 60 === 0 ? tn("schedules.everyHours", m / 60) : t("schedules.everyMinutes", { minutes: m });
	}
	return t("schedules.once", { when: formatDate(when.at) });
}

// A date-time box wants the PC's own clock ("2026-10-13T04:00"), not UTC, so a one-off time doesn't move when it is edited.
const toLocalInput = (iso) => {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	const p = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const statusColour = { ok: "success", failed: "error", skipped: "warning" };

/** Scheduled backups, restarts, updates and commands for one server. Moderators can see them; admins change them. */
function SchedulesPanel({ serverName, serverNames = [], canManage }) {
	useT();
	const toast = useToast();
	const [tasks, setTasks] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [editing, setEditing] = React.useState(null); // a task, or {} for a new one
	const [deleting, setDeleting] = React.useState(null);
	const [deleteOpen, setDeleteOpen] = React.useState(false);

	const load = React.useCallback(async () => {
		try {
			const all = await api.get("/api/schedules");
			setTasks((Array.isArray(all) ? all : []).filter((t) => (t.servers ?? []).includes(serverName)));
			setError(null);
		} catch (e) {
			setError(e.message);
		}
	}, [serverName]);

	React.useEffect(() => {
		// Another server's page must not briefly show this one's schedules.
		setTasks(null);
		setEditing(null);
		setDeleteOpen(false);
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

	const act = async (fn, done) => {
		try {
			await fn();
			if (done) toast(done);
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
			<SectionCard
				title={
					<>
						{t("schedules.title")}
<InfoTip id="server.schedule.list" />
					</>
				}
				icon={<ScheduleIcon />}
				contentSx={{ p: 0 }}
				actions={
					canManage && (
						<Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setEditing({})}>
							{t("schedules.add")}
</Button>
					)
				}
			>
				{tasks.length === 0 ? (
					<Typography variant="body2" sx={{ p: 2.5, color: "text.secondary" }}>
						{t("schedules.none")}
					</Typography>
				) : (
					tasks.map((task, i) => {
						const options = task.options ?? {};
						return (
							<Box
								key={task.id}
								sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, px: 2.5, py: 1.5, borderTop: i === 0 ? 0 : 1, borderColor: "divider", opacity: task.enabled ? 1 : 0.55 }}
							>
								<Box sx={{ flex: 1, minWidth: 240 }}>
									<Typography variant="body1">
										{task.name || kindLabel(task.kind)} <Chip size="small" label={kindLabel(task.kind)} sx={{ ml: 1 }} />
										{task.servers.length > 1 && <Chip size="small" variant="outlined" label={tn("schedules.moreServers", task.servers.length - 1)} sx={{ ml: 0.5 }} />}
									</Typography>
									<Typography variant="body2" sx={{ color: "text.secondary", wordBreak: "break-word" }}>
										{describeWhen(task.when)}
										{task.kind === "command" ? ` · ${options.command ?? ""}` : ""}
										{task.kind === "announce" ? ` · ${tn("schedules.messages", (options.messages ?? []).length)}` : ""}
										{(task.kind === "restart" || task.kind === "update") && options.warnMinutes?.length ? ` · ${t("schedules.warns", { minutes: options.warnMinutes.join(", ") })}` : ""}
									</Typography>
									<Typography variant="caption" sx={{ color: "text.secondary" }}>
										{task.enabled && task.nextRunAt ? t("schedules.nextRun", { date: formatDate(task.nextRunAt) }) : task.enabled ? t("schedules.finished") : t("schedules.turnedOff")}
										{task.running ? ` · ${t("schedules.runningNow")}` : ""}
									</Typography>
								</Box>
								{task.lastStatus && (
									<Tooltip title={`${task.lastRunAt ? formatDate(task.lastRunAt) : ""} ${task.lastMessage ?? ""}`}>
										<Chip size="small" color={statusColour[task.lastStatus] ?? "default"} label={t("schedules.last", { status: task.lastStatus })} />
									</Tooltip>
								)}
								{canManage && (
									<>
										<Tooltip title={t("schedules.runNow")}>
											<span>
												<IconButton size="small" aria-label={t("schedules.runNow")} disabled={task.running} onClick={() => act(() => api.post(`/api/schedules/${task.id}/run`), t("schedules.started"))}>
													<RunIcon fontSize="small" />
												</IconButton>
											</span>
										</Tooltip>
										<Tooltip title={task.enabled ? t("schedules.turnOff") : t("schedules.turnOn")}>
											<Switch
												size="small"
												checked={task.enabled}
												inputProps={{ "aria-label": task.enabled ? t("schedules.turnOff") : t("schedules.turnOn") }}
												onChange={(e) => act(() => api.put(`/api/schedules/${task.id}`, { enabled: e.target.checked }))}
											/>
										</Tooltip>
										<IconButton size="small" aria-label={t("schedules.editAria")} onClick={() => setEditing(task)}>
											<EditIcon fontSize="small" />
										</IconButton>
										<IconButton
											size="small"
											aria-label={t("schedules.deleteAria")}
											onClick={() => {
												setDeleting(task);
												setDeleteOpen(true);
											}}
										>
											<DeleteIcon fontSize="small" />
										</IconButton>
									</>
								)}
							</Box>
						);
					})
				)}
			</SectionCard>
			<ConfirmDialog
				open={deleteOpen && Boolean(deleting)}
				title={t("schedules.deleteTitle")}
				confirmLabel={t("common.deleteIt")}
				color="error"
				onConfirm={() => {
					setDeleteOpen(false);
					act(() => api.del(`/api/schedules/${deleting.id}`), t("schedules.deleted"));
				}}
				onClose={() => setDeleteOpen(false)}
			>
				{deleting && t("schedules.deleteBody", { name: deleting.name || kindLabel(deleting.kind) || deleting.kind, when: describeWhen(deleting.when) })}
			</ConfirmDialog>
			{editing && (
				<ScheduleDialog
					task={editing}
					serverName={serverName}
					serverNames={serverNames}
					onClose={() => setEditing(null)}
					onSaved={(isNew) => {
						setEditing(null);
						toast(isNew ? t("schedules.added") : t("schedules.saved"));
						load();
					}}
				/>
			)}
		</Box>
	);
}

function ScheduleDialog({ task, serverName, serverNames, onClose, onSaved }) {
	useT();
	const isNew = !task.id;
	const when = task.when ?? { type: "daily", time: "04:00", days: null };
	const [kind, setKind] = React.useState(task.kind ?? "backup");
	const [name, setName] = React.useState(task.name ?? "");
	const [whenType, setWhenType] = React.useState(when.type);
	const [time, setTime] = React.useState(when.time ?? "04:00");
	const [days, setDays] = React.useState(when.days ?? [0, 1, 2, 3, 4, 5, 6]);
	const [every, setEvery] = React.useState(when.type === "interval" ? when.everyMinutes / 60 : 6);
	const [at, setAt] = React.useState(when.type === "once" ? toLocalInput(when.at) : "");
	const [warn, setWarn] = React.useState((task.options?.warnMinutes ?? [10, 5, 1]).join(", "));
	const [command, setCommand] = React.useState(task.options?.command ?? "");
	const [messages, setMessages] = React.useState((task.options?.messages ?? []).join("\n"));
	const [mode, setMode] = React.useState(task.options?.mode ?? "");
	const [servers, setServers] = React.useState(task.servers ?? [serverName]);
	const [error, setError] = React.useState(null);
	const [busy, setBusy] = React.useState(false);

	const save = async () => {
		setError(null);
		if (whenType === "once" && Number.isNaN(new Date(at).getTime())) return setError(t("schedules.needDate"));
		setBusy(true);
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
			onSaved(isNew);
		} catch (e) {
			setError(e.message);
			setBusy(false);
		}
	};

	return (
		<Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
			<DialogTitle>{isNew ? t("schedules.add") : t("schedules.editTitle")}</DialogTitle>
			<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
				{error && <Alert severity="error">{error}</Alert>}
				<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
					<TipRow id="server.schedule.kind" sx={{ flex: "1 1 200px" }}>
						<TextField select fullWidth size="small" label={t("schedules.whatToDo")} value={kind} onChange={(e) => setKind(e.target.value)}>
							{KIND_VALUES.map((value) => (
								<MenuItem key={value} value={value}>
									{kindLabel(value)}
								</MenuItem>
							))}
						</TextField>
					</TipRow>
					<TipRow id="server.schedule.name" sx={{ flex: "2 1 200px" }}>
						<TextField fullWidth size="small" label={t("schedules.nameOptional")} value={name} onChange={(e) => setName(e.target.value)} />
					</TipRow>
				</Box>

				<TipRow id="server.schedule.when">
					<TextField select fullWidth size="small" label={t("schedules.when")} value={whenType} onChange={(e) => setWhenType(e.target.value)}>
						<MenuItem value="daily">{t("schedules.whenDaily")}</MenuItem>
						<MenuItem value="interval">{t("schedules.whenInterval")}</MenuItem>
						<MenuItem value="once">{t("schedules.whenOnce")}</MenuItem>
					</TextField>
				</TipRow>
				{whenType === "daily" && (
					<>
						<TextField size="small" type="time" label={t("schedules.timeLabel")} value={time} onChange={(e) => setTime(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 220, maxWidth: "100%" }} />
						<ToggleButtonGroup size="small" value={days} onChange={(_, v) => v.length > 0 && setDays(v)} sx={{ flexWrap: "wrap" }}>
							{dayNames().map((d, i) => (
								<ToggleButton key={d} value={i} sx={{ px: 1.5 }}>
									{d}
								</ToggleButton>
							))}
						</ToggleButtonGroup>
					</>
				)}
				{whenType === "interval" && <TextField size="small" type="number" label={t("schedules.everyHoursLabel")} value={every} onChange={(e) => setEvery(e.target.value)} inputProps={{ min: 0.1, step: 0.5 }} sx={{ width: 200, maxWidth: "100%" }} />}
				{whenType === "once" && <TextField size="small" type="datetime-local" label={t("schedules.dateTime")} value={at} onChange={(e) => setAt(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 260, maxWidth: "100%" }} />}

				{(kind === "restart" || kind === "update") && (
					<TipRow id="server.schedule.warn">
						<TextField fullWidth size="small" label={t("schedules.warnLabel")} value={warn} placeholder="10, 5, 1" onChange={(e) => setWarn(e.target.value)} />
					</TipRow>
				)}
				{kind === "announce" && (
					<TipRow id="server.schedule.messages">
						<TextField fullWidth size="small" multiline minRows={3} label={t("schedules.messagesLabel")} value={messages} onChange={(e) => setMessages(e.target.value)} />
					</TipRow>
				)}
				{kind === "command" && (
					<TipRow id="server.schedule.command">
						<TextField fullWidth size="small" label={t("schedules.kind.command")} value={command} onChange={(e) => setCommand(e.target.value)} />
					</TipRow>
				)}
				{kind === "backup" && (
					<TipRow id="server.backup.mode">
						<TextField select fullWidth size="small" label={t("common.whileRunning")} value={mode} onChange={(e) => setMode(e.target.value)}>
							<MenuItem value="">{t("schedules.useBackupSetting")}</MenuItem>
							<MenuItem value="stop">{t("schedules.stopCopy")}</MenuItem>
							<MenuItem value="live">{t("schedules.keepRunning")}</MenuItem>
						</TextField>
					</TipRow>
				)}

				{serverNames.length > 1 && (
					<Box>
						<Box sx={{ display: "flex", alignItems: "center" }}>
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								{t("schedules.alsoRunOn")}
							</Typography>
							<InfoTip id="server.schedule.servers" />
						</Box>
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
					{t("common.cancel")}
				</Button>
				<Button variant="contained" onClick={save} disabled={busy}>
					{t("common.save")}
</Button>
</DialogActions>
		</Dialog>
	);
}

export default SchedulesPanel;
