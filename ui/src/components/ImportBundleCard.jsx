import React from "react";
import { Alert, Box, Button, CircularProgress, LinearProgress, TextField, Typography } from "@mui/material";
import { Input as ImportIcon, UploadFile as UploadFileIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { onLive } from "../liveEvents";
import {
	SECRETS_NOTE,
	bundleSummary,
	importErrorText,
	importPhaseText,
	importSummary,
	isImporting,
	mergeImportEvent,
	planNotes,
	portProblems,
} from "../utils/migrate";
import SectionCard from "./ui/SectionCard";

// A port's name in plain words: "port" is the game port, "queryPort" is the query port.
function portLabel(key) {
	const words = key.replace(/port$/i, "").replace(/([A-Z])/g, " $1").trim().toLowerCase();
	return `${words ? words.charAt(0).toUpperCase() + words.slice(1) : "Game"} port`;
}

const isPort = (v) => Number.isInteger(v) && v >= 1 && v <= 65535;

/** Brings a server over from another PC: choose its file, check what is in it, then import it as a new server. Only admins reach this, since the create page is admin-only. */
function ImportBundleCard({ onOpen }) {
	const fileRef = React.useRef(null);
	const [pathText, setPathText] = React.useState("");
	const [uploading, setUploading] = React.useState(false);
	const [planning, setPlanning] = React.useState(false);
	const [planError, setPlanError] = React.useState(null);
	const [plan, setPlan] = React.useState(null);
	const [name, setName] = React.useState("");
	const [ports, setPorts] = React.useState({});
	const [starting, setStarting] = React.useState(false);
	const [startError, setStartError] = React.useState(null);
	const [job, setJob] = React.useState(null);

	const importing = isImporting(job);
	const jobId = job?.id;

	// While the import runs, take its progress from the live stream and check on it every 3 seconds in case the stream misses one.
	React.useEffect(() => {
		if (!jobId || !importing) return undefined;
		const poll = async () => {
			try {
				const fresh = await api.get(`/api/import-jobs/${jobId}`);
				setJob((j) => (j?.id === jobId ? { ...j, ...fresh } : j));
			} catch {
				// Try again next beat.
			}
		};
		const off = onLive("import_progress", (e) => setJob((j) => mergeImportEvent(j, e)));
		const timer = setInterval(poll, 3000);
		return () => {
			off();
			clearInterval(timer);
		};
	}, [jobId, importing]);

	// Asks the server what is in the file. The name and ports start from what it suggests, and the person can change them.
	const readPlan = async (body) => {
		setPlan(null);
		setPlanError(null);
		setStartError(null);
		setJob(null);
		setPlanning(true);
		try {
			const p = await api.post("/api/import/plan", body);
			setPlan(p ?? null);
			setName(typeof p?.name === "string" ? p.name : "");
			setPorts(p?.ports && typeof p.ports === "object" ? { ...p.ports } : {});
		} catch (e) {
			setPlanError(importErrorText(e.code, e.message));
		} finally {
			setPlanning(false);
		}
	};

	const chooseFile = async (file) => {
		if (!file) return;
		setUploading(true);
		setPlanError(null);
		try {
			const formData = new FormData();
			formData.append("bundleFile", file);
			const up = await api.upload("/api/uploads/bundle", formData);
			setUploading(false);
			await readPlan({ uploadId: up?.uploadId });
		} catch (e) {
			setPlanError(importErrorText(e.code, e.message));
		} finally {
			setUploading(false);
		}
	};

	const checkPath = () => readPlan({ path: pathText.trim() });

	// Starts the import with the file the plan came from. The job is then followed until it is ready or failed.
	const startImport = async () => {
		setStarting(true);
		setStartError(null);
		try {
			setJob(await api.post("/api/import", { ...plan.source, name: name.trim(), ports }));
		} catch (e) {
			setStartError(importErrorText(e.code, e.message));
		} finally {
			setStarting(false);
		}
	};

	// Clears the plan so the person can start again. An uploaded file is not deleted here; the server lets it expire.
	const reset = () => {
		setJob(null);
		setPlan(null);
		setPlanError(null);
		setStartError(null);
		setName("");
		setPorts({});
	};

	const notes = planNotes(plan);
	// The passwords note and the warnings from the file are shown as warnings. The rest are information.
	const planWarnings = Array.isArray(plan?.warnings) ? plan.warnings.filter((w) => typeof w === "string").map((w) => w.trim()) : [];
	const severityOf = (note) => (note === SECRETS_NOTE || planWarnings.includes(note) ? "warning" : "info");
	const problems = portProblems(ports);
	const busy = uploading || planning || starting;
	const jobWarnings = Array.isArray(job?.warnings) ? job.warnings.filter((w) => typeof w === "string" && w.trim() !== "") : [];

	return (
		<SectionCard title="Import a server file" subtitle="Bring a server over from another PC" icon={<ImportIcon />}>
			<Typography variant="caption" sx={{ display: "block", color: "warning.main", mb: 2 }}>
				Only import files you trust. A server file contains a start script that will run on this PC.
			</Typography>

			{!plan && !job && (
				<>
					<Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
						<input
							ref={fileRef}
							type="file"
							accept=".gpserver"
							hidden
							onChange={(e) => {
								chooseFile(e.target.files?.[0]);
								// Cleared so that the same file can be picked again after a cancel.
								e.target.value = "";
							}}
						/>
						<Button
							variant="outlined"
							startIcon={uploading ? <CircularProgress size={16} /> : <UploadFileIcon />}
							onClick={() => fileRef.current?.click()}
							disabled={busy}
						>
							{uploading ? "Uploading..." : "Choose file"}
						</Button>
					</Box>

					<Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "flex-start", mt: 2 }}>
						<TextField
							size="small"
							label="Or the full path of a file on this PC"
							value={pathText}
							onChange={(e) => setPathText(e.target.value)}
							disabled={busy}
							sx={{ flex: 1, minWidth: 240 }}
						/>
						<Button variant="outlined" onClick={checkPath} disabled={busy || pathText.trim() === ""}>
							Check file
						</Button>
					</Box>

					{planning && (
						<Box sx={{ mt: 2 }}>
							<Typography variant="body2">Checking the file…</Typography>
							<LinearProgress sx={{ mt: 1 }} />
						</Box>
					)}
					{planError && (
						<Alert severity="error" sx={{ mt: 2 }}>
							{planError}
						</Alert>
					)}
				</>
			)}

			{plan && !job && (
				<Box>
					<Typography variant="body1" sx={{ fontWeight: 600 }}>
						{bundleSummary(plan)}
					</Typography>

					{notes.length > 0 && (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1.5 }}>
							{notes.map((note) => (
								<Alert key={note} severity={severityOf(note)}>
									{note}
								</Alert>
							))}
						</Box>
					)}

					<TextField fullWidth label="Server name" value={name} onChange={(e) => setName(e.target.value)} sx={{ mt: 2.5 }} />

					{Object.keys(ports).length > 0 && (
						<>
							<Typography variant="body2" sx={{ mt: 2.5, mb: 1 }}>
								Network ports. The panel picked free ones. Change them only if you need to.
							</Typography>
							<Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(170px, 1fr))" }, gap: 2 }}>
								{Object.keys(ports).map((key) => (
									<TextField
										key={key}
										fullWidth
										size="small"
										label={portLabel(key)}
										type="number"
										value={ports[key] ?? ""}
										error={!isPort(ports[key])}
										onChange={(e) => setPorts((p) => ({ ...p, [key]: e.target.value === "" ? "" : Number(e.target.value) }))}
										slotProps={{ htmlInput: { min: 1, max: 65535 } }}
									/>
								))}
							</Box>
							{problems.map((text) => (
								<Typography key={text} variant="caption" sx={{ display: "block", color: "error.main", mt: 1 }}>
									{text}
								</Typography>
							))}
						</>
					)}

					{startError && (
						<Alert severity="error" sx={{ mt: 2 }}>
							{startError}
						</Alert>
					)}

					<Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 2.5 }}>
						<Button
							variant="contained"
							onClick={startImport}
							disabled={starting || importing || problems.length > 0 || name.trim() === ""}
						>
							{starting ? "Starting..." : "Import server"}
						</Button>
						<Button variant="outlined" onClick={reset} disabled={starting}>
							Cancel
						</Button>
					</Box>
				</Box>
			)}

			{job && (
				<Box>
					{importing && (
						<>
							<Typography variant="body2">{importPhaseText(job)}</Typography>
							<LinearProgress sx={{ mt: 1 }} />
						</>
					)}
					{job.status === "ready" && (
						<Alert
							severity="success"
							action={
								job.server ? (
									<Button color="inherit" size="small" onClick={() => onOpen?.(job.server)}>
										Open {job.server}
									</Button>
								) : undefined
							}
						>
							{importSummary(job)}
						</Alert>
					)}
					{job.status === "ready" && jobWarnings.length > 0 && (
						<Alert severity="warning" sx={{ mt: 1 }}>
							{jobWarnings.map((w, i) => (
								<Typography key={i} variant="body2">
									{w.trim()}
								</Typography>
							))}
						</Alert>
					)}
					{job.status === "failed" && <Alert severity="error">{importSummary(job)}</Alert>}
					{!importing && (
						<Button variant="outlined" onClick={reset} sx={{ mt: 2 }}>
							Import another file
						</Button>
					)}
				</Box>
			)}
		</SectionCard>
	);
}

export default ImportBundleCard;
