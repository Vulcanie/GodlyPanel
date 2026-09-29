import React, { useState, useEffect } from "react";
import { Box, Typography, TextField, Button, Paper, Alert, Snackbar } from "@mui/material";
import { api } from "../api/client";

export default function BatchFileEditor({ serverName, onBack }) {
	const [content, setContent] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		if (!serverName) return;

		setLoading(true);
		// This endpoint returns the script as plain text rather than JSON, so
		// it's fetched directly instead of through the JSON helper.
		fetch(`/api/batch-files/by-server/${encodeURIComponent(serverName)}`, {
			credentials: "same-origin",
		})
			.then((res) => {
				if (!res.ok) throw new Error("Failed to load the launch script.");
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

	const saveBatchFile = async () => {
		setError("");
		try {
			await api.post(
				`/api/batch-files/by-server/${encodeURIComponent(serverName)}`,
				{ content },
			);
			setSaved(true);
		} catch (err) {
			setError(err.message);
		}
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

			{error && (
				<Alert severity="error" sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}

			{loading ? (
				<Typography>Loading...</Typography>
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

			<Snackbar
				open={saved}
				autoHideDuration={3000}
				onClose={() => setSaved(false)}
				message="Launch script saved."
			/>
		</Paper>
	);
}
