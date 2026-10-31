import React from "react";
import { Alert, Box, Button, Checkbox, FormControlLabel, LinearProgress, Radio, RadioGroup, Typography } from "@mui/material";
import { Output as ExportIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { onLive } from "../liveEvents";
import { exportChoicesFor, exportDownloadUrl, exportSummary, isWorking, mergeEvent, phaseText, secretsWarning } from "../utils/migrate";
import SectionCard from "./ui/SectionCard";

/** Packs this server into one file so it can be set up on another PC. The server has to be stopped first. */
function ExportBundleCard({ serverName, running, canSaves = true }) {
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const choices = exportChoicesFor(canSaves);
	const [include, setInclude] = React.useState("saves");
	const [secrets, setSecrets] = React.useState(false);
	const [job, setJob] = React.useState(null);
	const [downloaded, setDownloaded] = React.useState(false);
	const [startError, setStartError] = React.useState(null);

	// Another server's page starts with a blank card.
	React.useEffect(() => {
		setInclude("saves");
		setSecrets(false);
		setJob(null);
		setDownloaded(false);
		setStartError(null);
	}, [serverName]);

	// If the choice is no longer on offer (saves not supported), fall back to the first one that is.
	const choice = choices.some((c) => c.value === include) ? include : choices[0].value;
	const working = isWorking(job);
	const jobId = job?.id;

	// While the export runs, take its progress from the live stream and check on it every 3 seconds in case the stream misses one.
	React.useEffect(() => {
		if (!jobId || !working) return undefined;
		const poll = async () => {
			try {
				const fresh = await api.get(`/api/export-jobs/${jobId}`);
				setJob((j) => (j?.id === jobId ? { ...j, ...fresh } : j));
			} catch {
				// Try again next beat.
			}
		};
		const off = onLive("export_progress", (e) => setJob((j) => mergeEvent(j, e)));
		const timer = setInterval(poll, 3000);
		return () => {
			off();
			clearInterval(timer);
		};
	}, [jobId, working]);

	const start = async () => {
		setStartError(null);
		setDownloaded(false);
		try {
			setJob(await api.post(`${base}/export`, { include: choice, secrets }));
		} catch (e) {
			setStartError(e.message);
		}
	};

	const summary = exportSummary(job);

	return (
		<SectionCard title="Move to another PC" subtitle="Export this server as one file" icon={<ExportIcon />}>
			<RadioGroup value={choice} onChange={(e) => setInclude(e.target.value)} aria-label="What to include">
				{choices.map((c) => (
					<FormControlLabel
						key={c.value}
						value={c.value}
						disabled={working}
						control={<Radio size="small" />}
						sx={{ alignItems: "flex-start", mb: 1 }}
						label={
							<Box>
								<Typography variant="body2">{c.label}</Typography>
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									{c.hint}
								</Typography>
							</Box>
						}
					/>
				))}
			</RadioGroup>

			<FormControlLabel
				control={<Checkbox checked={secrets} onChange={(e) => setSecrets(e.target.checked)} disabled={working} />}
				label="Include passwords"
			/>
			<Typography variant="caption" sx={{ display: "block", color: secrets ? "warning.main" : "text.secondary", mb: 1.5 }}>
				{secretsWarning(secrets)}
			</Typography>

			<Button variant="outlined" disabled={working || running} onClick={start}>
				Export {serverName}
			</Button>
			{running && (
				<Typography variant="caption" sx={{ color: "warning.main", display: "block", mt: 0.5 }}>
					Stop the server first.
				</Typography>
			)}
			{startError && (
				<Alert severity="error" sx={{ mt: 2 }}>
					{startError}
				</Alert>
			)}

			{job && (
				<Box sx={{ mt: 2 }}>
					{working && (
						<>
							<Typography variant="body2">{phaseText(job)}</Typography>
							<LinearProgress sx={{ mt: 1 }} />
						</>
					)}
					{job.status === "ready" && !downloaded && (
						<Alert
							severity="success"
							action={
								// The file can only be downloaded once, so the button goes as soon as it is clicked.
								<Button color="inherit" size="small" href={exportDownloadUrl(job.id)} download onClick={() => setDownloaded(true)}>
									Download
								</Button>
							}
						>
							{summary}
						</Alert>
					)}
					{job.status === "ready" && downloaded && <Alert severity="success">Downloaded. The temporary copy was removed.</Alert>}
					{job.status === "failed" && <Alert severity="error">{summary || "The export failed."}</Alert>}
				</Box>
			)}

			<Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 2 }}>
				To use it: on the other PC open GodlyPanel, choose Create server, then Import a server file. Only open files you trust: a bundle contains
				a start script that will run on that PC.
			</Typography>
		</SectionCard>
	);
}

export default ExportBundleCard;
