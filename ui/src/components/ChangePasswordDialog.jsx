import React from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import { api } from "../api/client";

/**
 * Change your own password. Asks for the current one first, so someone who finds a signed-in screen
 * unattended can't lock the owner out of their own account. Everyone can do this, whatever their role.
 * The panel gives this browser a fresh sign-in, so the person stays signed in here and is signed out elsewhere.
 */
function ChangePasswordDialog({ open, onClose }) {
	const [current, setCurrent] = React.useState("");
	const [next, setNext] = React.useState("");
	const [again, setAgain] = React.useState("");
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState(null);
	const [done, setDone] = React.useState(false);

	React.useEffect(() => {
		if (!open) return;
		setCurrent("");
		setNext("");
		setAgain("");
		setError(null);
		setDone(false);
		setBusy(false);
	}, [open]);

	const mismatch = again !== "" && next !== again;
	const ready = current !== "" && next.length >= 8 && next === again && !busy;

	const save = async () => {
		setBusy(true);
		setError(null);
		try {
			await api.post("/api/auth/change-password", { currentPassword: current, newPassword: next });
			setDone(true);
		} catch (e) {
			setError(e.message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
			<DialogTitle>Change your password</DialogTitle>
			<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
				{done ? (
					<Alert severity="success">Your password is changed. You stay signed in here; anywhere else you were signed in, you'll need the new one.</Alert>
				) : (
					<>
						{error && <Alert severity="error">{error}</Alert>}
						<TextField
							size="small"
							type="password"
							label="Current password"
							autoComplete="current-password"
							autoFocus
							value={current}
							onChange={(e) => setCurrent(e.target.value)}
						/>
						<TextField
							size="small"
							type="password"
							label="New password"
							autoComplete="new-password"
							value={next}
							onChange={(e) => setNext(e.target.value)}
							helperText="At least 8 characters. A few random words work well."
						/>
						<TextField
							size="small"
							type="password"
							label="New password again"
							autoComplete="new-password"
							value={again}
							onChange={(e) => setAgain(e.target.value)}
							error={mismatch}
							helperText={mismatch ? "These two don't match." : " "}
							onKeyDown={(e) => e.key === "Enter" && ready && save()}
						/>
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							Forgotten your current one? An administrator can set a new password for you under People.
						</Typography>
					</>
				)}
			</DialogContent>
			<DialogActions>
				{done ? (
					<Button variant="contained" onClick={onClose}>
						Done
					</Button>
				) : (
					<>
						<Button onClick={onClose} disabled={busy}>
							Cancel
						</Button>
						<Button variant="contained" onClick={save} disabled={!ready}>
							{busy ? "Changing…" : "Change password"}
						</Button>
					</>
				)}
			</DialogActions>
		</Dialog>
	);
}

export default ChangePasswordDialog;
