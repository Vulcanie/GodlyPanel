import React from "react";
import { Box, Paper, Typography, TextField, Button, Alert, CircularProgress } from "@mui/material";
import { useSession } from "../SessionContext";

function LoginPage() {
	const { login } = useSession();
	const [username, setUsername] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [error, setError] = React.useState(null);
	const [busy, setBusy] = React.useState(false);

	const submit = async () => {
		if (!username || !password || busy) return;
		setBusy(true);
		setError(null);
		try {
			// No token handling here any more: the server sets an HttpOnly
			// session cookie, which the browser sends on its own.
			await login(username, password);
		} catch (e) {
			setError(e.message);
			setBusy(false);
		}
	};

	return (
		<Box sx={{ display: "flex", justifyContent: "center", mt: 10, px: 2 }}>
			<Paper sx={{ p: 4, maxWidth: 400, width: "100%" }}>
				<Typography variant="h5" align="center" gutterBottom>
					GodlyPanel
				</Typography>
				<Typography variant="body2" align="center" sx={{ color: "text.secondary", mb: 3 }}>
					Sign in to see your servers.
				</Typography>

				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}

				<TextField
					fullWidth
					label="Username"
					autoFocus
					sx={{ mb: 2 }}
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && submit()}
				/>
				<TextField
					fullWidth
					type="password"
					label="Password"
					sx={{ mb: 3 }}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && submit()}
				/>

				<Button fullWidth variant="contained" onClick={submit} disabled={busy}>
					{busy ? <CircularProgress size={22} /> : "Sign in"}
				</Button>
			</Paper>
		</Box>
	);
}

export default LoginPage;
