import React from "react";
import { Box, Paper, Typography, TextField, Button, Alert } from "@mui/material";
import { useSession } from "../SessionContext";

// Shown once, on a brand-new install. The server only accepts this from the
// machine itself, so nobody on the network can claim the admin account first.
function SetupWizard() {
	const { completeSetup } = useSession();
	const [username, setUsername] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [confirm, setConfirm] = React.useState("");
	const [error, setError] = React.useState(null);
	const [busy, setBusy] = React.useState(false);

	const mismatch = confirm.length > 0 && password !== confirm;
	const tooShort = password.length > 0 && password.length < 8;
	const canSubmit =
		username.trim().length >= 3 && password.length >= 8 && password === confirm && !busy;

	const submit = async () => {
		if (!canSubmit) return;
		setBusy(true);
		setError(null);
		try {
			await completeSetup(username.trim(), password);
		} catch (e) {
			setError(e.message);
			setBusy(false);
		}
	};

	return (
		<Box sx={{ display: "flex", justifyContent: "center", mt: 8, px: 2 }}>
			<Paper sx={{ p: 4, maxWidth: 460, width: "100%" }}>
				<Typography variant="h5" gutterBottom>
					Welcome to GodlyPanel
				</Typography>
				<Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
					Create your administrator account. You'll use this to manage your
					servers, and you can invite others afterwards.
				</Typography>

				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}

				<TextField
					fullWidth
					label="Username"
					sx={{ mb: 2 }}
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					helperText="3-32 characters. Letters, numbers, dot, underscore or hyphen."
				/>
				<TextField
					fullWidth
					type="password"
					label="Password"
					sx={{ mb: 2 }}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					error={tooShort}
					helperText={tooShort ? "At least 8 characters." : " "}
				/>
				<TextField
					fullWidth
					type="password"
					label="Confirm password"
					sx={{ mb: 3 }}
					value={confirm}
					onChange={(e) => setConfirm(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && submit()}
					error={mismatch}
					helperText={mismatch ? "Passwords don't match." : " "}
				/>

				<Button fullWidth variant="contained" disabled={!canSubmit} onClick={submit}>
					{busy ? "Creating..." : "Create account"}
				</Button>
			</Paper>
		</Box>
	);
}

export default SetupWizard;
