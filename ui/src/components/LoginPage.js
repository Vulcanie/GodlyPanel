import React from "react";
import { Box, Paper, Typography, TextField, Button, Alert, CircularProgress, Link } from "@mui/material";
import { useSession } from "../SessionContext";
import { api } from "../api/client";

function LoginPage() {
	const { login, join } = useSession();
	const [username, setUsername] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [code, setCode] = React.useState("");
	const [joining, setJoining] = React.useState(false);
	const [canJoin, setCanJoin] = React.useState(false);
	const [error, setError] = React.useState(null);
	const [busy, setBusy] = React.useState(false);

	// Whether the owner has a community code switched on. Nothing else about it is public.
	React.useEffect(() => {
		api.get("/api/auth/join").then((r) => setCanJoin(Boolean(r?.open))).catch(() => {});
	}, []);

	const submit = async () => {
		if (!username || !password || (joining && !code) || busy) return;
		setBusy(true);
		setError(null);
		try {
			// No token handling here any more: the server sets an HttpOnly
			// session cookie, which the browser sends on its own.
			if (joining) await join(code, username, password);
			else await login(username, password);
		} catch (e) {
			setError({ message: e.message, notice: e.code === "staff_not_allowed_here" });
			setBusy(false);
		}
	};

	const switchTo = (toJoin) => {
		setJoining(toJoin);
		setError(null);
		setPassword("");
	};

	return (
		<Box sx={{ display: "flex", justifyContent: "center", mt: 10, px: 2 }}>
			<Paper sx={{ p: 4, maxWidth: 400, width: "100%" }}>
				<Typography variant="h5" align="center" gutterBottom>
					GodlyPanel
				</Typography>
				<Typography variant="body2" align="center" sx={{ color: "text.secondary", mb: 3 }}>
					{joining ? "Make your own account with the community code you were given." : "Sign in to see your servers."}
				</Typography>

				{error && (
					// Not a mistake they made: the details are a notice, not an error.
					<Alert severity={error.notice ? "info" : "error"} sx={{ mb: 2 }}>
						{error.message}
					</Alert>
				)}

				{joining && (
					<TextField
						fullWidth
						label="Community code"
						autoFocus
						autoComplete="off"
						placeholder="ABCD-EFGH"
						sx={{ mb: 2 }}
						value={code}
						onChange={(e) => setCode(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && submit()}
					/>
				)}
				<TextField
					fullWidth
					label={joining ? "Choose a username" : "Username"}
					autoFocus={!joining}
					sx={{ mb: 2 }}
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && submit()}
					helperText={joining ? "3-32 letters, numbers, dots, dashes or underscores." : undefined}
				/>
				<TextField
					fullWidth
					type="password"
					label={joining ? "Choose a password" : "Password"}
					sx={{ mb: 3 }}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && submit()}
					helperText={joining ? "At least 8 characters." : undefined}
				/>

				<Button fullWidth variant="contained" onClick={submit} disabled={busy}>
					{busy ? <CircularProgress size={22} /> : joining ? "Create my account" : "Sign in"}
				</Button>

				<Typography variant="caption" align="center" sx={{ display: "block", mt: 2, color: "text.secondary" }}>
					Trouble signing in?{" "}
					<Link href="https://github.com/Vulcanie/GodlyPanel/blob/main/docs/WHAT_THE_MESSAGES_MEAN.md#signing-in" target="_blank" rel="noopener noreferrer">
						What the messages mean
					</Link>
				</Typography>

				{canJoin && (
					<Typography variant="body2" align="center" sx={{ mt: 2 }}>
						{joining ? (
							<Link component="button" type="button" onClick={() => switchTo(false)}>
								I already have an account
							</Link>
						) : (
							<Link component="button" type="button" onClick={() => switchTo(true)}>
								I have a community code
							</Link>
						)}
					</Typography>
				)}
			</Paper>
		</Box>
	);
}

export default LoginPage;
