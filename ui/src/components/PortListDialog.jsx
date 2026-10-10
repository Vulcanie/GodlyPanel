import React from "react";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Tooltip, Typography } from "@mui/material";
import { api } from "../api/client";

/**
 * Every server and the ports it is using, for picking a free one or finding what is in the way. A port that another server also
 * claims is marked, with who. Ports a game keeps for itself next to its game port are shown dimmed: they aren't typed into
 * anything but they are taken. Administrators only.
 */
function PortListDialog({ open, onClose, highlight = null }) {
	const [data, setData] = React.useState(null);
	const [error, setError] = React.useState(null);

	React.useEffect(() => {
		if (!open) return;
		setData(null);
		setError(null);
		api.get("/api/ports").then(setData).catch((e) => setError(e.message));
	}, [open]);

	const clashes = (data?.servers ?? []).flatMap((s) => s.ports.filter((p) => p.sharedWith).map((p) => ({ server: s.name, ...p })));

	return (
		<Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
			<DialogTitle>Ports in use</DialogTitle>
			<DialogContent>
				{error && <Alert severity="error">{error}</Alert>}
				{!data && !error && <CircularProgress size={24} />}
				{data && (
					<Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
						{clashes.length > 0 && (
							<Alert severity="warning">
								{[...new Set(clashes.map((c) => c.port))].sort((a, b) => a - b).map((port) => {
									const who = [...new Set(clashes.filter((c) => c.port === port).flatMap((c) => [c.server, ...c.sharedWith]))];
									return <div key={port}>Port {port} is claimed by {who.join(" and ")}.</div>;
								})}
							</Alert>
						)}
						{data.servers.length === 0 && <Typography variant="body2">No servers yet.</Typography>}
						{data.servers.map((s) => (
							<Box
								key={s.name}
								sx={{
									border: "1px solid",
									borderColor: s.name === highlight ? "primary.main" : "divider",
									borderRadius: 1,
									p: 1.5,
								}}
							>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
									<Typography variant="subtitle2">{s.name}</Typography>
									<Typography variant="caption" sx={{ color: "text.secondary" }}>
										{s.game}
									</Typography>
									<Chip size="small" label={s.online ? "Running" : "Stopped"} color={s.online ? "success" : "default"} variant="outlined" />
									{s.name === highlight && <Chip size="small" label="This server" color="primary" />}
								</Box>
								<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
									{s.ports.length === 0 && (
										<Typography variant="caption" sx={{ color: "text.secondary" }}>
											No ports recorded (it is found by its program, not a port).
										</Typography>
									)}
									{s.ports.map((p) => (
										<Tooltip key={`${p.label}-${p.port}`} title={p.sharedWith ? `Also claimed by ${p.sharedWith.join(", ")}` : p.kind === "own" ? "" : "The game takes this one for itself; it isn't set anywhere"}>
											<Chip
												size="small"
												variant={p.kind === "own" ? "filled" : "outlined"}
												color={p.sharedWith ? "warning" : "default"}
												sx={p.kind === "own" ? undefined : { opacity: 0.75 }}
												label={`${p.label}: ${p.port}`}
											/>
										</Tooltip>
									))}
								</Box>
							</Box>
						))}
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							GodlyPanel itself uses {data.panelPort}.
							{data.reserved.length > 0 ? ` Reserved in Settings, never suggested: ${data.reserved.join(", ")}.` : ""} Only ports GodlyPanel knows about are
							listed; something else on this PC can still be using one.
						</Typography>
					</Box>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Close</Button>
			</DialogActions>
		</Dialog>
	);
}

export default PortListDialog;
