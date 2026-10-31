import React from "react";
import { Alert, Box, Button, CircularProgress, TextField } from "@mui/material";
import { Lan as PortsIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { useToast } from "../ToastContext";
import PortsToOpen from "./PortsToOpen";
import PortListDialog from "./PortListDialog";
import SectionCard from "./ui/SectionCard";
import InfoTip from "./InfoTip";
import TipRow from "./TipRow";
import { t, useT, errorText } from "../i18n";

// What each port is called on its field. Anything else is shown by its key.
const labelFor = (key) => {
	if (key === "port") return t("ports.label.game");
	if (key === "queryPort") return t("ports.label.query");
	if (key === "rconPort") return t("ports.label.rcon");
	if (key === "telnetPort") return t("ports.label.telnet");
	return key;
};

// Each port has its own (i), since what a port is for is not obvious from its name.
const TIPS = {
	port: "server.ports.port",
	queryPort: "server.ports.query",
	rconPort: "server.ports.rcon",
	telnetPort: "server.ports.telnet",
};

/**
 * Change a server's ports. Every change is checked as it's typed against the
 * server's own other ports, the ports its game takes for itself, every other
 * server, and the panel's own port, so a clash is shown before Save rather
 * than after a server that won't start.
 */
function PortsEditor({ serverName }) {
	useT();
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const toast = useToast();
	const [info, setInfo] = React.useState(null);
	const [values, setValues] = React.useState({});
	const [check, setCheck] = React.useState(null);
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState(null);
	const [savedWarnings, setSavedWarnings] = React.useState([]);
	const [showList, setShowList] = React.useState(false);
	const latest = React.useRef(0);
	// A reply that arrives after the person has moved to another server must not be shown on that server's page.
	const current = React.useRef(base);
	current.current = base;

	const load = React.useCallback(async () => {
		try {
			const data = await api.get(`${base}/ports`);
			if (current.current !== base) return;
			setInfo(data);
			setValues(Object.fromEntries(Object.entries(data.current ?? {}).map(([k, v]) => [k, String(v)])));
			setCheck(null);
		} catch (e) {
			if (current.current === base) setError(errorText(e));
		}
	}, [base]);

	React.useEffect(() => {
		setInfo(null);
		setValues({});
		setCheck(null);
		setSavedWarnings([]);
		setError(null);
		load();
	}, [load]);

	const proposed = React.useMemo(() => {
		if (!info) return {};
		const out = {};
		for (const [key, now] of Object.entries(info.current)) {
			const text = values[key];
			if (text !== undefined && text !== "" && Number(text) !== now) out[key] = text;
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
		setSavedWarnings([]);
		try {
			const result = await api.put(`${base}/ports`, { ports: proposed });
			toast(result.filesChanged?.length > 0 ? t("ports.savedFiles", { count: result.filesChanged.length }) : t("ports.saved"));
			setSavedWarnings(result.warnings ?? []);
			setInfo(result);
			setValues(Object.fromEntries(Object.entries(result.current).map(([k, v]) => [k, String(v)])));
			setCheck(null);
		} catch (e) {
			setError(errorText(e));
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
		<SectionCard
			title={
				<>
					{t("ports.title")}
					<InfoTip id="server.ports" />
				</>
			}
			icon={<PortsIcon />}
		>
			<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
				{info.running && (
					<Alert severity="warning">
						{t("ports.running")}
					</Alert>
				)}
				{!info.canEditFiles && (
					<Alert severity="info">
						{t("ports.imported")}
					</Alert>
				)}
				{error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
					{Object.keys(info.current).map((key) => (
						<TipRow key={key} id={TIPS[key]}>
							<TextField
								size="small"
								type="number"
								label={labelFor(key)}
								disabled={info.running || busy}
								value={values[key] ?? ""}
								onChange={(e) => setValues({ ...values, [key]: e.target.value })}
								sx={{ width: 190, maxWidth: "100%" }}
								error={blocked && (check.errors ?? []).some((m) => m.toLowerCase().includes(labelFor(key).toLowerCase()) || m.includes(String(proposed[key])))}
							/>
						</TipRow>
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

				{(check?.errors ?? []).map((message) => (
					<Alert key={message} severity="error">{message}</Alert>
				))}
				{check?.ok && (check.warnings ?? []).map((message) => (
					<Alert key={message} severity="warning">{message}</Alert>
				))}
				{savedWarnings.map((message) => (
					<Alert key={message} severity="warning" onClose={() => setSavedWarnings((w) => w.filter((x) => x !== message))}>{message}</Alert>
				))}

				<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
					<Button variant="contained" size="small" disabled={!changed || blocked || busy || info.running} onClick={save}>
						{busy ? t("ports.saving") : t("ports.save")}
					</Button>
					<Button size="small" onClick={() => setShowList(true)}>
						{t("ports.showList")}
					</Button>
					<Button size="small" disabled={!changed || busy} onClick={() => setValues(Object.fromEntries(Object.entries(info.current).map(([k, v]) => [k, String(v)])))}>
						{t("ports.reset")}
					</Button>
				</Box>
			</Box>
			<PortListDialog open={showList} onClose={() => setShowList(false)} highlight={serverName} />
		</SectionCard>
	);
}

export default PortsEditor;
