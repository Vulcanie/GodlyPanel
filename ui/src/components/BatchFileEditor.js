import React, { useState, useEffect } from "react";
import { Box, Typography, TextField, Button, Paper } from "@mui/material";

const API_BASE = process.env.REACT_APP_API_URL || "";

export default function BatchFileEditor({ serverName, onBack, authToken }) {
	const [content, setContent] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!serverName) return;

		setLoading(true);
		fetch(`${API_BASE}/api/batch-files/by-server/${serverName}`, {
			headers: {
				"ngrok-skip-browser-warning": "true",
				Accept: "application/json",
			},
		})
			.then((res) => {
				if (!res.ok) throw new Error("Failed to load batch file");
				return res.text();
			})
			.then((text) => {
				setContent(text);
				setError("");
			})
			.catch((err) => {
				setError(err.message);
				setContent("");
			})
			.finally(() => setLoading(false));
	}, [serverName]);

	const saveBatchFile = () => {
		fetch(`${API_BASE}/api/batch-files/by-server/${serverName}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"ngrok-skip-browser-warning": "true",
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify({ content }),
		})
			.then((res) => {
				if (!res.ok) throw new Error("Save failed");
				return res.text();
			})
			.then(() => alert("Saved!"))
			.catch((err) => alert(err.message));
	};

	if (!serverName) {
		return (
			<Paper sx={{ p: 3 }}>
				<Typography variant="h6" color="error">
					No server selected.
				</Typography>
				<Button variant="outlined" onClick={onBack} sx={{ mt: 2 }}>
					Back to Dashboard
				</Button>
			</Paper>
		);
	}

	return (
		<Paper sx={{ p: 3 }}>
			<Typography variant="h5" gutterBottom>
				Editing Batch File for: {serverName}
			</Typography>

			{loading ? (
				<Typography>Loading...</Typography>
			) : error ? (
				<Typography color="error">{error}</Typography>
			) : (
				<>
					<TextField
						value={content}
						onChange={(e) => setContent(e.target.value)}
						multiline
						minRows={15}
						fullWidth
						sx={{ mb: 2 }}
					/>
					<Box sx={{ display: "flex", gap: 2 }}>
						<Button variant="contained" onClick={saveBatchFile}>
							Save Changes
						</Button>
						<Button variant="outlined" onClick={onBack}>
							Back to Config
						</Button>
					</Box>
				</>
			)}
		</Paper>
	);
}
