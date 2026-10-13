import React from "react";
import { Alert, Box, Button, Chip, CircularProgress, MenuItem, Paper, TextField, Typography, alpha } from "@mui/material";
import { api } from "../api/client";
import { diffLines, summarise } from "../utils/lineDiff";
import { useToast } from "../ToastContext";
import ConfirmDialog from "./ui/ConfirmDialog";
import TipRow from "./TipRow";

const when = (iso) => new Date(iso).toLocaleString();
const kb = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

/** Every version of a settings or start-script file the panel wrote: compare them, and put one back. */
function ConfigHistoryPanel({ serverName, serverStatus }) {
	const base = `/api/server/${encodeURIComponent(serverName)}/history`;
	const toast = useToast();
	const [files, setFiles] = React.useState(null);
	const [file, setFile] = React.useState("");
	const [versions, setVersions] = React.useState([]);
	const [picked, setPicked] = React.useState(null); // a version
	const [against, setAgainst] = React.useState("previous");
	const [texts, setTexts] = React.useState({});
	const [error, setError] = React.useState(null);
	const [restoring, setRestoring] = React.useState(null); // the version being asked about
	const [restoreOpen, setRestoreOpen] = React.useState(false);
	const running = Boolean(serverStatus?.online);

	React.useEffect(() => {
		let alive = true;
		// Another server has other files: forget the file chosen on the last one.
		setFiles(null);
		setFile("");
		setVersions([]);
		setPicked(null);
		setTexts({});
		setError(null);
		api
			.get(base)
			.then((list) => {
				if (!alive) return;
				const all = Array.isArray(list) ? list : [];
				setFiles(all);
				setFile(all.find((f) => f.versions > 0)?.key || all[0]?.key || "");
			})
			.catch((e) => alive && setError(e.message));
		return () => {
			alive = false;
		};
	}, [base]);

	const loadVersions = React.useCallback(async () => {
		if (!file) return;
		try {
			const list = await api.get(`${base}/${encodeURIComponent(file)}`);
			if (!Array.isArray(list)) return;
			setVersions(list);
			setPicked((p) => (p && list.some((v) => v.id === p.id) ? p : (list[0] ?? null)));
			setTexts({});
		} catch (e) {
			setError(e.message);
		}
	}, [base, file]);

	React.useEffect(() => {
		loadVersions();
	}, [loadVersions]);

	const text = React.useCallback(
		async (id) => {
			if (texts[id] !== undefined) return texts[id];
			const { content } = await api.get(`${base}/${encodeURIComponent(file)}/${id}`);
			setTexts((t) => ({ ...t, [id]: content }));
			return content;
		},
		[base, file, texts],
	);

	// The two texts the comparison is between.
	const [pair, setPair] = React.useState(null);
	React.useEffect(() => {
		let alive = true;
		(async () => {
			if (!picked) return setPair(null);
			const index = versions.findIndex((v) => v.id === picked.id);
			const other = against === "current" ? versions[0] : versions[index + 1];
			const after = await text(picked.id);
			const before = other ? await text(other.id) : "";
			if (alive) setPair({ before, after, hasOther: Boolean(other), otherIsPicked: other?.id === picked.id });
		})().catch((e) => alive && setError(e.message));
		return () => {
			alive = false;
		};
	}, [picked, against, versions, text]);

	const diff = pair ? diffLines(pair.before, pair.after) : [];
	const counts = summarise(diff);

	const restore = async (v) => {
		setRestoreOpen(false);
		try {
			await api.post(`${base}/${encodeURIComponent(file)}/${v.id}/restore`, {});
			toast("Restored. The change is in the history too.");
			loadVersions();
		} catch (e) {
			setError(e.message);
		}
	};

	if (!files) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress size={24} />;
	if (files.length === 0) return <Alert severity="info">This server has no settings files or start script to keep a history of.</Alert>;

	return (
		<Box>
			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}
			<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 2 }}>
				<TipRow id="server.history.file" sx={{ flex: "1 1 240px", maxWidth: 360 }}>
					<TextField select fullWidth size="small" label="File" value={file} onChange={(e) => setFile(e.target.value)}>
						{files.map((f) => (
							<MenuItem key={f.key} value={f.key}>
								{f.key} ({f.versions} version{f.versions === 1 ? "" : "s"})
							</MenuItem>
						))}
					</TextField>
				</TipRow>
				<TipRow id="server.history.compare" sx={{ flex: "1 1 200px", maxWidth: 260 }}>
					<TextField select fullWidth size="small" label="Compare with" value={against} onChange={(e) => setAgainst(e.target.value)}>
						<MenuItem value="previous">the version before it</MenuItem>
						<MenuItem value="current">the current version</MenuItem>
					</TextField>
				</TipRow>
				{running && <Chip size="small" color="warning" label="Stop the server to restore a version" />}
			</Box>

			{versions.length === 0 ? (
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					Nothing is recorded for this file yet. The next change made through the panel will be kept here.
				</Typography>
			) : (
				<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
					<Paper variant="outlined" sx={{ flex: "1 1 280px", maxHeight: 520, overflow: "auto" }}>
						{versions.map((v, i) => (
							<Box
								key={v.id}
								onClick={() => setPicked(v)}
								sx={{
									px: 2,
									py: 1,
									cursor: "pointer",
									borderTop: i === 0 ? 0 : 1,
									borderColor: "divider",
									bgcolor: picked?.id === v.id ? (t) => alpha(t.palette.primary.main, 0.14) : undefined,
									"&:hover": { bgcolor: picked?.id === v.id ? undefined : (t) => t.custom.hover },
								}}
							>
								<Typography variant="body2">{when(v.at)}{i === 0 ? " (current)" : ""}</Typography>
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									{v.source} · {kb(v.bytes)}
								</Typography>
							</Box>
						))}
					</Paper>

					<Paper variant="outlined" sx={{ flex: "3 1 420px", p: 1.5, minWidth: 0 }}>
						{picked && (
							<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1, flexWrap: "wrap" }}>
								<Typography variant="subtitle2" sx={{ flex: 1 }}>
									{when(picked.at)} · {picked.source}
								</Typography>
								{pair?.hasOther && !pair.otherIsPicked && (
									<Typography variant="caption" sx={{ color: "text.secondary" }}>
										<Box component="span" sx={{ color: "success.main" }}>+{counts.added}</Box> <Box component="span" sx={{ color: "error.main" }}>−{counts.removed}</Box> lines
									</Typography>
								)}
								<TipRow id="server.history.restore">
									<Button
										size="small"
										variant="outlined"
										disabled={running || picked.id === versions[0]?.id}
										onClick={() => {
											setRestoring(picked);
											setRestoreOpen(true);
										}}
									>
										Restore this version
									</Button>
								</TipRow>
							</Box>
						)}
						<Box
							sx={{
								fontFamily: (t) => t.custom.mono,
								fontSize: 12.5,
								lineHeight: 1.5,
								maxHeight: 460,
								overflow: "auto",
								bgcolor: "background.default",
								border: 1,
								borderColor: "divider",
								p: 1,
								borderRadius: 2,
								"& .gp-diff-add": { bgcolor: (t) => alpha(t.palette.success.main, 0.18) },
								"& .gp-diff-del": { bgcolor: (t) => alpha(t.palette.error.main, 0.18) },
								"& .gp-diff-same": { color: "text.secondary" },
							}}
						>
							{!pair ? (
								<CircularProgress size={18} />
							) : !pair.hasOther ? (
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									This is the oldest version kept. Its full text:
								</Typography>
							) : null}
							{pair && (!pair.hasOther
								? pair.after.split(/\r?\n/).map((line, i) => (
										<div key={i} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
											{line || " "}
										</div>
									))
								: diff.map((d, i) => (
										<div key={i} className={`gp-diff-${d.type}`} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
											{d.type === "add" ? "+ " : d.type === "del" ? "− " : "  "}
											{d.text || " "}
										</div>
									)))}
						</Box>
					</Paper>
				</Box>
			)}

			<ConfirmDialog
				open={restoreOpen && Boolean(restoring)}
				title="Put back this version?"
				confirmLabel="Restore it"
				onConfirm={() => restore(restoring)}
				onClose={() => setRestoreOpen(false)}
			>
				{restoring && `The version from ${when(restoring.at)} replaces the file. The current one stays in the history.`}
			</ConfirmDialog>
		</Box>
	);
}

export default ConfigHistoryPanel;
