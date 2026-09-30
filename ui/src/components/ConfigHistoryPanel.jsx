import React from "react";
import { Alert, Box, Button, Chip, CircularProgress, MenuItem, Paper, TextField, Typography } from "@mui/material";
import { api } from "../api/client";
import { diffLines, summarise } from "../utils/lineDiff";

const when = (iso) => new Date(iso).toLocaleString();
const kb = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

/** Every version of a settings or start-script file the panel wrote: compare them, and put one back. */
function ConfigHistoryPanel({ serverName, serverStatus }) {
	const base = `/api/server/${encodeURIComponent(serverName)}/history`;
	const [files, setFiles] = React.useState(null);
	const [file, setFile] = React.useState("");
	const [versions, setVersions] = React.useState([]);
	const [picked, setPicked] = React.useState(null); // a version
	const [against, setAgainst] = React.useState("previous");
	const [texts, setTexts] = React.useState({});
	const [error, setError] = React.useState(null);
	const [notice, setNotice] = React.useState(null);
	const running = Boolean(serverStatus?.online);

	React.useEffect(() => {
		api
			.get(base)
			.then((list) => {
				setFiles(list);
				setFile((current) => current || list.find((f) => f.versions > 0)?.key || list[0]?.key || "");
			})
			.catch((e) => setError(e.message));
	}, [base]);

	const loadVersions = React.useCallback(async () => {
		if (!file) return;
		try {
			const list = await api.get(`${base}/${encodeURIComponent(file)}`);
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
		if (!window.confirm(`Put back the version from ${when(v.at)}? The file is replaced; the current one stays in the history.`)) return;
		try {
			await api.post(`${base}/${encodeURIComponent(file)}/${v.id}/restore`, {});
			setNotice("Restored. The change is in the history too.");
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
			{notice && (
				<Alert severity="success" onClose={() => setNotice(null)} sx={{ mb: 2 }}>
					{notice}
				</Alert>
			)}
			<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 2 }}>
				<TextField select size="small" label="File" value={file} onChange={(e) => setFile(e.target.value)} sx={{ minWidth: 260 }}>
					{files.map((f) => (
						<MenuItem key={f.key} value={f.key}>
							{f.key} ({f.versions} version{f.versions === 1 ? "" : "s"})
						</MenuItem>
					))}
				</TextField>
				<TextField select size="small" label="Compare with" value={against} onChange={(e) => setAgainst(e.target.value)} sx={{ width: 220 }}>
					<MenuItem value="previous">the version before it</MenuItem>
					<MenuItem value="current">the current version</MenuItem>
				</TextField>
				{running && <Chip size="small" color="warning" label="Stop the server to restore a version" />}
			</Box>

			{versions.length === 0 ? (
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					Nothing is recorded for this file yet. Every change made through the panel (the settings editor, ports, presets, mods, the start-script editor) is kept here, starting with the next one.
				</Typography>
			) : (
				<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
					<Paper sx={{ flex: "1 1 280px", maxHeight: 520, overflow: "auto" }}>
						{versions.map((v, i) => (
							<Box
								key={v.id}
								onClick={() => setPicked(v)}
								sx={{ px: 2, py: 1, cursor: "pointer", borderTop: i === 0 ? 0 : (t) => `1px solid ${t.palette.divider}`, bgcolor: picked?.id === v.id ? "rgba(255,255,255,0.08)" : undefined, "&:hover": { bgcolor: "rgba(255,255,255,0.05)" } }}
							>
								<Typography variant="body2">{when(v.at)}{i === 0 ? " (current)" : ""}</Typography>
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									{v.source} · {kb(v.bytes)}
								</Typography>
							</Box>
						))}
					</Paper>

					<Paper sx={{ flex: "3 1 420px", p: 1.5 }}>
						{picked && (
							<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1, flexWrap: "wrap" }}>
								<Typography variant="subtitle2" sx={{ flex: 1 }}>
									{when(picked.at)} · {picked.source}
								</Typography>
								{pair?.hasOther && !pair.otherIsPicked && (
									<Typography variant="caption" sx={{ color: "text.secondary" }}>
										<span style={{ color: "#66bb6a" }}>+{counts.added}</span> <span style={{ color: "#ef5350" }}>−{counts.removed}</span> lines
									</Typography>
								)}
								<Button size="small" variant="outlined" disabled={running || picked.id === versions[0]?.id} onClick={() => restore(picked)}>
									Restore this version
								</Button>
							</Box>
						)}
						<Box sx={{ fontFamily: "Consolas, monospace", fontSize: 12.5, lineHeight: 1.5, maxHeight: 460, overflow: "auto", bgcolor: "#121212", p: 1, borderRadius: 1 }}>
							{!pair ? (
								<CircularProgress size={18} />
							) : !pair.hasOther ? (
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									This is the oldest version kept. Its full text:
								</Typography>
							) : null}
							{pair && (!pair.hasOther
								? pair.after.split(/\r?\n/).map((line, i) => (
										<div key={i} style={{ whiteSpace: "pre-wrap" }}>
											{line || " "}
										</div>
									))
								: diff.map((d, i) => (
										<div key={i} style={{ whiteSpace: "pre-wrap", background: d.type === "add" ? "rgba(102,187,106,0.18)" : d.type === "del" ? "rgba(239,83,80,0.18)" : undefined, color: d.type === "same" ? "#9e9e9e" : undefined }}>
											{d.type === "add" ? "+ " : d.type === "del" ? "− " : "  "}
											{d.text || " "}
										</div>
									)))}
						</Box>
					</Paper>
				</Box>
			)}
		</Box>
	);
}

export default ConfigHistoryPanel;
