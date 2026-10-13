import React from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from "@mui/material";
import { api } from "../api/client";
import { useToast } from "../ToastContext";
import TipRow from "./TipRow";

/**
 * Remove a server: out of the panel only, or together with its files. Deleting
 * files is only offered for servers the panel created, and the person has to type
 * the server's name, since it can't be undone. Drawn inside a card the page provides.
 */
function DeleteServer({ serverName, onDeleted }) {
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const toast = useToast();
	const [open, setOpen] = React.useState(false);
	const [plan, setPlan] = React.useState(null);
	const [choice, setChoice] = React.useState("panel");
	const [typed, setTyped] = React.useState("");
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState(null);

	// Another server's page must not open with this one's dialog, or its plan.
	React.useEffect(() => {
		setOpen(false);
		setPlan(null);
		setBusy(false);
	}, [serverName]);

	const show = async () => {
		setOpen(true);
		setPlan(null);
		setChoice("panel");
		setTyped("");
		setError(null);
		try {
			const found = await api.get(`${base}/removal`);
			setPlan(found);
		} catch (e) {
			setError(e.message);
		}
	};

	const confirm = async () => {
		setBusy(true);
		setError(null);
		try {
			await api.del(base, { confirmName: typed, deleteFiles: choice === "everything" });
			setOpen(false);
			toast(choice === "everything" ? `${serverName} and its files were deleted.` : `${serverName} was removed from GodlyPanel.`);
			onDeleted?.();
		} catch (e) {
			setError(e.message);
			setBusy(false);
		}
	};

	const withFiles = choice === "everything";
	const ready = plan && !plan.running && typed === serverName && !busy;

	return (
		<Box>
			<TipRow id="server.delete.mode">
				<Button variant="outlined" color="error" size="small" onClick={show}>
					Delete this server...
				</Button>
			</TipRow>

			<Dialog open={open} onClose={() => !busy && setOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Delete {serverName}?</DialogTitle>
				<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
					{!plan && !error && <Typography variant="body2">Checking...</Typography>}
					{plan?.running && <Alert severity="warning">This server is running. Stop it first, then delete it.</Alert>}

					{plan && (
						<TipRow id="server.delete.mode">
							<TextField select fullWidth size="small" label="What to do" value={choice} onChange={(e) => setChoice(e.target.value)}>
								<MenuItem value="panel">Remove from GodlyPanel only</MenuItem>
								<MenuItem value="everything" disabled={!plan.canDeleteFiles}>
									{plan.mode === "script" ? "Remove it and delete its start script" : "Delete everything, including its files"}
								</MenuItem>
							</TextField>
						</TipRow>
					)}
					{plan && !plan.canDeleteFiles && plan.reason && (
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							{plan.reason}
						</Typography>
					)}
					{plan && withFiles && plan.canDeleteFiles && (
						<Alert severity="error">
							{plan.mode === "folder" ? `Permanently deletes ${plan.target}, including the world and every save in it. This cannot be undone.` : `Deletes only ${plan.script}. ${plan.reason ?? ""}`}
						</Alert>
					)}

					{plan && (
						<TextField fullWidth size="small" label={`Type "${serverName}" to confirm`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
					)}
					{error && <Alert severity="error">{error}</Alert>}
				</DialogContent>
				<DialogActions>
					<Button disabled={busy} onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button color="error" variant="contained" disabled={!ready} onClick={confirm}>
						{busy ? "Deleting..." : withFiles ? "Delete server and files" : "Remove server"}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}

export default DeleteServer;
