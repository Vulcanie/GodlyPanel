import React from "react";
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, FormControlLabel, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { api } from "../api/client";

const STATUS = { ok: ["success", "Done"], warn: ["warning", "Worth doing"], todo: ["error", "Needs doing"], info: ["default", "Note"] };

/** Can people reach this server? The checklist, the addresses to share, and Windows Firewall. */
function NetworkPanel({ serverName, canChangeFirewall }) {
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const [net, setNet] = React.useState(null);
	const [list, setList] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [message, setMessage] = React.useState(null);
	const [busy, setBusy] = React.useState(false);
	const [publicToo, setPublicToo] = React.useState(false);

	const load = React.useCallback(
		async (refresh = false) => {
			try {
				const [n, c] = await Promise.all([api.get(`${base}/network${refresh ? "?refresh=1" : ""}`), api.get(`${base}/checklist?firewall=0`)]);
				setNet(n);
				setList(c);
				setError(null);
			} catch (e) {
				setError(e.message);
			}
		},
		[base],
	);
	React.useEffect(() => {
		load();
	}, [load]);

	const open = async () => {
		setBusy(true);
		setError(null);
		setMessage("Windows will ask for permission on this PC. Approve it there.");
		try {
			const r = await api.post(`${base}/network/firewall-rule`, { publicNetworks: publicToo });
			setMessage(r.changed ? "Windows Firewall now lets those ports in." : r.message);
			await load(true);
		} catch (e) {
			setMessage(null);
			setError(e.message);
		} finally {
			setBusy(false);
		}
	};

	if (!net || !list) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress size={24} />;
	const fw = net.firewall;
	const missing = fw.readable ? fw.ports.filter((p) => !p.open) : [];

	return (
		<Box>
			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}
			{message && (
				<Alert severity="info" onClose={() => setMessage(null)} sx={{ mb: 2 }}>
					{message}
				</Alert>
			)}

			<Paper sx={{ p: 2, mb: 2 }}>
				<Typography variant="subtitle1" sx={{ mb: 1 }}>
					Checklist
				</Typography>
				{list.items.map((i) => (
					<Box key={i.id} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", py: 0.6 }}>
						<Chip size="small" color={STATUS[i.status]?.[0]} variant={i.status === "ok" ? "filled" : "outlined"} label={STATUS[i.status]?.[1]} sx={{ minWidth: 92 }} />
						<Box>
							<Typography variant="body2">{i.title}</Typography>
							{i.detail && (
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									{i.detail}
								</Typography>
							)}
						</Box>
					</Box>
				))}
			</Paper>

			<Paper sx={{ p: 2, mb: 2 }}>
				<Typography variant="subtitle1" sx={{ mb: 1 }}>
					Joining from the same network
				</Typography>
				{net.lan.length === 0 ? (
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						This PC has no network address right now.
					</Typography>
				) : (
					net.lan.map((a) => (
						<Typography key={a.address} variant="body2" sx={{ fontFamily: "monospace" }}>
							{a.join}{" "}
							<Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
								({a.name})
							</Typography>
						</Typography>
					))
				)}
				<Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
					For friends outside your network, the same ports must also be forwarded on your router to this PC's address, and they join with your public IP address.
				</Typography>
			</Paper>

			<Paper sx={{ p: 2 }}>
				<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1 }}>
					<Typography variant="subtitle1">Ports players need</Typography>
					<Button size="small" onClick={() => load(true)}>
						Check again
					</Button>
				</Box>
				{fw.note && (
					<Alert severity="info" sx={{ mb: 1 }}>
						{fw.note}
					</Alert>
				)}
				{!fw.readable && (
					<Alert severity="info" sx={{ mb: 1 }}>
						{fw.error}
					</Alert>
				)}
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Port</TableCell>
							<TableCell>Used for</TableCell>
							<TableCell>Windows Firewall</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{fw.ports.map((p) => (
							<TableRow key={`${p.port}/${p.protocol}`}>
								<TableCell>
									{p.port}/{p.protocol}
								</TableCell>
								<TableCell>{p.label}</TableCell>
								<TableCell>{p.open === null ? "Unknown" : p.open ? <Chip size="small" color="success" label={`Allowed${p.networks ? ` (${p.networks})` : ""}`} /> : <Chip size="small" color="warning" label="No rule" />}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				{fw.readable && missing.length > 0 && canChangeFirewall && (
					<Box sx={{ mt: 2, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
						<Button variant="contained" disabled={busy} onClick={open}>
							Allow these ports in Windows Firewall
						</Button>
						<FormControlLabel control={<Checkbox checked={publicToo} onChange={(e) => setPublicToo(e.target.checked)} />} label="Also on public networks (less safe)" />
					</Box>
				)}
				<Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
					The panel can see Windows Firewall but not your router. Only you can open ports there: look for "Port forwarding" in its settings. A rule for the game's program also counts as allowed.
				</Typography>
			</Paper>
		</Box>
	);
}

export default NetworkPanel;
