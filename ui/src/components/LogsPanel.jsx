import React from "react";
import { Alert, Box, Button, CircularProgress, FormControlLabel, MenuItem, Switch, TextField, Typography } from "@mui/material";
import { Article as LogIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { t, tn, useT, formatDate, errorText } from "../i18n";
import { formatBytes } from "../utils/format";
import SectionCard from "./ui/SectionCard";
import TipRow from "./TipRow";

// Keep what is on screen bounded: a busy server can write thousands of lines an hour.
const MAX_LINES = 5000;
const FOLLOW_EVERY_MS = 2000;

// The colour comes from a class on the line (set up once on the viewer) rather than a style per line: there can be thousands.
const toneClass = (line) => {
	if (/\b(error|fatal|exception|critical|crash|failed)\b/i.test(line)) return "gp-log-error";
	if (/\b(warn|warning)\b/i.test(line)) return "gp-log-warn";
	return undefined;
};

/** A server's logs: pick one, read the end of it, follow it live, search it. */
function LogsPanel({ serverName }) {
	// Re-renders this panel when the language changes, so the t() text below switches with it.
	useT();
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
	// A reply that arrives after the person has moved to another server must not be shown on that server's page.
	const current = React.useRef(base);
	current.current = base;

	React.useEffect(() => {
		let alive = true;
		setSources(null);
		setSourceId("");
		setLines([]);
		setOffset(null);
		setSearched(null);
		setQuery("");
		setError(null);
		api
			.get(base)
			.then((list) => {
				if (!alive) return;
				const all = Array.isArray(list) ? list : [];
				setSources(all);
				setSourceId((existing) => (all.some((s) => s.id === existing) ? existing : (all[0]?.id ?? "")));
			})
			.catch((e) => alive && setError(errorText(e)));
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
			if (current.current !== base) return;
			setLines(r.lines ?? []);
			setOffset(r.offset);
			setError(null);
			stick.current = true;
		} catch (e) {
			if (current.current === base) setError(errorText(e));
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
				if (current.current !== base) return;
				const added = r.lines ?? [];
				if (r.reset) {
					setLines(added);
				} else if (added.length > 0) {
					setLines((prev) => [...prev, ...added].slice(-MAX_LINES));
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
			const found = await api.get(`${base}/${sourceId}?search=${encodeURIComponent(term)}`);
			if (current.current !== base) return;
			setSearched({ ...found, lines: found.lines ?? [] });
			setError(null);
		} catch (e) {
			if (current.current === base) setError(errorText(e));
		} finally {
			setLoading(false);
		}
	};

	if (!sources) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress size={24} />;
	if (sources.length === 0) {
		return <Alert severity="info">{t("logs.noFiles")}</Alert>;
	}

	const shown = searched ? searched.lines : lines;
	const selected = sources.find((s) => s.id === sourceId);

	return (
		<Box>
			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}
			<SectionCard
				title={t("logs.title")}
				icon={<LogIcon />}
				subtitle={selected?.modified ? t("logs.lastWritten", { when: formatDate(selected.modified) }) : undefined}
			>
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 1.5 }}>
					<TipRow id="server.logs.source" sx={{ flex: "1 1 260px", maxWidth: 420 }}>
						<TextField select fullWidth size="small" label={t("logs.log")} value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
							{sources.map((s) => (
								<MenuItem key={s.id} value={s.id}>
									{s.name} · {s.label} · {formatBytes(s.size)}
								</MenuItem>
							))}
						</TextField>
					</TipRow>
					<TipRow id="server.logs.lines">
						<TextField select size="small" label={t("logs.lines")} value={count} onChange={(e) => setCount(Number(e.target.value))} sx={{ width: 110 }}>
							{[100, 300, 1000, 2000].map((n) => (
								<MenuItem key={n} value={n}>
									{n}
								</MenuItem>
							))}
						</TextField>
					</TipRow>
					<TipRow id="server.logs.follow">
						<FormControlLabel control={<Switch checked={follow && !searched} disabled={Boolean(searched)} onChange={(e) => setFollow(e.target.checked)} />} label={t("logs.followLive")} />
					</TipRow>
					<Button size="small" onClick={reload} disabled={loading}>
						{t("common.refresh")}
					</Button>
					<Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", ml: { sm: "auto" } }}>
						<TipRow id="server.logs.search">
							<TextField
								size="small"
								label={t("logs.searchThis")}
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && search()}
								sx={{ width: { xs: 200, sm: 240 } }}
							/>
						</TipRow>
						<Button size="small" variant="outlined" onClick={search} disabled={loading || !query.trim()}>
							{t("common.search")}
						</Button>
						{searched && (
							<Button
								size="small"
								onClick={() => {
									setSearched(null);
									setQuery("");
								}}
							>
								{t("common.clear")}
							</Button>
						)}
					</Box>
				</Box>

				{searched && (
					<Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary" }}>
						{tn("logs.matches", searched.lines.length)}
						{searched.partial ? ` ${t("logs.searchedLast", { size: formatBytes(searched.searchedBytes) })}` : ""}
					</Typography>
				)}

				<Box
					ref={view}
					onScroll={onScroll}
					role="log"
					aria-label={t("logs.logLines")}
					data-testid="log-view"
					sx={{
						p: 1.5,
						height: { xs: 360, sm: 520 },
						overflow: "auto",
						bgcolor: "background.default",
						border: 1,
						borderColor: "divider",
						borderRadius: 2,
						fontFamily: (t) => t.custom.mono,
						fontSize: 12.5,
						lineHeight: 1.5,
						"& .gp-log-error": { color: "error.main" },
						"& .gp-log-warn": { color: "warning.main" },
					}}
				>
					{loading && shown.length === 0 ? (
						<CircularProgress size={20} />
					) : shown.length === 0 ? (
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							{searched ? t("logs.nothingMatched") : t("logs.empty")}
						</Typography>
					) : (
						shown.map((line, i) => {
							const text = typeof line === "string" ? line : String(line ?? "");
							return (
								<div key={i} className={toneClass(text)} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
									{text || " "}
								</div>
							);
						})
					)}
				</Box>
			</SectionCard>
		</Box>
	);
}

export default LogsPanel;
