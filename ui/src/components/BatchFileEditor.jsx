import React from "react";
import { Alert, Box, Button, Chip, Skeleton, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ArrowBack as ArrowBackIcon, Restore as RevertIcon, Save as SaveIcon, Terminal as ScriptIcon } from "@mui/icons-material";
import ConfirmDialog from "./ui/ConfirmDialog";
import EmptyState from "./ui/EmptyState";
import { flatWhenDisabled } from "./cardStyles";
import { useToast } from "../ToastContext";
import { api } from "../api/client";
import { t, tn, useT, formatNumber, errorText } from "../i18n";

// Both the text area and the line numbers beside it use these, so every number sits level with its line.
const LINE_HEIGHT = 22;
const PAD = 12;

/**
 * The raw start script of one server, in a plain code editor. Windows scripts end their lines with CR+LF; a text area hands back
 * LF only, so the original line ending is remembered and put back on save (a script with bare LF can misbehave in cmd.exe).
 */
export default function BatchFileEditor({ serverName, onBack }) {
	useT();
	const toast = useToast();
	const [content, setContent] = React.useState("");
	const [original, setOriginal] = React.useState("");
	const [loading, setLoading] = React.useState(true);
	const [loadFailed, setLoadFailed] = React.useState(false);
	const [error, setError] = React.useState("");
	const [saving, setSaving] = React.useState(false);
	const [leaving, setLeaving] = React.useState(false);
	const [caret, setCaret] = React.useState({ line: 1, col: 1 });
	const eol = React.useRef("\r\n");
	const textRef = React.useRef(null);
	const gutterRef = React.useRef(null);

	React.useEffect(() => {
		if (!serverName) return undefined;
		let alive = true;
		setLoading(true);
		setLoadFailed(false);
		setError("");
		// This endpoint returns the script as plain text rather than JSON, so
		// it's fetched directly instead of through the JSON helper.
		fetch(`/api/batch-files/by-server/${encodeURIComponent(serverName)}`, {
			credentials: "same-origin",
		})
			.then(async (res) => {
				if (!res.ok) {
					// The server explains itself in JSON; fall back to a general line.
					let reason = "";
					try {
						reason = JSON.parse(await res.text())?.error ?? "";
					} catch {
						// Not JSON: the general line will do.
					}
					throw new Error(reason || t("batch.loadFailed"));
				}
				return res.text();
			})
			.then((text) => {
				if (!alive) return;
				eol.current = /\r\n/.test(text) || !/\n/.test(text) ? "\r\n" : "\n";
				const normal = text.replace(/\r\n/g, "\n");
				setContent(normal);
				setOriginal(normal);
			})
			.catch((err) => {
				if (!alive) return;
				setError(errorText(err));
				setLoadFailed(true);
				setContent("");
				setOriginal("");
			})
			.finally(() => alive && setLoading(false));
		return () => {
			alive = false;
		};
	}, [serverName]);

	const dirty = !loading && !loadFailed && content !== original;

	const save = React.useCallback(async () => {
		if (saving || !dirty) return;
		setSaving(true);
		setError("");
		try {
			await api.post(`/api/batch-files/by-server/${encodeURIComponent(serverName)}`, { content: content.replace(/\n/g, eol.current) });
			setOriginal(content);
			toast(t("batch.savedToast"));
		} catch (err) {
			setError(errorText(err));
			toast(errorText(err), "error");
		} finally {
			setSaving(false);
		}
	}, [saving, dirty, serverName, content, toast]);

	// Ctrl+S (or Cmd+S) saves instead of asking the browser to save the page.
	const saveRef = React.useRef(save);
	saveRef.current = save;
	React.useEffect(() => {
		const onKey = (e) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
				e.preventDefault();
				saveRef.current();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	// Closing or reloading the window with edits that were not saved.
	React.useEffect(() => {
		if (!dirty) return undefined;
		const warn = (e) => {
			e.preventDefault();
			e.returnValue = "";
		};
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [dirty]);

	const lines = React.useMemo(() => content.split("\n").length, [content]);
	const gutterChars = Math.max(2, String(lines).length);
	const numbers = React.useMemo(() => Array.from({ length: lines }, (_, i) => i + 1).join("\n"), [lines]);

	const syncScroll = () => {
		if (gutterRef.current && textRef.current) gutterRef.current.scrollTop = textRef.current.scrollTop;
	};
	const trackCaret = () => {
		const el = textRef.current;
		if (!el) return;
		const before = el.value.slice(0, el.selectionStart);
		const line = before.split("\n").length;
		setCaret({ line, col: before.length - before.lastIndexOf("\n") });
	};

	const goBack = () => (dirty ? setLeaving(true) : onBack());

	if (!serverName) {
		return (
			<EmptyState icon={<ScriptIcon />} title={t("batch.noServer")} action={<Button variant="outlined" onClick={onBack}>{t("common.backToDashboard")}</Button>}>
				{t("batch.noServerBody")}
			</EmptyState>
		);
	}

	return (
		<Box>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
				<Button size="small" startIcon={<ArrowBackIcon />} onClick={goBack}>
					{t("batch.backToConfig")}
				</Button>
				<Typography variant="h5" component="h1" sx={{ flex: { xs: "1 1 100%", sm: 1 }, minWidth: 0, overflowWrap: "anywhere", order: { xs: 2, sm: 0 } }}>
					{t("batch.editingFor", { name: serverName })}
				</Typography>
			</Box>

			<Alert severity="warning" sx={{ mb: 2 }}>
				{t("batch.warning")}
			</Alert>

			{error && (
				<Alert severity="error" sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}

			{loading ? (
				<Skeleton variant="rounded" height={380} sx={{ borderRadius: "12px" }} />
			) : loadFailed ? null : (
				<Box
					sx={{
						border: 1,
						borderColor: dirty ? "warning.main" : "divider",
						borderRadius: "12px",
						overflow: "hidden",
						bgcolor: "background.paper",
						transition: "border-color .2s",
					}}
				>
					{/* The title bar: what is being edited, whether it is saved, and the buttons. */}
					<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", px: 1.5, py: 1, borderBottom: 1, borderColor: "divider", bgcolor: (t) => t.custom.hover }}>
						<ScriptIcon fontSize="small" sx={{ color: "text.secondary" }} />
						<Typography variant="body2" sx={{ fontFamily: (t) => t.custom.mono, fontWeight: 600 }}>
							{t("server.startScript")}
						</Typography>
						{dirty ? <Chip size="small" color="warning" label={t("batch.unsaved")} /> : <Chip size="small" variant="outlined" label={t("batch.savedChip")} />}
						<Box sx={{ flex: 1 }} />
						{dirty && (
							<Button size="small" startIcon={<RevertIcon />} onClick={() => setContent(original)} disabled={saving}>
								{t("batch.revert")}
							</Button>
						)}
						<Tooltip title="Ctrl+S">
							<span>
								<Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={!dirty || saving} sx={flatWhenDisabled}>
									{saving ? t("batch.saving") : t("batch.saveChanges")}
								</Button>
							</span>
						</Tooltip>
					</Box>

					<Box sx={{ display: "flex", height: { xs: "58vh", md: "62vh" }, minHeight: 280, bgcolor: (t) => (t.palette.mode === "dark" ? alpha(t.palette.common.black, 0.28) : alpha(t.palette.text.primary, 0.025)) }}>
						<Box
							ref={gutterRef}
							aria-hidden
							sx={{
								flexShrink: 0,
								width: `calc(${gutterChars}ch + 20px)`,
								overflow: "hidden",
								// The text area has a scroll bar along its foot; this keeps the last number reachable.
								pb: "24px",
								pt: `${PAD}px`,
								pr: "10px",
								textAlign: "right",
								userSelect: "none",
								color: "text.disabled",
								borderRight: 1,
								borderColor: "divider",
								fontFamily: (t) => t.custom.mono,
								fontSize: 13,
								lineHeight: `${LINE_HEIGHT}px`,
								whiteSpace: "pre",
							}}
						>
							{numbers}
						</Box>
						<Box
							component="textarea"
							ref={textRef}
							value={content}
							onChange={(e) => setContent(e.target.value)}
							onScroll={syncScroll}
							onSelect={trackCaret}
							onKeyUp={trackCaret}
							onClick={trackCaret}
							spellCheck={false}
							autoCapitalize="off"
							autoCorrect="off"
							wrap="off"
							aria-label={t("batch.ariaFor", { name: serverName })}
							sx={{
								flex: 1,
								minWidth: 0,
								m: 0,
								p: `${PAD}px`,
								border: 0,
								outline: 0,
								resize: "none",
								bgcolor: "transparent",
								color: "text.primary",
								caretColor: (t) => t.palette.primary.main,
								fontFamily: (t) => t.custom.mono,
								fontSize: 13,
								lineHeight: `${LINE_HEIGHT}px`,
								tabSize: 4,
								whiteSpace: "pre",
								overflow: "auto",
								"&:focus-visible": { boxShadow: (t) => `inset 0 0 0 1px ${alpha(t.palette.primary.main, 0.55)}` },
							}}
						/>
					</Box>

					<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", px: 1.5, py: 0.75, borderTop: 1, borderColor: "divider", bgcolor: (t) => t.custom.hover, color: "text.secondary" }}>
						<Typography variant="caption" sx={{ fontFamily: (t) => t.custom.mono }}>
							{t("batch.stats", { lines: tn("batch.lines", lines, { count: formatNumber(lines) }), chars: formatNumber(content.length) })}
						</Typography>
						<Box sx={{ flex: 1 }} />
						<Typography variant="caption" sx={{ fontFamily: (t) => t.custom.mono }}>
							{t("batch.caret", { line: caret.line, col: caret.col })}
						</Typography>
					</Box>
				</Box>
			)}

			<ConfirmDialog
				open={leaving}
				title={t("batch.leaveTitle")}
				confirmLabel={t("batch.leaveConfirm")}
				onClose={() => setLeaving(false)}
				onConfirm={() => {
					setLeaving(false);
					onBack();
				}}
			>
				{t("batch.leaveBody")}
			</ConfirmDialog>
		</Box>
	);
}
