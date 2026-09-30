import React from "react";
import { Alert, Box, Button, CircularProgress, FormControlLabel, MenuItem, Paper, Switch, TextField, Typography } from "@mui/material";
import { api } from "../api/client";
import { formatBytes } from "../utils/format";

// Keep what is on screen bounded: a busy server can write thousands of lines an hour.
const MAX_LINES = 5000;
const FOLLOW_EVERY_MS = 2000;

const tone = (line) => {
	if (/\b(error|fatal|exception|critical|crash|failed)\b/i.test(line)) return "#ef5350";
	if (/\b(warn|warning)\b/i.test(line)) return "#ffb74d";
	return undefined;
};

/** A server's logs: pick one, read the end of it, follow it live, search it. */
function LogsPanel({ serverName }) {
	const base = `/api/server/${encodeURIComponent(serverName)}/logs`;
	const [sources, setSources] = React.useState(null);
	const [sourceId, setSourceId] = React.useState("");
	const [lines, setLines] = React.useState([]);
	const [offset, setOffset] = React.useState(null);
	const [follow, setFollow] = React.useState(true);
	const [count, setCount] = React.useState(300);
	const [query, setQuery] = React.useState("");
	const [searched, setSearched] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [loading, setLoading] = React.useState(false);
	const view = React.useRef(null);
	const stick = React.useRef(true);

	React.useEffect(() => {
		let alive = true;
		api
			.get(base)
			.then((list) => {
				if (!alive) return;
				setSources(list);
				setSourceId((current) => (list.some((s) => s.id === current) ? current : (list[0]?.id ?? "")));
			})
			.catch((e) => alive && setError(e.message));
		return () => {
			alive = false;
		};
	}, [base]);

	// The end of the chosen log, from scratch.
	const reload = React.useCallback(async () => {
		if (!sourceId) return;
		setLoading(true);
		setSearched(null);
		try {
			const r = await api.get(`${base}/${sourceId}?lines=${count}`);
			setLines(r.lines);
			setOffset(r.offset);
			setError(null);
			stick.current = true;
		} catch (e) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	}, [base, sourceId, count]);

	React.useEffect(() => {
		reload();
	}, [reload]);

	// Following: ask for what was added since the last look.
	React.useEffect(() => {
		if (!follow || !sourceId || offset === null || searched) return undefined;
		const timer = setInterval(async () => {
			try {
				const r = await api.get(`${base}/${sourceId}?since=${offset}`);
				if (r.reset) {
					setLines(r.lines);
				} else if (r.lines.length > 0) {
					setLines((prev) => [...prev, ...r.lines].slice(-MAX_LINES));
				}
				setOffset(r.offset);
			} catch {
				// A missed beat; the next one tries again.
			}
		}, FOLLOW_EVERY_MS);
		return () => clearInterval(timer);
	}, [follow, sourceId, offset, base, searched]);

	// Stay at the bottom while following, unless the reader has scrolled up.
	React.useEffect(() => {
		const el = view.current;
		if (el && stick.current && !searched) el.scrollTop = el.scrollHeight;
	}, [lines, searched]);

	const onScroll = () => {
		const el = view.current;
		if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
	};

	const search = async () => {
		const term = query.trim();
		if (!term) return setSearched(null);
		setLoading(true);
		try {
			setSearched(await api.get(`${base}/${sourceId}?search=${encodeURIComponent(term)}`));
			setError(null);
		} catch (e) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	};

	if (!sources) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress size={24} />;
	if (sources.length === 0) {
		return (
			<Alert severity="info">
				No log files were found for this server. Games write their logs once they have run; some only print to their console. If the server is set to run with no window, the panel keeps what it prints and it appears here.
			</Alert>
		);
	}

	const shown = searched ? searched.lines : lines;
	const current = sources.find((s) => s.id === sourceId);

	return (
		<Box>
			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}
			<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 1.5 }}>
				<TextField select size="small" label="Log" value={sourceId} onChange={(e) => setSourceId(e.target.value)} sx={{ minWidth: 280 }}>
					{sources.map((s) => (
						<MenuItem key={s.id} value={s.id}>
							{s.name} · {s.label} · {formatBytes(s.size)}
						</MenuItem>
					))}
				</TextField>
				<TextField select size="small" label="Lines" value={count} onChange={(e) => setCount(Number(e.target.value))} sx={{ width: 110 }}>
					{[100, 300, 1000, 2000].map((n) => (
						<MenuItem key={n} value={n}>
							{n}
						</MenuItem>
					))}
				</TextField>
				<FormControlLabel control={<Switch checked={follow && !searched} disabled={Boolean(searched)} onChange={(e) => setFollow(e.target.checked)} />} label="Follow live" />
				<Button size="small" onClick={reload} disabled={loading}>
					Refresh
				</Button>
				<Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
					<TextField
						size="small"
						label="Search this log"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && search()}
						sx={{ width: 240 }}
					/>
					<Button size="small" variant="outlined" onClick={search} disabled={loading || !query.trim()}>
						Search
					</Button>
					{searched && (
						<Button size="small" onClick={() => { setSearched(null); setQuery(""); }}>
							Clear
						</Button>
					)}
				</Box>
			</Box>

			{searched && (
				<Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary" }}>
					{searched.lines.length} matching line{searched.lines.length === 1 ? "" : "s"}
					{searched.partial ? ` (searched the last ${formatBytes(searched.searchedBytes)})` : ""}
				</Typography>
			)}

			<Paper
				ref={view}
				onScroll={onScroll}
				sx={{ p: 1.5, height: 520, overflow: "auto", bgcolor: "#121212", fontFamily: "Consolas, monospace", fontSize: 12.5, lineHeight: 1.5 }}
			>
				{loading && shown.length === 0 ? (
					<CircularProgress size={20} />
				) : shown.length === 0 ? (
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{searched ? "Nothing matched." : "This log is empty."}
					</Typography>
				) : (
					shown.map((line, i) => (
						<Box key={i} component="div" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: tone(line) }}>
							{line || " "}
						</Box>
					))
				)}
			</Paper>
			{current && (
				<Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "text.secondary" }}>
					Last written {new Date(current.modified).toLocaleString()}. Anything that looks like a password is hidden unless you are an administrator.
				</Typography>
			)}
		</Box>
	);
}

export default LogsPanel;
