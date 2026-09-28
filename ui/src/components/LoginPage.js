import React, { useState } from "react";
import { Button, TextField, Typography, Box, CircularProgress } from "@mui/material";

const API_BASE =
	process.env.REACT_APP_API_URL?.trim().replace(/\/+$/, "") || "";

export default function LoginPage({ onLogin }) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const joinUrl = (base, path) =>
		`${base}/${path}`.replace(/\/+/g, "/").replace(":/", "://");

	const handleLogin = async () => {
		setError("");
		setLoading(true);
		try {
			const res = await fetch(joinUrl(API_BASE, "/api/auth/login"), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"ngrok-skip-browser-warning": "true",
				},
				body: JSON.stringify({ username, password }),
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error || "Invalid username or password");
				return;
			}
			onLogin(data.role, data.token);
		} catch (err) {
			setError("Couldn't reach the server. Try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleKeyDown = (e) => {
		if (e.key === "Enter") handleLogin();
	};

	return (
		<Box sx={{ mt: 8, textAlign: "center" }}>
			<Typography variant="h4" gutterBottom>
				Server Dashboard Login
			</Typography>
			<TextField
				label="Username"
				value={username}
				onChange={(e) => setUsername(e.target.value)}
				onKeyDown={handleKeyDown}
				margin="normal"
			/>
			<br />
			<TextField
				label="Password"
				type="password"
				value={password}
				onChange={(e) => setPassword(e.target.value)}
				onKeyDown={handleKeyDown}
				margin="normal"
			/>
			<br />
			<Button
				variant="contained"
				onClick={handleLogin}
				disabled={loading}
				sx={{ mt: 2 }}
			>
				{loading ? <CircularProgress size={20} /> : "Login"}
			</Button>
			{error && (
				<Typography color="error" sx={{ mt: 2 }}>
					{error}
				</Typography>
			)}
		</Box>
	);
}
