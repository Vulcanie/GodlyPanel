import React from "react";
import {
	Alert,
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	Radio,
	RadioGroup,
	TextField,
	Typography,
} from "@mui/material";
import { api } from "../api/client";

/**
 * Remove a server: out of the panel only, or together with its files. Deleting
 * files is only offered for servers the panel created, and the person has to type
 * the server's name, since it can't be undone.
 */
function DeleteServer({ serverName, onDeleted }) {
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const [open, setOpen] = React.useState(false);
	const [plan, setPlan] = React.useState(null);
	const [choice, setChoice] = React.useState("panel");
	const [typed, setTyped] = React.useState("");
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState(null);

	const show = async () => {
		setOpen(true);
		setPlan(null);
		setChoice("panel");
		setTyped("");
		setError(null);
		try {
			setPlan(await api.get(`${base}/removal`));
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
			onDeleted?.();
		} catch (e) {
			setError(e.message);
			setBusy(false);
		}
	};

	const withFiles = choice === "everything";
	const ready = plan && !plan.running && typed === serverName && !busy;

	return (
		<Box sx={{ mt: 3, mb: 2, p: 2, border: "1px solid rgba(244,67,54,0.4)", borderRadius: 1 }}>
			<Typography variant="subtitle1" sx={{ color: "error.main" }}>
				Delete server
			</Typography>
			<Typography variant="body2" sx={{ color: "text.secondary", my: 1 }}>
				Remove this server from GodlyPanel, and optionally delete its files. The server must be stopped first.
			</Typography>
			<Button variant="outlined" color="error" size="small" onClick={show}>
				Delete this server...
			</Button>

			<Dialog open={open} onClose={() => !busy && setOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Delete {serverName}?</DialogTitle>
				<DialogContent>
					{!plan && !error && <Typography variant="body2">Checking...</Typography>}
					{plan?.running && (
						<Alert severity="warning" sx={{ mb: 2 }}>
							This server is running. Stop it first, then delete it.
						</Alert>
					)}

					{plan && (
						<RadioGroup value={choice} onChange={(e) => setChoice(e.target.value)}>
							<FormControlLabel
								value="panel"
								control={<Radio />}
								label={
									<Box sx={{ py: 0.5 }}>
										<Typography variant="body2">Remove from GodlyPanel only</Typography>
										<Typography variant="caption" sx={{ color: "text.secondary" }}>
											The server disappears from the dashboard. Its files stay on disk untouched, and nothing is lost.
										</Typography>
									</Box>
								}
							/>
							<FormControlLabel
								value="everything"
								disabled={!plan.canDeleteFiles}
								control={<Radio />}
								label={
									<Box sx={{ py: 0.5 }}>
										<Typography variant="body2">
											{plan.mode === "script" ? "Remove it and delete its start script" : "Delete everything, including its files"}
										</Typography>
										<Typography variant="caption" sx={{ color: plan.canDeleteFiles ? "error.main" : "text.secondary" }}>
											{plan.canDeleteFiles
												? plan.mode === "folder"
													? `Permanently deletes ${plan.target}, including the world and every save in it. This cannot be undone.`
													: `Deletes only ${plan.script}. ${plan.reason}`
												: plan.reason}
										</Typography>
									</Box>
								}
							/>
						</RadioGroup>
					)}

					{plan && (
						<TextField
							fullWidth
							size="small"
							sx={{ mt: 2 }}
							label={`Type "${serverName}" to confirm`}
							value={typed}
							onChange={(e) => setTyped(e.target.value)}
							autoComplete="off"
						/>
					)}
					{error && (
						<Alert severity="error" sx={{ mt: 2 }}>
							{error}
						</Alert>
					)}
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
