import React from "react";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Alert,
	Box,
	Button,
	CircularProgress,
	TextField,
	Typography,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { api } from "../api/client";
import PortsToOpen from "./PortsToOpen";
import { cardAccordionSx } from "./cardStyles";

const LABELS = {
	port: "Game port",
	queryPort: "Query port",
	rconPort: "RCON port",
	telnetPort: "Telnet port",
};

/**
 * Change a server's ports. Every change is checked as it's typed against the
 * server's own other ports, the ports its game takes for itself, every other
 * server, and the panel's own port, so a clash is shown before Save rather
 * than after a server that won't start.
 */
function PortsEditor({ serverName }) {
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const [info, setInfo] = React.useState(null);
	const [values, setValues] = React.useState({});
	const [check, setCheck] = React.useState(null);
	const [open, setOpen] = React.useState(false);
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState(null);
	const [saved, setSaved] = React.useState(null);
	const latest = React.useRef(0);

	const load = React.useCallback(async () => {
		try {
			const data = await api.get(`${base}/ports`);
			setInfo(data);
			setValues(Object.fromEntries(Object.entries(data.current).map(([k, v]) => [k, String(v)])));
			setCheck(null);
		} catch (e) {
			setError(e.message);
		}
	}, [base]);

	React.useEffect(() => {
		setInfo(null);
		setSaved(null);
		setError(null);
		load();
	}, [load]);

	const proposed = React.useMemo(() => {
		if (!info) return {};
		const out = {};
		for (const [key, current] of Object.entries(info.current)) {
			const text = values[key];
			if (text !== undefined && text !== "" && Number(text) !== current) out[key] = text;
			else if (text === "") out[key] = "";
		}
		return out;
	}, [info, values]);

	// Debounced live validation.
	React.useEffect(() => {
		if (!info || Object.keys(proposed).length === 0) {
			setCheck(null);
			return undefined;
		}
		const ticket = ++latest.current;
		const timer = setTimeout(async () => {
			try {
				const result = await api.post(`${base}/ports/check`, { ports: proposed });
				if (ticket === latest.current) setCheck(result);
			} catch {
				// The save will report it.
			}
		}, 350);
		return () => clearTimeout(timer);
	}, [base, info, proposed]);

	const save = async () => {
		setBusy(true);
		setError(null);
		setSaved(null);
		try {
			const result = await api.put(`${base}/ports`, { ports: proposed });
			setSaved(result);
			setInfo(result);
			setValues(Object.fromEntries(Object.entries(result.current).map(([k, v]) => [k, String(v)])));
			setCheck(null);
		} catch (e) {
			setError(e.message);
		} finally {
			setBusy(false);
		}
	};

	if (!info) {
		return error ? <Alert severity="error">{error}</Alert> : <CircularProgress size={20} />;
	}

	const changed = Object.keys(proposed).length > 0;
	const blocked = check && !check.ok;
	const shown = { ...info.current, ...Object.fromEntries(Object.entries(values).map(([k, v]) => [k, Number(v)])) };

	return (
		<Accordion expanded={open} onChange={(_, v) => setOpen(v)} disableGutters sx={cardAccordionSx}>
			<AccordionSummary expandIcon={<ExpandMoreIcon />}>
				<Typography variant="subtitle1">Ports</Typography>
			</AccordionSummary>
			<AccordionDetails>
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
					{info.running && (
						<Alert severity="warning">
							This server is running. Stop it before changing its ports — a running game keeps the ports it started with.
						</Alert>
					)}
					{!info.canEditFiles && (
						<Alert severity="info">
							This server was imported, so changing a port here updates only what GodlyPanel checks. Its own start
							script and settings aren't rewritten; change the port there too.
						</Alert>
					)}
					{error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
						{Object.keys(info.current).map((key) => (
							<TextField
								key={key}
								size="small"
								type="number"
								label={LABELS[key]}
								disabled={info.running || busy}
								value={values[key] ?? ""}
								onChange={(e) => setValues({ ...values, [key]: e.target.value })}
								sx={{ width: 190 }}
								error={blocked && check.errors.some((m) => m.toLowerCase().includes(LABELS[key].toLowerCase()) || m.includes(String(proposed[key])))}
							/>
						))}
					</Box>

					<PortsToOpen
						game={shown.port}
						query={shown.queryPort}
						rcon={shown.rconPort}
						implicit={info.implicit}
						gameName={info.gameName}
						hideClash
					/>

					{check?.errors.map((message) => (
						<Alert key={message} severity="error">{message}</Alert>
					))}
					{check?.ok && check.warnings.map((message) => (
						<Alert key={message} severity="warning">{message}</Alert>
					))}
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						Checked against this server's other ports, the ports its game uses for itself, every other server,
						and the panel's own port ({info.panelPort}).
					</Typography>

					{saved && (
						<Alert severity="success" onClose={() => setSaved(null)}>
							Ports saved. {saved.filesChanged?.length > 0 ? `Updated ${saved.filesChanged.length} file(s), with a .bak of each. ` : ""}
							{saved.warnings?.map((w) => (
								<div key={w}>{w}</div>
							))}
						</Alert>
					)}

					<Box sx={{ display: "flex", gap: 1 }}>
						<Button variant="contained" size="small" disabled={!changed || blocked || busy || info.running} onClick={save}>
							{busy ? "Saving..." : "Save ports"}
						</Button>
						<Button size="small" disabled={!changed || busy} onClick={() => setValues(Object.fromEntries(Object.entries(info.current).map(([k, v]) => [k, String(v)])))}>
							Reset
						</Button>
					</Box>
				</Box>
			</AccordionDetails>
		</Accordion>
	);
}

export default PortsEditor;
