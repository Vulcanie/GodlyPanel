import React from "react";
import { Box, TextField, Typography, Chip } from "@mui/material";
import { api } from "../api/client";

export function formatBytes(bytes) {
	if (bytes == null) return "unknown";
	if (!bytes) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * A folder path box that says, as you type, whether game servers can actually
 * live there — writable, which drive, how much space — instead of finding out
 * partway through a multi-gigabyte install.
 *
 * Blank means "use the default", which is inside the app's own folder.
 */
function FolderField({
	value,
	onChange,
	checkUrl,
	label = "Folder",
	blankMeans = "the default folder inside the app",
	helperText,
	onCheck,
	checkBody,
}) {
	const [result, setResult] = React.useState(null);
	const latest = React.useRef(0);

	React.useEffect(() => {
		const ticket = ++latest.current;
		const timer = setTimeout(async () => {
			try {
				const res = await api.post(checkUrl, { path: value, ...checkBody });
				if (ticket !== latest.current) return; // A newer keystroke won.
				setResult(res);
				onCheck?.(res);
			} catch {
				if (ticket === latest.current) setResult(null);
			}
		}, 350);
		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value, checkUrl]);

	const blocked = result && !result.ok;

	return (
		<Box>
			<TextField
				fullWidth
				size="small"
				label={label}
				placeholder="Leave blank for the default"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				error={Boolean(blocked)}
				helperText={
					blocked
						? result.errors[0]
						: (helperText ?? `Blank uses ${blankMeans}.`)
				}
			/>
			{result && (
				<Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
					<Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
						<Typography variant="caption" sx={{ color: "text.secondary", wordBreak: "break-all" }}>
							{result.resolved}
						</Typography>
						{result.insideAppFolder && <Chip size="small" label="Inside the app folder" />}
						{!result.exists && result.ok && <Chip size="small" label="Will be created" />}
					</Box>
					{result.freeBytes != null && (
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							{formatBytes(result.freeBytes)} free on this drive
						</Typography>
					)}
					{result.warnings.map((w) => (
						<Typography key={w} variant="caption" sx={{ color: "warning.main" }}>
							{w}
						</Typography>
					))}
				</Box>
			)}
		</Box>
	);
}

export default FolderField;
