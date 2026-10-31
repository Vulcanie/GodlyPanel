import React from "react";
import { Alert, Box, Button, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import { api } from "../api/client";
import { useToast } from "../ToastContext";
import ServerConsole from "./ServerConsole";
import InfoTip from "./InfoTip";
import TipRow from "./TipRow";
import { t, useT, errorText } from "../i18n";

// What each mode is for is explained by the (i) beside the choice (server.window.mode), not printed under it.
const MODES = {
	minimized: { label: () => t("window.mode.minimized") },
	hidden: { label: () => t("window.mode.hidden") },
	windowless: { label: () => t("window.mode.windowless") },
};

// Minecraft's start chain is already fully hidden, so it has no window to
// minimize or hide: the real choice is its script, or a direct launch.
const MINECRAFT_MODES = {
	hidden: { label: () => t("window.mode.standard") },
	windowless: { label: () => t("window.mode.windowless") },
};

const PRIORITIES = [
	["", () => t("window.priority.normal")],
	["low", () => t("window.priority.low")],
	["belowNormal", () => t("window.priority.belowNormal")],
	["aboveNormal", () => t("window.priority.aboveNormal")],
	["high", () => t("window.priority.high")],
];

const BLANK_FORM = { exe: "", args: "", cwd: "", priority: "" };

// "normal" is the same as leaving it unset, and the list shows that as one choice.
const priorityOf = (launch) => (launch?.priority && launch.priority !== "normal" ? launch.priority : "");

/**
 * How this server's window behaves, and (for "No window") what it runs and
 * what it prints. Shown on the server's Advanced tab, inside a card the page
 * provides, so it draws no frame or heading of its own.
 */
function ServerWindowPanel({ serverName }) {
	// Re-renders this panel when the language changes, so the t() text below switches with it.
	useT();
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const toast = useToast();
	const [win, setWin] = React.useState(null);
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState(null);
	const [detected, setDetected] = React.useState(null);
	const [captureNotes, setCaptureNotes] = React.useState([]);
	const [editing, setEditing] = React.useState(false);
	const [form, setForm] = React.useState(BLANK_FORM);
	// A reply that arrives after the person has moved to another server must not be shown on that server's page.
	const current = React.useRef(base);
	current.current = base;

	const load = React.useCallback(async () => {
		try {
			const data = await api.get(`${base}/window`);
			if (current.current !== base) return;
			setWin(data);
			setForm(
				data.launch
					? { exe: data.launch.exe ?? "", args: data.launch.args ?? "", cwd: data.launch.cwd ?? "", priority: priorityOf(data.launch) }
					: BLANK_FORM,
			);
		} catch (e) {
			if (current.current === base) setError(errorText(e));
		}
	}, [base]);

	React.useEffect(() => {
		setWin(null);
		setDetected(null);
		setCaptureNotes([]);
		setEditing(false);
		setError(null);
		setForm(BLANK_FORM);
		load();
	}, [load]);

	const run = async (work) => {
		setBusy(true);
		setError(null);
		try {
			await work();
		} catch (e) {
			setError(errorText(e));
			return e;
		} finally {
			setBusy(false);
		}
		return null;
	};

	const fillForm = (launch) =>
		setForm({
			exe: launch.exe ?? "",
			args: launch.args ?? "",
			cwd: launch.cwd ?? "",
			priority: priorityOf(launch),
		});

	const choose = (mode) =>
		run(async () => {
			const data = await api.put(`${base}/window-mode`, { mode });
			setWin(data);
			if (data.skipped?.length) {
				toast(t("window.skippedToast", { list: data.skipped.join(", ") }), "info");
			} else if (data.appliedNow) {
				toast(t("window.appliedNow"));
			} else if (mode !== "default") {
				toast(t("window.nextStart"), "info");
			}
		}).then((err) => {
			// A script that can't be read: let them fill the details in by hand.
			if (err && mode === "windowless") setEditing(true);
		});

	const detect = () =>
		run(async () => {
			const found = await api.post(`${base}/launch/detect`);
			setDetected(found);
			setCaptureNotes([]);
			if (!found.ok) throw new Error(found.reason);
			fillForm(found.launch);
			setEditing(true);
		});

	const capture = () =>
		run(async () => {
			const found = await api.post(`${base}/launch/capture`);
			setDetected(null);
			if (!found.ok) throw new Error(found.reason);
			fillForm(found.launch);
			setCaptureNotes(found.notes ?? []);
			setEditing(true);
		});

	const saveLaunch = () =>
		run(async () => {
			await api.put(`${base}/launch`, {
				...form,
				priority: form.priority || undefined,
			});
			await load();
			setEditing(false);
			setCaptureNotes([]);
			toast(t("window.launchSaved"));
		});

	const windowsNow = (action) =>
		run(async () => {
			const res = await api.post(`${base}/windows/${action}`);
			toast(action === "show" ? t("window.restored", { count: res.restored ?? 0 }) : t("window.hiding"), "info");
		});

	if (!win) {
		return (
			<Box sx={{ p: 2.5 }}>
				{error ? <Alert severity="error">{error}</Alert> : <CircularProgress size={20} />}
			</Box>
		);
	}

	const modes = win.hasWindows ? MODES : MINECRAFT_MODES;
	const defaultLabel = (modes[win.defaultMode] ?? modes.hidden).label().toLowerCase();
	const selected = win.requested ?? "default";
	const showsConsole = win.effective === "windowless" || win.hasLog;
	// A priority stored by something other than this form (for example "realtime") still has to show as itself.
	const priorities = PRIORITIES.some(([value]) => value === form.priority) ? PRIORITIES : [...PRIORITIES, [form.priority, () => form.priority]];

	return (
		<Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
			{error && (
				<Alert severity="error" onClose={() => setError(null)}>
					{error}
				</Alert>
			)}

			<TipRow id="server.window.mode" sx={{ maxWidth: 460 }}>
				<TextField select fullWidth size="small" label={t("window.modeLabel")} value={selected} disabled={busy} onChange={(e) => choose(e.target.value)}>
					<MenuItem value="default">{t("window.useDefault", { mode: defaultLabel })}</MenuItem>
					{Object.entries(modes).map(([value, mode]) => (
						<MenuItem key={value} value={value}>
							{mode.label()}
						</MenuItem>
					))}
				</TextField>
			</TipRow>

			{win.requested === "windowless" && win.effective !== "windowless" && (
				<Alert severity="warning">{win.hasWindows ? t("window.noLaunchHidden") : t("window.noLaunchNormal")}</Alert>
			)}
			{win.launchProblem && <Alert severity="warning">{win.launchProblem}</Alert>}

			<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
				{win.hasWindows && (
					<TipRow id="server.window.hide">
						<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
							<Button size="small" variant="outlined" disabled={busy} onClick={() => windowsNow("hide")}>
								{t("window.hideNow")}
							</Button>
							<Button size="small" variant="outlined" disabled={busy} onClick={() => windowsNow("show")}>
								{t("window.showWindows")}
							</Button>
						</Box>
					</TipRow>
				)}
				<TipRow id="server.launch.detect">
					<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
						{win.hasScript && (
							<Button size="small" disabled={busy} onClick={detect}>
								{t("window.readScript")}
							</Button>
						)}
						<Button size="small" disabled={busy} onClick={capture}>
							{t("window.copyRunning")}
						</Button>
						{!editing && (
							<Button size="small" disabled={busy} onClick={() => setEditing(true)}>
								{win.launch ? t("window.editLaunch") : t("window.enterLaunch")}
							</Button>
						)}
					</Box>
				</TipRow>
			</Box>

			{detected?.ok && detected.skipped?.length > 0 && <Alert severity="warning">{t("window.skippedNote", { list: detected.skipped.join(", ") })}</Alert>}
			{captureNotes.map((note) => (
				<Alert key={note} severity="info">
					{note}
				</Alert>
			))}

			{editing && (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
					<TipRow id="server.launch.program">
						<TextField fullWidth size="small" label={t("window.program")} value={form.exe} onChange={(e) => setForm({ ...form, exe: e.target.value })} />
					</TipRow>
					<TipRow id="server.launch.arguments">
						<TextField fullWidth size="small" label={t("window.arguments")} value={form.args} onChange={(e) => setForm({ ...form, args: e.target.value })} />
					</TipRow>
					<TipRow id="server.launch.folder">
						<TextField fullWidth size="small" label={t("window.startFolder")} value={form.cwd} onChange={(e) => setForm({ ...form, cwd: e.target.value })} />
					</TipRow>
					<TipRow id="server.launch.priority" sx={{ maxWidth: 260 }}>
						<TextField select fullWidth size="small" label={t("window.priorityLabel")} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
							{priorities.map(([value, label]) => (
								<MenuItem key={value} value={value}>
									{label()}
								</MenuItem>
							))}
						</TextField>
					</TipRow>
					<Box sx={{ display: "flex", gap: 1 }}>
						<Button size="small" variant="contained" disabled={busy || !form.exe} onClick={saveLaunch}>
							{t("window.saveLaunch")}
						</Button>
						<Button size="small" disabled={busy} onClick={() => setEditing(false)}>
							{t("common.cancel")}
						</Button>
					</Box>
				</Box>
			)}

			{showsConsole && (
				<Box>
					<Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
						<Typography variant="subtitle2">{t("console.output")}</Typography>
						<InfoTip id="server.window.console" />
					</Box>
					<ServerConsole serverName={serverName} active />
				</Box>
			)}
		</Box>
	);
}

export default ServerWindowPanel;
