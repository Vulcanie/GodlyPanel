import React from "react";
import { Box, Button, TextField, Typography, Chip } from "@mui/material";
import { api } from "../api/client";
import InfoTip from "./InfoTip";
import { formatBytes } from "../utils/format";

/**
 * A folder path box that says, as you type, whether game servers can actually
 * live there — writable, which drive, how much space — instead of finding out
 * partway through a multi-gigabyte install.
 *
 * Blank means "use the default", which is inside the app's own folder.
 *
 * `info` is a help id: the (i) beside the box then explains the setting, and no hint is printed under it. Without it, the older
 * `helperText` (or a line saying what blank means) is shown, for the places that have no entry in the help yet.
 */
function FolderField({
	value,
	onChange,
	checkUrl,
	label = "Folder",
	blankMeans = "the default folder inside the app",
	helperText,
	info,
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
	const hint = info ? undefined : (helperText ?? `Blank uses ${blankMeans}.`);

	const pick = window.godlyPanel?.pickFolder;
	const browse = async () => {
		const chosen = await pick({ title: `Choose: ${label}`, defaultPath: value || undefined });
		if (chosen) onChange(chosen);
	};

	return (
		<Box>
			<Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
				<TextField
					fullWidth
					size="small"
					label={label}
					placeholder="Leave blank for the default"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					error={Boolean(blocked)}
					// A problem with the folder is a state, so it is printed; what the setting means is in the (i).
					helperText={blocked ? result.errors[0] : hint}
				/>
				{pick && (
					<Button size="small" variant="outlined" onClick={browse} sx={{ whiteSpace: "nowrap", flexShrink: 0, height: 40 }}>
						Browse…
					</Button>
				)}
				{info && <InfoTip id={info} sx={{ mt: 0.75 }} />}
			</Box>
			{result && (
				<Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
					<Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
						<Typography variant="caption" sx={{ color: "text.secondary", wordBreak: "break-all", fontFamily: (t) => t.custom.mono }}>
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
