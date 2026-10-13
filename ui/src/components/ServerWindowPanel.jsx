import React from "react";
import { Alert, Box, Button, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import { api } from "../api/client";
import { useToast } from "../ToastContext";
import ServerConsole from "./ServerConsole";
import InfoTip from "./InfoTip";
import TipRow from "./TipRow";

// What each mode is for is explained by the (i) beside the choice (server.window.mode), not printed under it.
const MODES = {
	minimized: { label: "Minimized" },
	hidden: { label: "Hidden" },
	windowless: { label: "No window" },
};

// Minecraft's start chain is already fully hidden, so it has no window to
// minimize or hide: the real choice is its script, or a direct launch.
const MINECRAFT_MODES = {
	hidden: { label: "Standard" },
	windowless: { label: "No window" },
};

const PRIORITIES = [
	["", "Normal"],
	["low", "Low"],
	["belowNormal", "Below normal"],
	["aboveNormal", "Above normal"],
	["high", "High"],
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
			if (current.current === base) setError(e.message);
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
			setError(e.message);
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
				toast(`Skipped from your start script: ${data.skipped.join(", ")}.`, "info");
			} else if (data.appliedNow) {
				toast("Applied to the running server.");
			} else if (mode !== "default") {
				toast("Takes effect the next time this server starts.", "info");
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
			toast("Launch details saved.");
		});

	const windowsNow = (action) =>
		run(async () => {
			const res = await api.post(`${base}/windows/${action}`);
			toast(action === "show" ? `Restored ${res.restored ?? 0} window(s).` : "Hiding this server's windows.", "info");
		});

	if (!win) {
		return (
			<Box sx={{ p: 2.5 }}>
				{error ? <Alert severity="error">{error}</Alert> : <CircularProgress size={20} />}
			</Box>
		);
	}

	const modes = win.hasWindows ? MODES : MINECRAFT_MODES;
	const defaultLabel = (modes[win.defaultMode] ?? modes.hidden).label.toLowerCase();
	const selected = win.requested ?? "default";
	const showsConsole = win.effective === "windowless" || win.hasLog;
	// A priority stored by something other than this form (for example "realtime") still has to show as itself.
	const priorities = PRIORITIES.some(([value]) => value === form.priority) ? PRIORITIES : [...PRIORITIES, [form.priority, form.priority]];

	return (
		<Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
			{error && (
				<Alert severity="error" onClose={() => setError(null)}>
					{error}
				</Alert>
			)}

			<TipRow id="server.window.mode" sx={{ maxWidth: 460 }}>
				<TextField select fullWidth size="small" label="Window mode" value={selected} disabled={busy} onChange={(e) => choose(e.target.value)}>
					<MenuItem value="default">Use the panel default ({defaultLabel})</MenuItem>
					{Object.entries(modes).map(([value, mode]) => (
						<MenuItem key={value} value={value}>
							{mode.label}
						</MenuItem>
					))}
				</TextField>
			</TipRow>

			{win.requested === "windowless" && win.effective !== "windowless" && (
				<Alert severity="warning">
					No launch details are saved yet, so this {win.hasWindows ? "runs hidden" : "starts the normal way"} until they are. Fill them in below.
				</Alert>
			)}
			{win.launchProblem && <Alert severity="warning">{win.launchProblem}</Alert>}

			<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
				{win.hasWindows && (
					<TipRow id="server.window.hide">
						<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
							<Button size="small" variant="outlined" disabled={busy} onClick={() => windowsNow("hide")}>
								Hide windows now
							</Button>
							<Button size="small" variant="outlined" disabled={busy} onClick={() => windowsNow("show")}>
								Show windows
							</Button>
						</Box>
					</TipRow>
				)}
				<TipRow id="server.launch.detect">
					<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
						{win.hasScript && (
							<Button size="small" disabled={busy} onClick={detect}>
								Read launch details from the start script
							</Button>
						)}
						<Button size="small" disabled={busy} onClick={capture}>
							Copy from the running server
						</Button>
						{!editing && (
							<Button size="small" disabled={busy} onClick={() => setEditing(true)}>
								{win.launch ? "Edit launch details" : "Enter launch details"}
							</Button>
						)}
					</Box>
				</TipRow>
			</Box>

			{detected?.ok && detected.skipped?.length > 0 && (
				<Alert severity="warning">
					Reading your start script found {detected.skipped.join(", ")}. "No window" mode skips that — GodlyPanel's own Update button and auto-update cover it.
				</Alert>
			)}
			{captureNotes.map((note) => (
				<Alert key={note} severity="info">
					{note}
				</Alert>
			))}

			{editing && (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
					<TipRow id="server.launch.program">
						<TextField fullWidth size="small" label="Program" value={form.exe} onChange={(e) => setForm({ ...form, exe: e.target.value })} />
					</TipRow>
					<TipRow id="server.launch.arguments">
						<TextField fullWidth size="small" label="Arguments" value={form.args} onChange={(e) => setForm({ ...form, args: e.target.value })} />
					</TipRow>
					<TipRow id="server.launch.folder">
						<TextField fullWidth size="small" label="Start in folder" value={form.cwd} onChange={(e) => setForm({ ...form, cwd: e.target.value })} />
					</TipRow>
					<TipRow id="server.launch.priority" sx={{ maxWidth: 260 }}>
						<TextField select fullWidth size="small" label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
							{priorities.map(([value, label]) => (
								<MenuItem key={value} value={value}>
									{label}
								</MenuItem>
							))}
						</TextField>
					</TipRow>
					<Box sx={{ display: "flex", gap: 1 }}>
						<Button size="small" variant="contained" disabled={busy || !form.exe} onClick={saveLaunch}>
							Save launch details
						</Button>
						<Button size="small" disabled={busy} onClick={() => setEditing(false)}>
							Cancel
						</Button>
					</Box>
				</Box>
			)}

			{showsConsole && (
				<Box>
					<Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
						<Typography variant="subtitle2">Console output</Typography>
						<InfoTip id="server.window.console" />
					</Box>
					<ServerConsole serverName={serverName} active />
				</Box>
			)}
		</Box>
	);
}

export default ServerWindowPanel;
