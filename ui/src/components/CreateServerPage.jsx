import React from "react";
import {
	Box,
	Typography,
	Button,
	Card,
	CardActionArea,
	CardContent,
	TextField,
	MenuItem,
	CircularProgress,
	Grid,
	Alert,
	Chip,
	Checkbox,
	FormControlLabel,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { grey } from "@mui/material/colors";
import ModpackUploadField from "./ModpackUploadField";
import FolderField from "./FolderField";
import PortsToOpen, { findPortClash } from "./PortsToOpen";
import { api } from "../api/client";

const FIELD_LABELS = {
	sessionName: "Server / Session Name",
	serverPassword: "Server Password",
	adminPassword: "Admin Password (in-game admin rights; must differ from the server password)",
	rconPassword: "RCON Password",
	clusterId: "Cluster ID",
	mods: "Mod IDs (comma-separated, optional)",
};

// Poll cadence while a creation job is running.
const POLL_MS = 4000;

// A fresh join password for each new server. This used to default to one fixed
// value, which would have meant every server anyone created started out with the
// same well-known password. Letters and digits only, minus the look-alikes
// (0/O, 1/l/I), since people read these out to friends.
function randomJoinPassword(length = 8) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function CreateServerPage({ onBack, userRole }) {
	const [templates, setTemplates] = React.useState(null);
	const [loadError, setLoadError] = React.useState(null);
	const [selected, setSelected] = React.useState(null);
	const [suggested, setSuggested] = React.useState(null);
	const [form, setForm] = React.useState({});
	const [submitting, setSubmitting] = React.useState(false);
	const [submitError, setSubmitError] = React.useState(null);
	const [askSteamCmd, setAskSteamCmd] = React.useState(false);
	const [job, setJob] = React.useState(null);

	React.useEffect(() => {
		if (userRole !== "admin") return;
		api
			.get("/api/templates")
			.then(setTemplates)
			.catch((e) => setLoadError(e.message));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userRole]);

	const pickTemplate = async (template) => {
		setSelected(template);
		setSuggested(null);
		setSubmitError(null);
		setJob(null);
		try {
			const data = await api.get(`/api/templates/${template.id}/suggest`);
			setSuggested(data);
			const initial = {
				name: "",
				rconPassword: data.rconPassword ?? "",
				serverPassword: randomJoinPassword(),
				adminPassword: randomJoinPassword(10),
				sessionName: "",
				maxPlayers: "",
				mapCode: template.mapChoices?.[0]?.code || "",
				clusterId: "MyCluster",
				mods: "",
				maxMemoryGB: "6",
				eulaAccepted: false,
				uploadId: "",
				installParent: "",
				...Object.fromEntries(
					template.ports.map((p) => [p.key, String(data.ports[p.key])]),
				),
			};
			setForm(initial);
		} catch (e) {
			setSubmitError(`Failed to load defaults: ${e.message}`);
		}
	};

	const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

	const submit = async (acceptSteamCmdDownload = false) => {
		setAskSteamCmd(false);
		setSubmitting(true);
		setSubmitError(null);
		try {
			const body = {
				templateId: selected.id,
				...form,
				...(acceptSteamCmdDownload ? { acceptSteamCmdDownload: true } : {}),
			};
			for (const p of selected.ports) {
				body[p.key] = Number(form[p.key]);
			}
			if (form.maxPlayers) body.maxPlayers = Number(form.maxPlayers);
			if (form.maxMemoryGB) body.maxMemoryGB = Number(form.maxMemoryGB);

			const data = await api.post("/api/servers", body);
			setJob({ jobId: data.jobId, status: "queued" });
		} catch (e) {
			setSubmitting(false);
			if (e.code === "steamcmd-not-installed") {
				setAskSteamCmd(true);
				return;
			}
			setSubmitError(e.message);
		}
	};

	// Poll the creation job until it settles.
	React.useEffect(() => {
		if (!job?.jobId || job.status === "done" || job.status === "error") return;
		const timer = setTimeout(async () => {
			try {
				const data = await api.get(`/api/servers/create/${job.jobId}`);
				setJob(data);
				if (data.status === "done" || data.status === "error") {
					setSubmitting(false);
				}
			} catch {
				// transient — keep polling
			}
		}, POLL_MS);
		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [job]);

	if (userRole !== "admin") {
		return (
			<Box sx={{ mt: 4 }}>
				<Button startIcon={<ArrowBackIcon />} onClick={onBack}>
					Back to Dashboard
				</Button>
				<Typography variant="h5" color="warning.main" sx={{ mt: 2 }}>
					Access Denied: only admins can create servers.
				</Typography>
			</Box>
		);
	}

	return (
		<Box sx={{ mt: 4 }}>
			<Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>
				Back to Dashboard
			</Button>

			<Typography variant="h4" gutterBottom>
				Create a New Server
			</Typography>

			{loadError && <Alert severity="error">{loadError}</Alert>}

			{!selected ? (
				!templates ? (
					<CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />
				) : (
					<Grid container spacing={2} sx={{ mt: 1 }}>
						{templates.map((t) => (
							<Grid size={{ xs: 12, sm: 6, md: 4 }} key={t.id}>
								<Card>
									<CardActionArea onClick={() => pickTemplate(t)}>
										<CardContent>
											<Typography variant="h6">{t.displayName}</Typography>
											{t.sharedInstall && (
												<Chip
													size="small"
													label="Shared install"
													sx={{ mt: 1 }}
												/>
											)}
										</CardContent>
									</CardActionArea>
								</Card>
							</Grid>
						))}
					</Grid>
				)
			) : job ? (
				<Box sx={{ mt: 2 }}>
					<Typography variant="h6">{selected.displayName}</Typography>
					<Typography sx={{ color: grey[400], mb: 2 }}>
						Status: {job.status}
						{job.status === "installing" && " — installing via SteamCMD, this can take a while for a large game..."}
						{job.status === "configuring" && " — writing scripts and config..."}
						{job.status === "first-boot" && " — booting once to generate default config..."}
						{job.status === "resolving-mods" && " — resolving mod files via CurseForge..."}
						{job.status === "downloading-mods" && " — downloading mods, this can take a while for a large pack..."}
					</Typography>
					{job.status === "done" && (
						<>
							<Alert severity="success">
								"{job.serverName}" is ready and live on the dashboard now.
							</Alert>
							{job.warnings?.length > 0 && (
								<Alert severity="warning" sx={{ mt: 1 }}>
									{job.warnings.length} mod(s) couldn't be downloaded automatically
									(the author disabled third-party distribution) — add these
									manually: {job.warnings.map((w) => w.projectID).join(", ")}
								</Alert>
							)}
						</>
					)}
					{job.status === "error" && (
						<Alert severity="error">Creation failed: {job.error}</Alert>
					)}
					{(job.status === "done" || job.status === "error") && (
						<Button variant="contained" sx={{ mt: 2 }} onClick={onBack}>
							Back to Dashboard
						</Button>
					)}
				</Box>
			) : !suggested ? (
				<CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />
			) : (
				<Box sx={{ mt: 2, maxWidth: 500 }}>
					<Typography variant="h6" gutterBottom>
						{selected.displayName}
						{selected.sharedInstall && suggested.sharedInstallDir && (
							<Chip
								size="small"
								label="Adding to your existing cluster"
								color="info"
								sx={{ ml: 1 }}
							/>
						)}
					</Typography>

					<TextField
						fullWidth
						label="Server Name (shown on the dashboard)"
						sx={{ my: 1 }}
						value={form.name}
						onChange={(e) => setField("name", e.target.value)}
					/>

					{selected.mapChoices && (
						<TextField
							fullWidth
							select
							label="Map"
							sx={{ my: 1 }}
							value={form.mapCode}
							onChange={(e) => setField("mapCode", e.target.value)}
						>
							{selected.mapChoices.map((m) => (
								<MenuItem key={m.code} value={m.code}>
									{m.label}
								</MenuItem>
							))}
						</TextField>
					)}

					{selected.fields
						.filter((f) => f !== "mapCode")
						.map((f) => {
							const meta = selected.fieldMeta?.[f];
							const label = meta?.label || FIELD_LABELS[f] || f;

							if (meta?.type === "checkbox") {
								return (
									<FormControlLabel
										key={f}
										sx={{ my: 1, display: "flex" }}
										control={
											<Checkbox
												checked={!!form[f]}
												onChange={(e) => setField(f, e.target.checked)}
											/>
										}
										label={label}
									/>
								);
							}

							if (meta?.type === "file") {
								return (
									<ModpackUploadField
										key={f}
										label={label}
										onUploaded={(summary) => {
											setField(f, summary?.uploadId || "");
											if (summary) {
												setField("mcVersion", summary.mcVersion);
												setField("modLoaderFamily", summary.modLoaderFamily);
												setField("modLoaderVersion", summary.modLoaderVersion);
											}
										}}
									/>
								);
							}

							return (
								<TextField
									key={f}
									fullWidth
									label={label}
									sx={{ my: 1 }}
									value={form[f] ?? ""}
									onChange={(e) => setField(f, e.target.value)}
								/>
							);
						})}

					<TextField
						fullWidth
						label="Max Players (optional)"
						type="number"
						sx={{ my: 1 }}
						value={form.maxPlayers}
						onChange={(e) => setField("maxPlayers", e.target.value)}
					/>

					{selected.ports.map((p) => (
						<TextField
							key={p.key}
							fullWidth
							label={p.label}
							type="number"
							sx={{ my: 1 }}
							value={form[p.key] ?? ""}
							onChange={(e) => setField(p.key, e.target.value)}
						/>
					))}

					<PortsToOpen
						game={form.port}
						query={form.queryPort}
						rcon={form.rconPort}
						implicit={selected.implicitPorts}
						gameName={selected.displayName}
					/>

					<Dialog open={askSteamCmd} onClose={() => setAskSteamCmd(false)}>
						<DialogTitle>Download SteamCMD?</DialogTitle>
						<DialogContent>
							<DialogContentText>
								Games are installed with SteamCMD, Valve's official tool. It isn't included with
								GodlyPanel, so it will be downloaded once from Valve and kept with your data. Already
								have a copy? Cancel and point Settings at it instead.
							</DialogContentText>
						</DialogContent>
						<DialogActions>
							<Button onClick={() => setAskSteamCmd(false)}>Cancel</Button>
							<Button variant="contained" onClick={() => submit(true)}>
								Download and continue
							</Button>
						</DialogActions>
					</Dialog>

					{suggested?.sharedInstallDir ? (
						<Typography variant="body2" sx={{ color: "text.secondary", my: 1 }}>
							Adding to your existing install at {suggested.sharedInstallDir} — no new download.
						</Typography>
					) : (
						<Box sx={{ my: 2 }}>
							<FolderField
								label="Install to"
								value={form.installParent ?? ""}
								onChange={(v) => setField("installParent", v)}
								checkUrl="/api/settings/check-folder"
								checkBody={{ blankUsesConfigured: true }}
								blankMeans={suggested?.defaultInstallParent ?? "your default server folder"}
								helperText={`Blank uses ${suggested?.defaultInstallParent ?? "your default server folder"}. The server gets its own subfolder.`}
							/>
						</Box>
					)}

					{submitError && (
						<Alert severity="error" sx={{ my: 1 }}>
							{submitError}
						</Alert>
					)}

					<Box sx={{ display: "flex", gap: 2, mt: 2 }}>
						<Button
							variant="outlined"
							onClick={() => {
								setSelected(null);
								setSuggested(null);
							}}
							disabled={submitting}
						>
							Choose a different game
						</Button>
						<Button
							variant="contained"
							onClick={() => submit(false)}
							disabled={
								submitting ||
								Boolean(findPortClash(selected.implicitPorts, form)) ||
								!form.name?.trim() ||
								(selected.requiresEula && !form.eulaAccepted)
							}
						>
							{submitting ? "Creating..." : "Create Server"}
						</Button>
					</Box>
				</Box>
			)}
		</Box>
	);
}

export default CreateServerPage;
