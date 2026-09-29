import React from "react";
import { Box, Button, Typography, CircularProgress, Chip, Alert } from "@mui/material";
import { UploadFile as UploadFileIcon } from "@mui/icons-material";
import { api } from "../api/client";

// Uploads a CurseForge modpack export zip immediately on selection and shows
// back what was actually detected (MC version / modloader / mod count) —
// this is the "intuitiveness" the Minecraft template is built around: the
// admin confirms what the zip says, rather than re-typing it into a form.
function ModpackUploadField({ label, onUploaded }) {
	const inputRef = React.useRef(null);
	const [uploading, setUploading] = React.useState(false);
	const [error, setError] = React.useState(null);
	const [summary, setSummary] = React.useState(null);

	const handleFile = async (file) => {
		if (!file) return;
		setUploading(true);
		setError(null);
		setSummary(null);
		try {
			const formData = new FormData();
			formData.append("modpackZip", file);

			const data = await api.upload("/api/uploads/modpack", formData);
			setSummary(data);
			onUploaded(data);
		} catch (e) {
			setError(e.message);
			onUploaded(null);
		} finally {
			setUploading(false);
		}
	};

	return (
		<Box sx={{ my: 1 }}>
			<Typography variant="body2" sx={{ mb: 0.5 }}>
				{label}
			</Typography>
			<input
				ref={inputRef}
				type="file"
				accept=".zip"
				hidden
				onChange={(e) => handleFile(e.target.files?.[0])}
			/>
			<Button
				variant="outlined"
				startIcon={uploading ? <CircularProgress size={16} /> : <UploadFileIcon />}
				onClick={() => inputRef.current?.click()}
				disabled={uploading}
			>
				{uploading ? "Uploading..." : summary ? "Choose a different zip" : "Choose Modpack Zip"}
			</Button>

			{error && (
				<Alert severity="error" sx={{ mt: 1 }}>
					{error}
				</Alert>
			)}

			{summary && (
				<Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
					{summary.packName && <Chip size="small" label={summary.packName} />}
					<Chip size="small" label={`MC ${summary.mcVersion}`} />
					<Chip
						size="small"
						label={`${summary.modLoaderFamily} ${summary.modLoaderVersion}`}
					/>
					<Chip size="small" label={`${summary.modCount} mods`} />
					{summary.hasOverrides && <Chip size="small" label="Includes overrides" />}
				</Box>
			)}
		</Box>
	);
}

export default ModpackUploadField;
