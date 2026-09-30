import React from "react";
import { Alert, Box, Button, Chip, CircularProgress, IconButton, Paper, Switch, TextField, Tooltip, Typography } from "@mui/material";
import { Delete as DeleteIcon, UploadFile as UploadIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { formatBytes } from "../utils/format";
import { useOperation, operationLabel } from "../OperationsContext";

const ACCEPT_HINT = { ".jar": ".jar", ".pak": ".pak", ".dll": ".dll", archive: ".zip" };

/** Mods for one server. Every game takes them differently; the panel offers what this one supports. */
function ModsPanel({ serverName, serverStatus }) {
	const base = `/api/server/${encodeURIComponent(serverName)}/mods`;
	const [data, setData] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [notice, setNotice] = React.useState(null);
	const [busy, setBusy] = React.useState(false);
	const [text, setText] = React.useState("");
	const operation = useOperation(serverName);
	const fileInput = React.useRef(null);

	const load = React.useCallback(async () => {
		try {
			setData(await api.get(base));
			setError(null);
		} catch (e) {
			setError(e.message);
		}
	}, [base]);

	React.useEffect(() => {
		load();
	}, [load]);

	const run = async (fn, done) => {
		setBusy(true);
		setError(null);
		setNotice(null);
		try {
			const result = await fn();
			if (result?.installed?.length) setNotice(`Installed: ${result.installed.join(", ")}`);
			else if (done) setNotice(done);
			await load();
		} catch (e) {
			setError(e.message);
		} finally {
			setBusy(false);
		}
	};

	const upload = (file) => {
		if (!file) return;
		const form = new FormData();
		form.append("mod", file);
		run(() => api.upload(`${base}/upload`, form));
	};

	if (!data) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress size={24} />;
	if (!data.supported) {
		return <Alert severity="info">The panel doesn't manage mods for this game. Mods can still be added by hand in the server's folder.</Alert>;
	}

	const running = serverStatus?.online;
	const locked = running || busy || Boolean(operation);
	const adapter = data.adapter;
	const accepts = (data.accepts ?? []).map((a) => ACCEPT_HINT[a] ?? a);

	const add = () => {
		const value = text.trim();
		if (!value) return;
		const route = adapter === "workshop" ? "workshop" : adapter === "thunderstore" ? "thunderstore" : "script-id";
		const body = adapter === "thunderstore" ? { package: value } : { id: value };
		run(() => api.post(`${base}/${route}`, body)).then(() => setText(""));
	};

	return (
		<Box>
			{running && (
				<Alert severity="warning" sx={{ mb: 2 }}>
					Stop the server to change its mods. A game reads its mods when it starts.
				</Alert>
			)}
			{operation && !running && (
				<Alert severity="info" sx={{ mb: 2 }}>
					{operationLabel(operation)}
				</Alert>
			)}
			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}
			{notice && (
				<Alert severity="success" onClose={() => setNotice(null)} sx={{ mb: 2 }}>
					{notice}
				</Alert>
			)}

			<Paper sx={{ p: 2, mb: 2 }}>
				<Typography variant="subtitle1">{data.label}</Typography>
				{data.note && (
					<Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
						{data.note}
					</Typography>
				)}
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
					{adapter !== "script-ids" && (
						<>
							<input ref={fileInput} type="file" hidden accept={accepts.join(",")} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
							<Button variant="contained" startIcon={<UploadIcon />} disabled={locked} onClick={() => fileInput.current?.click()}>
								Add a file ({accepts.join(" / ")})
							</Button>
						</>
					)}
					{adapter !== "folder" && (
						<>
							<TextField
								size="small"
								label={adapter === "workshop" ? "Steam Workshop item number" : adapter === "thunderstore" ? "Thunderstore package (Owner-Name)" : "Mod number"}
								value={text}
								onChange={(e) => setText(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && !locked && add()}
								sx={{ minWidth: 280 }}
								disabled={locked}
							/>
							<Button variant="outlined" disabled={locked || !text.trim()} onClick={add}>
								{busy ? "Working…" : "Add"}
							</Button>
						</>
					)}
					{busy && <CircularProgress size={18} />}
				</Box>
				{adapter === "thunderstore" && !data.frameworkInstalled && (
					<Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
						BepInEx isn't installed yet. It is added automatically with the first mod.
					</Typography>
				)}
				{adapter === "workshop" && (
					<Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
						Workshop items are downloaded with SteamCMD. Some need a signed-in Steam account and can't be fetched this way.
					</Typography>
				)}
			</Paper>

			<Paper>
				<Typography variant="subtitle1" sx={{ px: 2, pt: 2 }}>
					Installed ({data.mods.length})
				</Typography>
				{data.mods.length === 0 ? (
					<Typography variant="body2" sx={{ p: 2, color: "text.secondary" }}>
						None.
					</Typography>
				) : (
					data.mods.map((m) => (
						<Box key={m.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1, borderTop: "1px solid rgba(255,255,255,0.06)", opacity: m.enabled ? 1 : 0.55 }}>
							<Box sx={{ flex: 1 }}>
								<Typography variant="body2">{m.name}</Typography>
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									{m.type === "folder" ? "folder" : m.type === "id" ? "mod number" : "file"}
									{m.sizeBytes ? ` · ${formatBytes(m.sizeBytes)}` : ""}
								</Typography>
							</Box>
							{m.missing && <Chip size="small" color="warning" label="file missing" />}
							{adapter !== "script-ids" && (
								<Tooltip title={m.enabled ? "Turn off (kept on disk)" : "Turn on"}>
									<span>
										<Switch size="small" checked={m.enabled} disabled={locked} onChange={(e) => run(() => api.put(`${base}/enabled`, { id: m.id, enabled: e.target.checked }))} />
									</span>
								</Tooltip>
							)}
							<Tooltip title="Remove">
								<span>
									<IconButton size="small" disabled={locked} onClick={() => window.confirm(`Remove ${m.name}?`) && run(() => api.post(`${base}/remove`, { id: m.id }), `Removed ${m.name}.`)}>
										<DeleteIcon fontSize="small" />
									</IconButton>
								</span>
							</Tooltip>
						</Box>
					))
				)}
			</Paper>
		</Box>
	);
}

export default ModsPanel;
