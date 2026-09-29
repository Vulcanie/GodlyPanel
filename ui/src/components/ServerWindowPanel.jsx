import React from "react";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	FormControlLabel,
	MenuItem,
	Radio,
	RadioGroup,
	TextField,
	Typography,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { api } from "../api/client";
import ServerConsole from "./ServerConsole";

const MODES = {
	minimized: {
		label: "Minimized",
		help: "Runs in a minimized window that stays on your taskbar. Best when you want to watch the console yourself.",
	},
	hidden: {
		label: "Hidden",
		help: "Runs in a window that's hidden as soon as it opens, so nothing sits on your taskbar. Works with any start script. There can be a brief flash at launch.",
	},
	windowless: {
		label: "No window",
		help: "GodlyPanel starts the game program itself, so no window exists at all, and shows its live output below. It skips anything else your start script does, such as a SteamCMD update check — use the Update button or auto-update instead.",
	},
};

const PRIORITIES = [
	["", "Normal"],
	["belowNormal", "Below normal"],
	["aboveNormal", "Above normal"],
	["high", "High"],
];

/**
 * How this server's window behaves, and (for "No window") what it runs and
 * what it prints. Sits on the server's page, next to the RCON console.
 */
function ServerWindowPanel({ serverName }) {
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const [win, setWin] = React.useState(null);
	const [open, setOpen] = React.useState(false);
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState(null);
	const [notice, setNotice] = React.useState(null);
	const [detected, setDetected] = React.useState(null);
	const [editing, setEditing] = React.useState(false);
	const [form, setForm] = React.useState({
		exe: "",
		args: "",
		cwd: "",
		priority: "",
	});

	const load = React.useCallback(async () => {
		try {
			const data = await api.get(`${base}/window`);
			setWin(data);
			if (data.launch) {
				setForm({
					exe: data.launch.exe ?? "",
					args: data.launch.args ?? "",
					cwd: data.launch.cwd ?? "",
					priority: data.launch.priority ?? "",
				});
			}
		} catch (e) {
			setError(e.message);
		}
	}, [base]);

	React.useEffect(() => {
		setWin(null);
		setDetected(null);
		setEditing(false);
		setError(null);
		setNotice(null);
		load();
	}, [load]);

	const run = async (work) => {
		setBusy(true);
		setError(null);
		setNotice(null);
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

	const choose = (mode) =>
		run(async () => {
			const data = await api.put(`${base}/window-mode`, { mode });
			setWin(data);
			if (data.skipped?.length) {
				setNotice(
					`Skipped from your start script: ${data.skipped.join(", ")}.`,
				);
			} else if (data.appliedNow) {
				setNotice("Applied to the running server.");
			} else if (mode !== "default") {
				setNotice("Takes effect the next time this server starts.");
			}
		}).then((err) => {
			// A script that can't be read: let them fill the details in by hand.
			if (err && mode === "windowless") setEditing(true);
		});

	const detect = () =>
		run(async () => {
			const found = await api.post(`${base}/launch/detect`);
			setDetected(found);
			if (found.ok) {
				setForm({
					exe: found.launch.exe,
					args: found.launch.args,
					cwd: found.launch.cwd,
					priority: found.launch.priority ?? "",
				});
				setEditing(true);
			} else {
				setError(found.reason);
			}
		});

	const saveLaunch = () =>
		run(async () => {
			await api.put(`${base}/launch`, {
				...form,
				priority: form.priority || undefined,
			});
			await load();
			setEditing(false);
			setNotice("Launch details saved.");
		});

	const windowsNow = (action) =>
		run(async () => {
			const res = await api.post(`${base}/windows/${action}`);
			setNotice(
				action === "show"
					? `Restored ${res.restored ?? 0} window(s).`
					: "Hiding this server's windows.",
			);
		});

	if (!win) {
		return error ? (
			<Alert severity="error">{error}</Alert>
		) : (
			<CircularProgress size={20} />
		);
	}

	if (!win.applicable) {
		return (
			<Alert severity="info" sx={{ mb: 2 }}>
				Minecraft servers already run without a window, so there's
				nothing to configure here.
			</Alert>
		);
	}

	const selected = win.requested ?? "default";
	const showsConsole = win.effective === "windowless" || win.hasLog;

	return (
		<Box sx={{ mt: 3, mb: 2 }}>
			<Accordion
				expanded={open}
				onChange={(_, v) => setOpen(v)}
				disableGutters
			>
				<AccordionSummary expandIcon={<ExpandMoreIcon />}>
					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							gap: 1.5,
							flexWrap: "wrap",
						}}
					>
						<Typography variant="subtitle1">
							Window &amp; console
						</Typography>
						<Chip size="small" label={MODES[win.effective].label} />
						{win.requested === null && (
							<Chip
								size="small"
								variant="outlined"
								label="panel default"
							/>
						)}
					</Box>
				</AccordionSummary>
				<AccordionDetails>
					<Box
						sx={{
							display: "flex",
							flexDirection: "column",
							gap: 2,
						}}
					>
						{error && (
							<Alert
								severity="error"
								onClose={() => setError(null)}
							>
								{error}
							</Alert>
						)}
						{notice && (
							<Alert
								severity="info"
								onClose={() => setNotice(null)}
							>
								{notice}
							</Alert>
						)}

						<RadioGroup
							value={selected}
							onChange={(e) => choose(e.target.value)}
						>
							<FormControlLabel
								value="default"
								disabled={busy}
								control={<Radio />}
								label={
									<Typography variant="body2">
										Use the panel default (
										{MODES[
											win.defaultMode
										].label.toLowerCase()}
										)
									</Typography>
								}
							/>
							{Object.entries(MODES).map(([value, mode]) => (
								<FormControlLabel
									key={value}
									value={value}
									disabled={busy}
									control={<Radio />}
									sx={{ alignItems: "flex-start", mt: 0.5 }}
									label={
										<Box sx={{ pt: 0.75 }}>
											<Typography variant="body2">
												{mode.label}
											</Typography>
											<Typography
												variant="caption"
												sx={{ color: "text.secondary" }}
											>
												{mode.help}
											</Typography>
										</Box>
									}
								/>
							))}
						</RadioGroup>

						{win.requested === "windowless" &&
							win.effective !== "windowless" && (
								<Alert severity="warning">
									No launch details are saved yet, so this
									runs hidden until they are. Fill them in
									below.
								</Alert>
							)}
						{win.launchProblem && (
							<Alert severity="warning">
								{win.launchProblem}
							</Alert>
						)}

						<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
							<Button
								size="small"
								variant="outlined"
								disabled={busy}
								onClick={() => windowsNow("hide")}
							>
								Hide windows now
							</Button>
							<Button
								size="small"
								variant="outlined"
								disabled={busy}
								onClick={() => windowsNow("show")}
							>
								Show windows
							</Button>
							{win.hasScript && (
								<Button
									size="small"
									disabled={busy}
									onClick={detect}
								>
									Read launch details from the start script
								</Button>
							)}
							{!editing && (
								<Button
									size="small"
									disabled={busy}
									onClick={() => setEditing(true)}
								>
									{win.launch
										? "Edit launch details"
										: "Enter launch details"}
								</Button>
							)}
						</Box>

						{detected?.ok && detected.skipped?.length > 0 && (
							<Alert severity="warning">
								Reading your start script found{" "}
								{detected.skipped.join(", ")}. "No window" mode
								skips that — GodlyPanel's own Update button and
								auto-update cover it.
							</Alert>
						)}

						{editing && (
							<Box
								sx={{
									display: "flex",
									flexDirection: "column",
									gap: 1.5,
								}}
							>
								<TextField
									size="small"
									label="Program"
									value={form.exe}
									onChange={(e) =>
										setForm({
											...form,
											exe: e.target.value,
										})
									}
									helperText="Full path to the server's .exe."
								/>
								<TextField
									size="small"
									label="Arguments"
									value={form.args}
									onChange={(e) =>
										setForm({
											...form,
											args: e.target.value,
										})
									}
									helperText="Exactly what follows the program on the launch line."
								/>
								<TextField
									size="small"
									label="Start in folder"
									value={form.cwd}
									onChange={(e) =>
										setForm({
											...form,
											cwd: e.target.value,
										})
									}
									helperText="Leave blank to use the program's own folder."
								/>
								<TextField
									select
									size="small"
									label="Priority"
									value={form.priority}
									onChange={(e) =>
										setForm({
											...form,
											priority: e.target.value,
										})
									}
									sx={{ maxWidth: 220 }}
								>
									{PRIORITIES.map(([value, label]) => (
										<MenuItem key={value} value={value}>
											{label}
										</MenuItem>
									))}
								</TextField>
								<Box sx={{ display: "flex", gap: 1 }}>
									<Button
										size="small"
										variant="contained"
										disabled={busy || !form.exe}
										onClick={saveLaunch}
									>
										Save launch details
									</Button>
									<Button
										size="small"
										disabled={busy}
										onClick={() => setEditing(false)}
									>
										Cancel
									</Button>
								</Box>
							</Box>
						)}

						{showsConsole && (
							<Box>
								<Typography variant="subtitle2" sx={{ mb: 1 }}>
									Console output
								</Typography>
								<ServerConsole
									serverName={serverName}
									active={open}
								/>
							</Box>
						)}
					</Box>
				</AccordionDetails>
			</Accordion>
		</Box>
	);
}

export default ServerWindowPanel;
