import React from "react";
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, FormControlLabel, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { Checklist as ChecklistIcon, ContentCopy as CopyIcon, Router as RouterIcon, Wifi as WifiIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { copyToClipboard } from "../utils/clipboard";
import { useToast } from "../ToastContext";
import SectionCard from "./ui/SectionCard";
import InfoTip from "./InfoTip";
import TipRow from "./TipRow";
import { t, useT, errorText } from "../i18n";

// The colour of each checklist status. Its words are in statusText.
const STATUS = { ok: "success", warn: "warning", todo: "error", info: "default" };
const statusText = (status) => {
	if (status === "ok") return t("network.statusDone");
	if (status === "warn") return t("network.statusWorth");
	if (status === "todo") return t("network.statusNeeds");
	if (status === "info") return t("network.statusNote");
	return undefined;
};

/** Can people reach this server? The checklist, the addresses to share, and Windows Firewall. */
function NetworkPanel({ serverName, canChangeFirewall }) {
	useT();
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const toast = useToast();
	const [net, setNet] = React.useState(null);
	const [list, setList] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [busy, setBusy] = React.useState(false);
	const [publicToo, setPublicToo] = React.useState(false);
	// A reply that arrives after the person has moved to another server must not be shown on that server's page.
	const current = React.useRef(base);
	current.current = base;

	const load = React.useCallback(
		async (refresh = false) => {
			try {
				const [n, c] = await Promise.all([api.get(`${base}/network${refresh ? "?refresh=1" : ""}`), api.get(`${base}/checklist?firewall=0`)]);
				if (current.current !== base) return;
				setNet(n);
				setList(c);
				setError(null);
			} catch (e) {
				if (current.current === base) setError(errorText(e));
			}
		},
		[base],
	);
	React.useEffect(() => {
		setNet(null);
		setList(null);
		setError(null);
		setBusy(false);
		load();
	}, [load]);

	const open = async () => {
		setBusy(true);
		setError(null);
		try {
			const r = await api.post(`${base}/network/firewall-rule`, { publicNetworks: publicToo });
			toast(r.changed ? t("network.nowAllowed") : (r.message ?? t("network.nothingToChange")), r.changed ? "success" : "info");
			await load(true);
		} catch (e) {
			setError(errorText(e));
		} finally {
			setBusy(false);
		}
	};

	const copy = (text) => copyToClipboard(text, (result) => toast(result === "Copied!" ? t("network.copied", { text }) : t("network.copyFailed"), result === "Copied!" ? "success" : "error"));

	if (!net || !list) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress size={24} />;
	const fw = net.firewall ?? { ports: [], readable: false };
	const ports = fw.ports ?? [];
	const lan = net.lan ?? [];
	const missing = fw.readable ? ports.filter((p) => !p.open) : [];

	return (
		<Box>
			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}
			{busy && (
				<Alert severity="info" sx={{ mb: 2 }}>
					{t("network.windowsAsk")}
				</Alert>
			)}

			<SectionCard
				title={
					<>
						{t("network.checklist")}
						<InfoTip id="server.network.checklist" />
					</>
				}
				icon={<ChecklistIcon />}
			>
				{(list.items ?? []).map((i) => (
					<Box key={i.id} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", py: 0.6 }}>
						<Chip size="small" color={STATUS[i.status]} variant={i.status === "ok" ? "filled" : "outlined"} label={statusText(i.status) ?? i.status} sx={{ minWidth: 92 }} />
						<Box sx={{ minWidth: 0 }}>
							<Typography variant="body2">{i.title}</Typography>
							{i.detail && (
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									{i.detail}
								</Typography>
							)}
						</Box>
					</Box>
				))}
			</SectionCard>

			<SectionCard
				title={
					<>
						{t("network.joining")}
						<InfoTip id="server.network.join" />
					</>
				}
				icon={<WifiIcon />}
			>
				{lan.length === 0 ? (
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{t("network.noAddress")}
					</Typography>
				) : (
					lan.map((a) => (
						<Box key={a.address} sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
							<Typography variant="body2" sx={{ fontFamily: (t) => t.custom.mono, wordBreak: "break-all" }}>
								{a.join}
							</Typography>
							<Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
								({a.name})
							</Typography>
							<Tooltip title={t("network.copyTip")}>
								<IconButton size="small" aria-label={t("network.copyAria", { address: a.join })} onClick={() => copy(a.join)}>
									<CopyIcon sx={{ fontSize: 16 }} />
								</IconButton>
							</Tooltip>
						</Box>
					))
				)}
			</SectionCard>

			<SectionCard
				title={
					<>
						{t("network.portsPlayers")}
						<InfoTip id="server.network.firewall" />
					</>
				}
				icon={<RouterIcon />}
				actions={
					<Button size="small" onClick={() => load(true)}>
						{t("network.checkAgain")}
					</Button>
				}
			>
				{fw.note && (
					<Alert severity="info" sx={{ mb: 1 }}>
						{fw.note}
					</Alert>
				)}
				{!fw.readable && fw.error && (
					<Alert severity="info" sx={{ mb: 1 }}>
						{fw.error}
					</Alert>
				)}
				<Box sx={{ overflowX: "auto" }}>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>{t("network.colPort")}</TableCell>
								<TableCell>{t("network.colUsed")}</TableCell>
								<TableCell>{t("network.colFirewall")}</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{ports.map((p) => (
								<TableRow key={`${p.port}/${p.protocol}`}>
									<TableCell>
										{p.port}/{p.protocol}
									</TableCell>
									<TableCell>{p.label}</TableCell>
									<TableCell>{p.open === null ? t("network.unknown") : p.open ? <Chip size="small" color="success" label={p.networks ? t("network.allowedOn", { networks: p.networks }) : t("network.allowed")} /> : <Chip size="small" color="warning" label={t("network.noRule")} />}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Box>
				{fw.readable && missing.length > 0 && canChangeFirewall && (
					<Box sx={{ mt: 2, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
						<Button variant="contained" disabled={busy} onClick={open}>
							{t("network.allowPorts")}
						</Button>
						<TipRow id="server.network.publicToo">
							<FormControlLabel control={<Checkbox checked={publicToo} onChange={(e) => setPublicToo(e.target.checked)} />} label={t("network.publicToo")} />
						</TipRow>
					</Box>
				)}
			</SectionCard>
		</Box>
	);
}

export default NetworkPanel;
