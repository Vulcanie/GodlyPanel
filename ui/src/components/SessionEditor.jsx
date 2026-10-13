import React from "react";
import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import { api } from "../api/client";

/**
 * The text a server shows as its "Session" on the dashboard and in Discord. Left blank it is automatic: the public address
 * (Settings → Network) and the game port, which follows the port by itself. Typing something replaces it. This is a label only; it
 * doesn't rename the server inside the game. Administrators only.
 */
function SessionEditor({ serverName, status }) {
	const automatic = status?.joinAddress ?? "";
	const fromStatus = status?.sessionLabel ?? "";
	// What was just saved, shown until the live status (which refreshes every few seconds) catches up.
	const [saved, setSaved] = React.useState(null);
	const stored = saved ?? fromStatus;
	const [draft, setDraft] = React.useState(stored);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState(null);

	React.useEffect(() => setSaved(null), [fromStatus]);
	// Follow the server's own value when it changes (another browser, or a save landing).
	React.useEffect(() => setDraft(stored), [stored]);

	const save = async (value) => {
		if (value.trim() === stored.trim()) return;
		setSaving(true);
		setError(null);
		try {
			const r = await api.put(`/api/server/${encodeURIComponent(serverName)}/session`, { sessionLabel: value });
			setSaved(r.sessionLabel ?? "");
		} catch (e) {
			setError(e.message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 1.5 }}>
			
			<TextField
				size="small"
				variant="standard"
				value={draft}
				placeholder={automatic ? `${automatic} (automatic)` : "automatic: set the public address under Settings → Network"}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={() => save(draft)}
				onKeyDown={(e) => e.key === "Enter" && save(draft)}
				disabled={saving}
				inputProps={{ "aria-label": "Session", maxLength: 100 }}
				helperText={stored ? "Shown on the dashboard and in Discord instead of the address." : "Shown on the dashboard and in Discord. A label only; it doesn't rename the server in the game."}
				sx={{ minWidth: 280 }}
			/>
			{stored && (
				<Button size="small" onClick={() => save("")} disabled={saving}>
					Use automatic{automatic ? ` (${automatic})` : ""}
				</Button>
			)}
			{error && (
				<Alert severity="warning" onClose={() => setError(null)} sx={{ py: 0 }}>
					{error}
				</Alert>
			)}
		</Box>
	);
}

export default SessionEditor;
